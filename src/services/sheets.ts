import { OAuth2Client } from "google-auth-library";
import { sheets_v4 } from "@googleapis/sheets";
import { google } from "googleapis";
import {
  CreateSpreadsheet,
  UpdateValues,
  FormatCells,
  DimensionOperation,
  MergeCells,
  GetValues,
} from "@/types/schemas.js";

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;

  constructor(auth: OAuth2Client) {
    this.sheets = google.sheets({ version: "v4", auth });
  }

  async createSpreadsheet(input: CreateSpreadsheet): Promise<string> {
    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: input.title,
        },
        sheets: input.sheets?.map(sheet => ({
          properties: {
            title: sheet.title,
            gridProperties: sheet.gridProperties,
          },
        })),
      },
    });

    if (!response.data.spreadsheetId) {
      throw new Error("Failed to create spreadsheet");
    }

    return response.data.spreadsheetId;
  }

  async updateValues(input: UpdateValues): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: input.spreadsheetId,
      range: input.range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: input.values,
        majorDimension: input.majorDimension,
      },
    });
  }

  async formatCells(input: FormatCells): Promise<void> {
    const { spreadsheetId, range, format } = input;

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: this.getGridRange(range),
              cell: {
                userEnteredFormat: format,
              },
              fields: "userEnteredFormat",
            },
          },
        ],
      },
    });
  }

  async dimensionOperation(input: DimensionOperation): Promise<void> {
    const { spreadsheetId, sheetId, dimension, startIndex, endIndex, operation, size } = input;

    const request = {
      spreadsheetId,
      requestBody: {
        requests: [{
          [this.getDimensionOperation(operation)]: {
            range: {
              sheetId,
              dimension,
              startIndex,
              endIndex: endIndex || startIndex + 1,
            },
            ...(operation === "RESIZE" && { size }),
          },
        }],
      },
    };

    await this.sheets.spreadsheets.batchUpdate(request);
  }

  async mergeCells(input: MergeCells): Promise<void> {
    const { spreadsheetId, range } = input;

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            mergeCells: {
              range: this.getGridRange(range),
              mergeType: "MERGE_ALL",
            },
          },
        ],
      },
    });
  }

  async getValues(input: GetValues): Promise<string[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: input.spreadsheetId,
      range: input.range,
      majorDimension: input.majorDimension,
    });

    return response.data.values || [];
  }

  private getGridRange(a1Range: string): sheets_v4.Schema$GridRange {
    // This is a simplified implementation. In a production environment,
    // you would want to properly parse A1 notation into sheet ID and grid coordinates
    const [sheetName, cellRange] = a1Range.split("!");
    return {
      sheetId: 0, // Default to first sheet
      startRowIndex: 0,
      endRowIndex: 1000,
      startColumnIndex: 0,
      endColumnIndex: 26,
    };
  }

  private getDimensionOperation(operation: string): string {
    switch (operation) {
      case "INSERT":
        return "insertDimension";
      case "DELETE":
        return "deleteDimension";
      case "RESIZE":
        return "updateDimensionProperties";
      default:
        throw new Error(`Unsupported dimension operation: ${operation}`);
    }
  }
} 