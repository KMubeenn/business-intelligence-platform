import { GoogleGenAI } from '@google/genai';
import { Logger } from '@nestjs/common';
import OpenAI from 'openai';

const logger = new Logger('AiGeneratorUtil');

export async function generateWithFallbacks(prompt: string, isJson: boolean = false): Promise<string> {
  const strategies = [
    {
      name: 'Custom (qwen3.5:9b)',
      execute: async (p: string) => {
        // Using a dummy API key since the endpoint doesn't require one
        const customAi = new OpenAI({ apiKey: 'dummy', baseURL: 'https://llm.axharkhan.me/v1' });
        const completion = await customAi.chat.completions.create({
          messages: [{ role: 'user', content: p }],
          model: 'qwen3.5:9b',
          temperature: 0.1,
          max_tokens: 16384
          // Explicitly omitting response_format as requested
        });
        console.log("customAi", customAi);
        console.log("completion", completion.choices[0].message.content);
        return completion.choices[0].message.content || '';
      }
    },
    {
      name: 'Google Gen AI (gemini-flash-latest)',
      execute: async (p: string) => {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: p,
          config: isJson ? { temperature: 0.1, responseMimeType: 'application/json' } : { temperature: 0.1 }
        });
        return response.text || '';
      }
    },
    {
      name: 'Groq (llama-3.3-70b-versatile)',
      execute: async (p: string) => {
        if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
        const groq = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: p }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          response_format: isJson ? { type: 'json_object' } : undefined
        });
        return completion.choices[0].message.content || '';
      }
    },
    {
      name: 'OpenRouter (meta-llama/llama-3.3-70b-instruct:free)',
      execute: async (p: string) => {
        if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not configured');
        const openrouter = new OpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: { "HTTP-Referer": "http://localhost:3000", "X-Title": "SaaS Foundation BI" }
        });
        const completion = await openrouter.chat.completions.create({
          messages: [{ role: 'user', content: p }],
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          temperature: 0.1,
          response_format: isJson ? { type: 'json_object' } : undefined
        });
        return completion.choices[0].message.content || '';
      }
    }
  ];

  let lastErr: any;
  for (const strategy of strategies) {
    try {
      logger.log(`Attempting generation with ${strategy.name}...`);
      const text = await strategy.execute(prompt);
      if (text && text.trim().length > 0) return text;
    } catch (err: any) {
      logger.warn(`Strategy ${strategy.name} failed (${err.status || err.message}). Falling back...`);
      lastErr = err;
    }
  }

  throw new Error(`All fallback AI strategies failed. Last error: ${lastErr?.message}`);
}
