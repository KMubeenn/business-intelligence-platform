import { Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { IDocumentReader, IRawWorkbook, IRawSheet, IRawCell } from '../../interfaces/document-reader.interface';
import { IngestionCacheService } from '../../cache/ingestion-cache.service';
import * as fs from 'fs';

@Injectable()
export class ExcelReader implements IDocumentReader {
  constructor(private readonly cacheService: IngestionCacheService) {}

  supports(fileType: string): boolean {
    return ['xlsx', 'xls', 'csv'].includes(fileType.toLowerCase());
  }

  async read(filePath: string): Promise<IRawWorkbook> {
    const buffer = await fs.promises.readFile(filePath);
    const hash = this.cacheService.generateHash(buffer);
    
    const workbook = xlsx.read(buffer, { type: 'buffer', cellStyles: true });
    
    const rawSheets: IRawSheet[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const mergedRegions: string[] = [];
      if (sheet['!merges']) {
        sheet['!merges'].forEach(m => {
          const startRef = xlsx.utils.encode_cell(m.s);
          const endRef = xlsx.utils.encode_cell(m.e);
          mergedRegions.push(`${startRef}:${endRef}`);
        });
      }

      const cells: Record<string, IRawCell> = {};
      const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1:A1');
      
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = {c:C, r:R};
          const cellRef = xlsx.utils.encode_cell(cellAddress);
          const cell = sheet[cellRef];
          
          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
             cells[cellRef] = {
               ref: cellRef,
               value: cell.w || cell.v, // formatted value or raw value
               formula: cell.f,
               isBold: cell.s?.font?.bold || false,
             };
          }
        }
      }

      rawSheets.push({
        name: sheetName,
        hidden: workbook.Workbook?.Sheets?.find(s => s.name === sheetName)?.Hidden === 1,
        mergedRegions,
        cells
      });
    }

    return {
      sourceFile: filePath,
      hash,
      sheets: rawSheets
    };
  }
}
