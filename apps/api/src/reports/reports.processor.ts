import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import * as puppeteer from 'puppeteer';
import * as nodemailer from 'nodemailer';
import { Injectable, Logger } from '@nestjs/common';

@Processor('report-generation')
@Injectable()
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);
  private ai: GoogleGenAI;

  constructor(private readonly prisma: PrismaService) {
    super();
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { executionId, configId, organizationId } = job.data;

    this.logger.log(`Processing report execution ${executionId}`);

    try {
      // 1. Fetch Config
      const config = await this.prisma.reportConfig.findUnique({
        where: { id: configId },
      });

      if (!config) throw new Error('Report config not found');

      // 2. Fetch Data (Canonical Records for included models)
      let dataContext = '';
      if (config.includedModels && config.includedModels.length > 0) {
        const models = await this.prisma.canonicalModel.findMany({
          where: {
            organizationId,
            name: { in: config.includedModels }
          },
          include: {
            records: {
              where: { status: 'MAPPED' },
              take: 100
            }
          }
        });

        dataContext = models.map(m => {
          return `### Model: ${m.name}\n` + m.records.map(r => JSON.stringify(r.data)).join('\n');
        }).join('\n\n');
      }

      // 3. Call AI
      const prompt = `
You are a brilliant data analyst and report generator.
The user wants a report based on their business data.

USER QUERY:
${config.userQuery}

DATA CONTEXT (JSON records):
${dataContext}

Please generate a professional, insightful report. Output your response entirely in beautifully formatted HTML.
CRITICAL INSTRUCTIONS FOR PDF GENERATION:
1. Do NOT use a dark theme. Use a clean white background (#ffffff) with dark text (#111111) so it prints perfectly as a PDF.
2. Use standard fonts like 'Arial', 'Helvetica', or 'sans-serif'. Do not rely on external web fonts that might take too long to load.
3. Ensure all content is within a container that has a max-width and margin: auto.
4. Do NOT use markdown backticks (e.g., \`\`\`html) around your output. Output raw HTML only.
5. Make sure the HTML starts with <!DOCTYPE html> and contains full <html>, <head>, and <body> tags.
`;

      const strategies = [
        // {
        //   name: `Ollama Local (${process.env.OLLAMA_MODEL || 'qwen2.5'})`,
        //   execute: async (prompt: string) => {
        //     const baseURL = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1').replace('/v1', '');
        //     const modelName = process.env.OLLAMA_MODEL || 'qwen2.5';

        //     // Using native Ollama REST API instead of OpenAI SDK so we can force a massive context window
        //     const response = await fetch(`${baseURL}/api/chat`, {
        //       method: 'POST',
        //       headers: { 'Content-Type': 'application/json' },
        //       body: JSON.stringify({
        //         model: modelName,
        //         messages: [{ role: 'user', content: prompt }],
        //         stream: false,
        //         options: {
        //           num_ctx: 32768 // Force 32k context window for large 1000-record payloads
        //         }
        //       })
        //     });

        //     if (!response.ok) {
        //       throw new Error(`Ollama HTTP Error: ${response.status}`);
        //     }

        //     const json = await response.json();
        //     return json.message?.content || '';
        //   }
        // },
        {
          name: 'Google Gen AI (gemini-2.5-flash)',
          execute: async (prompt: string) => {
            const response = await this.ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            return response.text;
          }
        },
        {
          name: 'Groq (llama-3.3-70b-versatile)',
          execute: async (prompt: string) => {
            if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
            // Dynamically import OpenAI so it doesn't break if not installed at boot
            const { OpenAI } = require('openai');
            const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
            const completion = await groq.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model: 'llama-3.3-70b-versatile',
            });
            return completion.choices[0].message.content;
          }
        },
        {
          name: 'OpenRouter (meta-llama/llama-3.3-70b-instruct:free)',
          execute: async (prompt: string) => {
            if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
            const { OpenAI } = require('openai');
            const openrouter = new OpenAI({
              apiKey: process.env.OPENROUTER_API_KEY,
              baseURL: 'https://openrouter.ai/api/v1',
              defaultHeaders: {
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "SaaS Foundation BI"
              }
            });
            const completion = await openrouter.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model: 'meta-llama/llama-3.3-70b-instruct:free',
            });
            return completion.choices[0].message.content;
          }
        }
      ];

      let generatedText: string | null = null;
      let lastError: any = null;

      for (const strategy of strategies) {
        try {
          this.logger.log(`Attempting generation with strategy: ${strategy.name}`);
          generatedText = await strategy.execute(prompt);

          if (generatedText && generatedText.trim().length > 0) {
            this.logger.log(`Successfully generated report using ${strategy.name}`);
            break; // Success!
          } else {
            this.logger.warn(`Strategy ${strategy.name} failed: Returned an empty response.`);
          }
        } catch (err: any) {
          this.logger.warn(`Strategy ${strategy.name} failed: ${err.message}`);
          lastError = err;
        }
      }

      if (!generatedText) {
        throw new Error(`All AI fallback strategies failed. Last error: ${lastError?.message}`);
      }

      let htmlOutput = generatedText || '';
      const match = htmlOutput.match(/```(?:html)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        htmlOutput = match[1].trim();
      } else {
        htmlOutput = htmlOutput.trim();
      }

      // 4. Generate PDF using Puppeteer
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(htmlOutput, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      // 5. Send Email
      let transporter;
      if (process.env.SMTP_URL) {
        transporter = nodemailer.createTransport(process.env.SMTP_URL);
      } else {
        // Fallback to Ethereal for testing
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      }

      const info = await transporter.sendMail({
        from: '"SaaS Foundation BI" <reports@saasfoundation.app>',
        to: config.targetEmails.join(', '),
        subject: `Automated Report: ${config.name}`,
        text: `Please find attached the automated report: ${config.name}\n\nGenerated by SaaS Foundation BI`,
        attachments: [
          {
            filename: `${config.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            content: Buffer.from(pdfBuffer),
          }
        ]
      });

      let finalUrl = '';
      if (!process.env.SMTP_URL) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        this.logger.log(`Email Preview URL: ${previewUrl}`);
        finalUrl = previewUrl as string;
      }

      // 6. Update Execution Status
      await this.prisma.reportExecution.update({
        where: { id: executionId },
        data: {
          status: 'SUCCESS',
          pdfUrl: finalUrl || null,
        }
      });

    } catch (error: any) {
      this.logger.error(`Report execution failed: ${error.message}`, error.stack);

      const maxAttempts = job.opts.attempts || 1;
      // job.attemptsMade starts at 0 for the first attempt in BullMQ 1.x but typically it increments before the process. Let's use it safely:
      if (job.attemptsMade < maxAttempts) {
        await this.prisma.reportExecution.update({
          where: { id: executionId },
          data: {
            status: 'PENDING',
            errorMessage: 'AI limits reached. Pausing and retrying soon...',
          }
        });
        throw error; // Let BullMQ retry
      }

      await this.prisma.reportExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        }
      });
    }
  }
}
