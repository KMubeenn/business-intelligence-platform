import { Injectable, Logger } from '@nestjs/common';
import { generateWithFallbacks } from '../../utils/ai-generator.util';
import { ISerializedLayout } from '../models/cell-layout.model';
import { IExtractionResult } from '../models/extraction-result.model';
import { CHUNKED_SPREADSHEET_UNDERSTANDING_PROMPT } from '../prompts/chunked-spreadsheet-understanding.prompt';

@Injectable()
export class AiExtractionService {
  private readonly logger = new Logger(AiExtractionService.name);

  async extract(layout: ISerializedLayout): Promise<IExtractionResult> {
    // 1. Pre-process cells into compact raw rows
    const rawRowsMap: Record<number, Record<string, any>> = {};
    
    layout.cells.forEach(cell => {
      const rowMatch = cell.ref.match(/\d+/);
      const colMatch = cell.ref.match(/[A-Z]+/);
      
      if (rowMatch && colMatch) {
        const rowIdx = parseInt(rowMatch[0], 10);
        const colRef = colMatch[0];
        
        if (!rawRowsMap[rowIdx]) rawRowsMap[rowIdx] = {};
        rawRowsMap[rowIdx][colRef] = cell.val;
      }
    });

    const sortedRowIndices = Object.keys(rawRowsMap).map(Number).sort((a, b) => a - b);
    const compactRows = sortedRowIndices.map(idx => ({ _row: idx, ...rawRowsMap[idx] }));

    // 2. Chunking configuration
    const CHUNK_SIZE = 100;
    const totalChunks = Math.ceil(compactRows.length / CHUNK_SIZE);
    
    this.logger.log(`Beginning Chunked AI Extraction: ${compactRows.length} rows across ${totalChunks} chunks.`);

    let finalResult: IExtractionResult | null = null;
    let previousContext = {};

    // 3. Process chunks sequentially
    for (let i = 0; i < totalChunks; i++) {
      const chunkIndex = i + 1;
      const chunkRows = compactRows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      
      let prompt = CHUNKED_SPREADSHEET_UNDERSTANDING_PROMPT
        .replace('{{CHUNK_INDEX}}', String(chunkIndex))
        .replace('{{TOTAL_CHUNKS}}', String(totalChunks));

      prompt += `\n\nPREVIOUS_CONTEXT:\n${JSON.stringify(previousContext)}`;
      prompt += `\n\nCHUNK ROWS (JSON):\n${JSON.stringify(chunkRows)}`;

      try {
        this.logger.log(`Sending Chunk ${chunkIndex}/${totalChunks} to AI...`);
        let text = await generateWithFallbacks(prompt, true);
        text = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
        
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          text = text.substring(firstBrace, lastBrace + 1);
        }

        const parsed = JSON.parse(text) as IExtractionResult;
        
        // Save schema from the first chunk
        if (chunkIndex === 1) {
          finalResult = {
            datasetName: parsed.datasetName || `Extracted ${layout.sheet}`,
            columns: parsed.columns || [],
            rows: [],
            confidence: parsed.confidence || 0.9,
          };
        }

        // Accumulate rows
        if (parsed.rows && Array.isArray(parsed.rows)) {
          finalResult!.rows.push(...parsed.rows);
        }

        // Update context for next chunk
        if (parsed.nextContext) {
          previousContext = parsed.nextContext;
        }

      } catch (error: any) {
        this.logger.error(`AI extraction failed on chunk ${chunkIndex}: ${error.message}`);
        if (chunkIndex === 1) {
          throw new Error(`Failed to parse first chunk via AI: ${error.message}`);
        } else {
          // If a subsequent chunk fails, we just break and return what we have to avoid full failure
          this.logger.warn('Returning partial results due to chunk failure.');
          break;
        }
      }
    }

    this.logger.log(`Chunked Extraction Complete. Extracted ${finalResult?.rows.length} rows.`);
    return finalResult!;
  }
}

