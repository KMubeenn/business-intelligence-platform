import { Injectable, Logger } from '@nestjs/common';
import { IExtractionResult } from '../models/extraction-result.model';
import { GoogleGenAI } from '@google/genai';
import { DATA_QUALITY_REVIEW_PROMPT } from '../prompts/data-quality-review.prompt';

@Injectable()
export class ValidationEngineService {
  private readonly logger = new Logger(ValidationEngineService.name);
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async validate(result: IExtractionResult): Promise<{ isValid: boolean; warnings: string[]; correctionsApplied: string[]; finalConfidence: number }> {
    const warnings: string[] = [];
    const correctionsApplied: string[] = [];
    let finalConfidence = result.confidence || 1.0;

    // 1. Rule-based checks
    const colNames = result.columns.map(c => c.name.toLowerCase());
    const uniqueCols = new Set(colNames);
    if (uniqueCols.size !== colNames.length) {
      warnings.push('Duplicate column names detected after normalization.');
      finalConfidence -= 0.2;
    }

    if (result.rows.length === 0) {
      warnings.push('No data rows found.');
      finalConfidence -= 0.5;
    }

    // 2. AI-based secondary verification
    // To save tokens and time, we can optionally just sample the first 20 rows
    const sample = {
      ...result,
      rows: result.rows.slice(0, 20)
    };

    const prompt = `${DATA_QUALITY_REVIEW_PROMPT}

DATASET JSON:
${JSON.stringify(sample)}`;

    try {
      this.logger.log('Running AI Quality Review...');
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.1 }
      });

      let text = response.text || '{}';
      text = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
      const qualityReview = JSON.parse(text);

      if (qualityReview.warnings && Array.isArray(qualityReview.warnings)) {
        warnings.push(...qualityReview.warnings);
      }
      if (qualityReview.confidenceScore) {
        finalConfidence = Math.min(finalConfidence, qualityReview.confidenceScore);
      }

    } catch (error: any) {
      this.logger.warn(`AI Quality Review failed to parse: ${error.message}`);
    }

    return {
      isValid: finalConfidence >= 0.90, // Strict threshold
      warnings,
      correctionsApplied,
      finalConfidence
    };
  }
}
