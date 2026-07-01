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
        include: { organization: true, template: true },
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
              take: 500
            }
          }
        });

        // 2a. Pre-Filtering step using AI
        for (const m of models) {
          let availableFields = 'Unknown';
          if (m.schemaJson) {
            try {
              const parsedSchema = typeof m.schemaJson === 'string' ? JSON.parse(m.schemaJson) : m.schemaJson;
              if (parsedSchema.properties) availableFields = Object.keys(parsedSchema.properties).join(', ');
            } catch (e) {}
          }
          
          const filterPrompt = `
You are a strict data filtering engine. 
User Query: "${config.userQuery}"
Available Fields: [${availableFields}]

Analyze the user query and extract any explicit numerical or logical filtering conditions.
Return ONLY a valid JSON array of filter objects. 
Format: [{"field": "fieldName", "operator": "<", "value": 50}]
Supported operators: ">", "<", ">=", "<=", "==", "!="
If no filters apply, return []. Do not include markdown formatting or backticks.
`;

          let parsedFilters: any[] = [];
          try {
            const filterResponse = await this.ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: filterPrompt,
            });
            let txt = filterResponse.text || '[]';
            txt = txt.replace(/```json/gi, '').replace(/```/g, '').trim();
            parsedFilters = JSON.parse(txt);
          } catch (e: any) {
            this.logger.warn(`Failed to parse AI filters: ${e.message}`);
          }

          // Apply filters in memory
          let filteredRecords = m.records;
          if (Array.isArray(parsedFilters) && parsedFilters.length > 0) {
            this.logger.log(`Applying filters: ${JSON.stringify(parsedFilters)}`);
            filteredRecords = filteredRecords.filter(r => {
              const data: any = r.data;
              for (const f of parsedFilters) {
                // Fuzzy match field if exact doesn't exist
                let val = data[f.field];
                if (val === undefined) {
                  const lowerSearch = f.field.toLowerCase();
                  for (const key of Object.keys(data)) {
                    if (key.toLowerCase().includes(lowerSearch) || lowerSearch.includes(key.toLowerCase())) {
                      val = data[key];
                      break;
                    }
                  }
                }
                
                let target = f.value;
                
                if (['<', '>', '<=', '>='].includes(f.operator)) {
                  val = Number(val);
                  target = Number(target);
                  if (isNaN(val) || isNaN(target)) return false; // Fail if it cannot be evaluated
                }

                switch (f.operator) {
                  case '<': if (!(val < target)) return false; break;
                  case '>': if (!(val > target)) return false; break;
                  case '<=': if (!(val <= target)) return false; break;
                  case '>=': if (!(val >= target)) return false; break;
                  case '==': if (!(val == target)) return false; break;
                  case '!=': if (!(val != target)) return false; break;
                }
              }
              return true;
            });
          }

          dataContext += `### Model: ${m.name}\n` + filteredRecords.map(r => JSON.stringify(r.data)).join('\n') + '\n\n';
        }
      }

      // 3. Call AI
      const prompt = `
You are a brilliant data analyst and report generator.
The user wants a report based on their business data.

USER QUERY:
${config.userQuery}

DATA CONTEXT (JSON records):
${dataContext}

Please generate a professional, insightful report based EXACTLY on the records provided above.
NOTE: The data provided has already been strictly pre-filtered mathematically according to the user's query. DO NOT apply any additional numerical filtering. Treat every record provided as matching the user's criteria.

Output your response entirely in beautifully formatted HTML.
CRITICAL INSTRUCTIONS FOR PDF GENERATION:
1. Output your response as an HTML fragment (e.g. <div>...</div>) containing your report content.
2. Do NOT output full <html>, <head>, or <body> tags. We will embed your output into our own branded template.
3. Do NOT use a dark theme. Keep styling clean and professional.
4. Do NOT use markdown backticks (e.g., \`\`\`html) around your output. Output raw HTML only.
5. START IMMEDIATELY with the data tables or paragraphs. ABSOLUTELY NO overall report title or <h1> heading at the top. The system template already provides the title.
6. ABSOLUTELY NO "Report generated on" or timestamp text.
7. NO CSS box-shadows or drop-shadows on any elements.
8. DO NOT use any inline styles (e.g. style="...") in your HTML tables or rows. Use clean, unstyled semantic HTML (<table>, <tr>, <th>, <td>). The system provides standard corporate styling.
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

      // Read branding theme
      let layout: any = {
        primaryColor: '#3b82f6',
        header: { logoUrl: '', logoPosition: 'left', titleText: config.name, titlePosition: 'right', showDate: true },
        footer: { disclaimerText: 'Confidential - Internal Use Only', disclaimerPosition: 'left', signatureText: 'Generated automatically', signaturePosition: 'right', showPageNumbers: false }
      };

      if (config.template && config.template.layoutConfig) {
        layout = config.template.layoutConfig as any;
      }

      const alignMap: any = {
        'left': 'flex-start',
        'center': 'center',
        'right': 'flex-end'
      };
      
      const textAlignMap: any = {
        'left': 'left',
        'center': 'center',
        'right': 'right'
      };

      const brandedHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --brand-color: ${layout.primaryColor};
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      background-color: #ffffff;
      color: #111111;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      display: flex;
      flex-direction: column;
      min-height: 1000px;
    }
    .report-header {
      position: relative;
      border-bottom: 3px solid var(--brand-color);
      padding-bottom: 15px;
      margin-bottom: 20px;
      min-height: 55px;
    }
    .report-logo {
      max-height: 50px;
      max-width: 200px;
      object-fit: contain;
    }
    .report-title {
      color: var(--brand-color);
      margin: 0;
      font-size: 24px;
    }
    .report-date {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .report-footer {
      margin-top: auto;
      padding-top: 40px;
      border-top: 1px solid #eee;
      position: relative;
      min-height: 100px;
    }
    .signature {
      font-style: italic;
      color: #444;
      border-top: 1px solid #111;
      padding-top: 5px;
      min-width: 200px;
      font-size: 14px;
    }
    .disclaimer {
      font-size: 10px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    /* Simple styling overrides for AI generated content */
    main {
      flex: 1;
    }
    main h1, main h2, main h3 {
      color: var(--brand-color);
    }
    main table {
      width: 100%;
      border-collapse: collapse !important;
      margin: 20px 0 !important;
      background-color: transparent !important;
    }
    main th {
      background-color: #f3f4f6 !important;
      color: #111 !important;
      border-bottom: 2px solid var(--brand-color) !important;
      padding: 10px !important;
      text-align: left !important;
      font-weight: 600 !important;
    }
    main td {
      padding: 10px !important;
      border-bottom: 1px solid #e5e7eb !important;
      background-color: transparent !important;
      color: #333 !important;
    }
    main tr {
      background-color: transparent !important;
    }
    
    .absolute-left { position: absolute; left: 0; top: 0; }
    .absolute-center { position: absolute; left: 50%; transform: translateX(-50%); top: 0; text-align: center; }
    .absolute-right { position: absolute; right: 0; top: 0; text-align: right; }
    
    .footer-left { position: absolute; left: 0; bottom: 0; }
    .footer-center { position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; text-align: center; }
    .footer-right { position: absolute; right: 0; bottom: 0; text-align: right; }
  </style>
</head>
<body>
  <div class="page-container">
    <header class="report-header">
      <div class="absolute-${layout.header.logoPosition}">
        ${layout.header.logoUrl ? `<img src="${layout.header.logoUrl}" class="report-logo" alt="Company Logo" />` : `<div style="font-size: 24px; font-weight: 800; color: #1f2937; letter-spacing: -0.5px; margin-top: -2px;">${config.organization?.name || 'Report'}</div>`}
      </div>
      <div class="absolute-${layout.header.titlePosition}">
        <h1 class="report-title">${layout.header.titleText || config.name}</h1>
        ${layout.header.showDate ? `<div class="report-date">${new Date().toLocaleDateString()}</div>` : ''}
      </div>
    </header>

    <main>
      ${htmlOutput}
    </main>

    <footer class="report-footer">
      <div class="footer-${layout.footer.signaturePosition}">
        <div class="signature">
          ${layout.footer.signatureText}
        </div>
      </div>
      <div class="footer-${layout.footer.disclaimerPosition}">
        <div class="disclaimer">
          ${layout.footer.disclaimerText}
        </div>
      </div>
    </footer>
  </div>
</body>
</html>
      `;

      // 4. Generate PDF using Puppeteer
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(brandedHtml, { waitUntil: 'domcontentloaded', timeout: 10000 });
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
