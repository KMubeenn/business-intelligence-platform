import { Injectable, Logger } from '@nestjs/common';
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
      
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
        }
      });

      let text = response.text || '{}';
      text = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
      
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
