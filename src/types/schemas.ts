import { z } from 'zod';

// RGB Color schema
const RGBColorSchema = z.object({
  red: z.number().min(0).max(1).optional(),
  green: z.number().min(0).max(1).optional(),
  blue: z.number().min(0).max(1).optional(),
});

// Common style schema
const StyleSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  fontSize: z.number().optional(),
  foregroundColor: RGBColorSchema.optional(),
  backgroundColor: RGBColorSchema.optional(),
  heading: z.enum(['NORMAL', 'HEADING_1', 'HEADING_2', 'HEADING_3']).optional(),
  fontFamily: z.object({
    family: z.string(),
    weight: z.number().optional(),
  }).optional(),
  alignment: z.enum(['START', 'CENTER', 'END', 'JUSTIFIED']).optional(),
  lineSpacing: z.number().optional(),
  spaceAbove: z.number().optional(),
  spaceBelow: z.number().optional(),
  indentStart: z.number().optional(),
  indentEnd: z.number().optional(),
  indentFirstLine: z.number().optional(),
  direction: z.enum(['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT']).optional(),
  keepLinesTogether: z.boolean().optional(),
  keepWithNext: z.boolean().optional(),
  pageBreakBefore: z.boolean().optional(),
});

// Cover page schema
const CoverPageSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  date: z.string().optional(),
});

// Headers schema
const HeadersSchema = z.object({
  default: z.string().optional(),
  firstPage: z.string().optional(),
});

// Document content section schema
const DocumentSectionSchema = z.object({
  text: z.string(),
  style: StyleSchema.optional(),
});

// Document content schema
const DocumentContentSchema = z.object({
  requests: z.array(z.any()), // Allow any request type from Google Docs API
});

// Tool input schemas
const SearchInputSchema = z.object({
  query: z.string(),
  page_size: z.number().default(10),
});

const CreateDocInputSchema = z.object({
  title: z.string(),
});

const GetDocContentInputSchema = z.object({
  document_id: z.string(),
});

const UpdateDocContentInputSchema = z.object({
  document_id: z.string(),
  requests: z.array(z.any()), // Allow any request type from Google Docs API
});

// Sheets Color Schema
const SheetsColorSchema = z.object({
  red: z.number().min(0).max(1),
  green: z.number().min(0).max(1),
  blue: z.number().min(0).max(1),
  alpha: z.number().min(0).max(1).optional(),
});

// Cell Format Schema
const CellFormatSchema = z.object({
  backgroundColor: SheetsColorSchema.optional(),
  textFormat: z.object({
    foregroundColor: SheetsColorSchema.optional(),
    fontFamily: z.string().optional(),
    fontSize: z.number().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    underline: z.boolean().optional(),
  }).optional(),
  horizontalAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional(),
  verticalAlignment: z.enum(['TOP', 'MIDDLE', 'BOTTOM']).optional(),
  borders: z.object({
    top: z.object({ style: z.enum(['SOLID', 'DOTTED', 'DASHED']), color: SheetsColorSchema }).optional(),
    bottom: z.object({ style: z.enum(['SOLID', 'DOTTED', 'DASHED']), color: SheetsColorSchema }).optional(),
    left: z.object({ style: z.enum(['SOLID', 'DOTTED', 'DASHED']), color: SheetsColorSchema }).optional(),
    right: z.object({ style: z.enum(['SOLID', 'DOTTED', 'DASHED']), color: SheetsColorSchema }).optional(),
  }).optional(),
  numberFormat: z.object({
    type: z.enum(['TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'TIME', 'DATETIME', 'PERCENTAGE']),
    pattern: z.string().optional(),
  }).optional(),
});

// Create Spreadsheet Schema
const CreateSpreadsheetSchema = z.object({
  title: z.string(),
  sheets: z.array(z.object({
    title: z.string(),
    gridProperties: z.object({
      rowCount: z.number().min(1).optional(),
      columnCount: z.number().min(1).optional(),
      frozenRowCount: z.number().min(0).optional(),
      frozenColumnCount: z.number().min(0).optional(),
    }).optional(),
  })).optional(),
});

// Update Values Schema
const UpdateValuesSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  values: z.array(z.array(z.string())),
  majorDimension: z.enum(['ROWS', 'COLUMNS']).optional(),
});

// Format Cells Schema
const FormatCellsSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  format: CellFormatSchema,
});

