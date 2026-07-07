export interface IRawWorkbook {
  sourceFile: string;
  hash: string;
  sheets: IRawSheet[];
}

export interface IRawSheet {
  name: string;
  cells: Record<string, IRawCell>; // Key is Excel ref e.g., 'A1'
  mergedRegions: string[]; // e.g. ['A1:B2']
  hidden: boolean;
}

export interface IRawCell {
  ref: string;
  value: any;
  formula?: string;
  isBold?: boolean;
}

export interface IDocumentReader {
  read(filePath: string): Promise<IRawWorkbook>;
  supports(fileType: string): boolean;
}
