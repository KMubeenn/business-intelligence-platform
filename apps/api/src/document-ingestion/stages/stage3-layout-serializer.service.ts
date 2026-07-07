import { Injectable } from '@nestjs/common';
import { ILogicalRegion, ISerializedLayout } from '../models/cell-layout.model';
import { IRawWorkbook } from '../interfaces/document-reader.interface';

@Injectable()
export class LayoutSerializerService {
  serialize(region: ILogicalRegion, workbook: IRawWorkbook): ISerializedLayout {
    const sheet = workbook.sheets.find(s => s.name === region.sheetName);
    const mergedRegions = sheet?.mergedRegions || [];

    return {
      sheet: region.sheetName,
      region: region.regionRef,
      cells: region.cells.map(cell => {
        const cellData: any = {
          ref: cell.ref,
          val: cell.value
        };
        
        if (cell.isBold) cellData.isBold = true;

        // Check if cell is part of a merged region
        // For simplicity we just attach the first matching merged region
        const merged = mergedRegions.find(m => {
          // crude check: this would ideally decode and check boundaries. 
          // Since we want to just pass it to AI, passing the merge string if this cell starts it is enough.
          const startRef = m.split(':')[0];
          return startRef === cell.ref;
        });

        if (merged) {
          cellData.merged = merged;
        }

        return cellData;
      })
    };
  }
}
