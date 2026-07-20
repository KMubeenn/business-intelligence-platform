import { Injectable, Logger } from '@nestjs/common';
import { generateWithFallbacks } from '../../utils/ai-generator.util';
import { GoogleGenAI } from '@google/genai';
import { ISerializedLayout } from '../models/cell-layout.model';
import { IExtractionResult } from '../models/extraction-result.model';
import { SPREADSHEET_UNDERSTANDING_PROMPT } from '../prompts/spreadsheet-understanding.prompt';

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async extract(layout: ISerializedLayout): Promise<IExtractionResult> {
    const prompt = `${SPREADSHEET_UNDERSTANDING_PROMPT}

LAYOUT JSON:
${JSON.stringify(layout)}`;

    try {
      this.logger.log(`Sending layout ${layout.sheet} to AI for extraction...`);
      
      let text = await generateWithFallbacks(prompt, true);
      text = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
      
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        text = text.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(text) as IExtractionResult;
      
      // Basic fallback initialization
      if (!parsed.columns) parsed.columns = [];
      if (!parsed.rows) parsed.rows = [];
      if (!parsed.datasetName) parsed.datasetName = `Extracted ${layout.sheet}`;
      if (!parsed.confidence) parsed.confidence = 0.5;

      return parsed;
    } catch (error: any) {
      this.logger.error(`AI extraction failed: ${error.message}`);
      throw new Error(`Failed to parse document structure via AI: ${error.message}`);
    }
  }
}
