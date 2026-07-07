import { Injectable } from '@nestjs/common';
import { IRawWorkbook } from '../interfaces/document-reader.interface';
import { ILogicalRegion } from '../models/cell-layout.model';
import * as xlsx from 'xlsx';

@Injectable()
export class DocumentAnalyzerService {
  analyze(workbook: IRawWorkbook): ILogicalRegion[] {
    const regions: ILogicalRegion[] = [];

    for (const sheet of workbook.sheets) {
      if (sheet.hidden) continue;

      const cells = Object.values(sheet.cells);
      if (cells.length === 0) continue;

      // Find bounding box
      let minR = Infinity, minC = Infinity;
      let maxR = -Infinity, maxC = -Infinity;

      for (const cell of cells) {
        const decoded = xlsx.utils.decode_cell(cell.ref);
        if (decoded.r < minR) minR = decoded.r;
        if (decoded.c < minC) minC = decoded.c;
        if (decoded.r > maxR) maxR = decoded.r;
        if (decoded.c > maxC) maxC = decoded.c;
      }

      if (minR !== Infinity) {
         const regionRef = `${xlsx.utils.encode_cell({r: minR, c: minC})}:${xlsx.utils.encode_cell({r: maxR, c: maxC})}`;
         regions.push({
           sheetName: sheet.name,
           regionRef,
           cells
         });
      }
    }

    return regions;
  }
}