// Row/Column Operation Schema
const DimensionOperationSchema = z.object({
  spreadsheetId: z.string(),
  sheetId: z.number(),
  dimension: z.enum(['ROWS', 'COLUMNS']),
  startIndex: z.number(),
  endIndex: z.number().optional(),
  operation: z.enum(['INSERT', 'DELETE', 'RESIZE']),
  size: z.number().optional(), // Required for RESIZE operation
});

// Merge Cells Schema
const MergeCellsSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
});

// Get Values Schema
const GetValuesSchema = z.object({
  spreadsheetId: z.string(),
  range: z.string(),
  majorDimension: z.enum(['ROWS', 'COLUMNS']).optional(),
});

// Drive specific schemas
const DriveFileMetadataSchema = z.object({
  name: z.string(),
  mimeType: z.string().optional(),
  description: z.string().optional(),
  parents: z.array(z.string()).optional(),
  fields: z.string().optional(),
});

const CreateFolderSchema = z.object({
  name: z.string(),
  parents: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const CreateFileSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  parents: z.array(z.string()).optional(),
  description: z.string().optional(),
  content: z.union([z.string(), z.instanceof(Buffer)]),
});

const UpdateFileSchema = z.object({
  fileId: z.string(),
  content: z.union([z.string(), z.instanceof(Buffer)]),
  mimeType: z.string(),
});

const GetFileSchema = z.object({
  fileId: z.string(),
  fields: z.string().optional(),
});

const ListFilesSchema = z.object({
  query: z.string().optional(),
  pageSize: z.number().optional(),
  fields: z.string().optional(),
  orderBy: z.string().optional(),
});

const UpdateFileMetadataSchema = z.object({
  fileId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  addParents: z.array(z.string()).optional(),
  removeParents: z.array(z.string()).optional(),
});

// Types based on schemas
export type Style = z.infer<typeof StyleSchema>;
export type CoverPage = z.infer<typeof CoverPageSchema>;
export type Headers = z.infer<typeof HeadersSchema>;
export type DocumentSection = z.infer<typeof DocumentSectionSchema>;
export type DocumentContent = z.infer<typeof DocumentContentSchema>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export type CreateDocInput = z.infer<typeof CreateDocInputSchema>;
export type GetDocContentInput = z.infer<typeof GetDocContentInputSchema>;
export type UpdateDocContentInput = z.infer<typeof UpdateDocContentInputSchema>;
export type SheetsColor = z.infer<typeof SheetsColorSchema>;
export type CellFormat = z.infer<typeof CellFormatSchema>;
export type CreateSpreadsheet = z.infer<typeof CreateSpreadsheetSchema>;
export type UpdateValues = z.infer<typeof UpdateValuesSchema>;
export type FormatCells = z.infer<typeof FormatCellsSchema>;
export type DimensionOperation = z.infer<typeof DimensionOperationSchema>;
export type MergeCells = z.infer<typeof MergeCellsSchema>;
export type GetValues = z.infer<typeof GetValuesSchema>;
export type DriveFileMetadata = z.infer<typeof DriveFileMetadataSchema>;
export type CreateFolder = z.infer<typeof CreateFolderSchema>;
export type CreateFile = z.infer<typeof CreateFileSchema>;
export type UpdateFile = z.infer<typeof UpdateFileSchema>;
export type GetFile = z.infer<typeof GetFileSchema>;
export type ListFiles = z.infer<typeof ListFilesSchema>;
export type UpdateFileMetadata = z.infer<typeof UpdateFileMetadataSchema>;

// Export schemas
export {
  StyleSchema,
  CoverPageSchema,
  HeadersSchema,
  DocumentSectionSchema,
  DocumentContentSchema,
  SearchInputSchema,
  CreateDocInputSchema,
  GetDocContentInputSchema,
  UpdateDocContentInputSchema,
  SheetsColorSchema,
  CellFormatSchema,
  CreateSpreadsheetSchema,
  UpdateValuesSchema,
  FormatCellsSchema,
  DimensionOperationSchema,
  MergeCellsSchema,
  GetValuesSchema,
  DriveFileMetadataSchema,
  CreateFolderSchema,
  CreateFileSchema,
  UpdateFileSchema,
  GetFileSchema,
  ListFilesSchema,
  UpdateFileMetadataSchema,
}; 