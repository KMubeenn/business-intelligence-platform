import { IRawCell } from '../interfaces/document-reader.interface';

export interface ILogicalRegion {
  sheetName: string;
  regionRef: string; // e.g., 'A1:G15'
  cells: IRawCell[];
}

export interface ISerializedLayout {
  sheet: string;
  region: string;
  cells: Array<{
    ref: string;
    val: any;
    merged?: string;
    isBold?: boolean;
  }>;
}
