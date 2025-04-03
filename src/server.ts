import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { OAuth2Client } from "google-auth-library";
import { GoogleDocsService } from "@/services/docs.js";
import { GoogleDriveService } from "@/services/drive.js";
import { GoogleSheetsService } from "@/services/sheets.js";
import { AuthService } from "@/services/auth.js";
import {
  SearchInputSchema,
  CreateDocInputSchema,
  GetDocContentInputSchema,
  UpdateDocContentInputSchema,
  CreateSpreadsheetSchema,
  UpdateValuesSchema,
  FormatCellsSchema,
  DimensionOperationSchema,
  MergeCellsSchema,
  GetValuesSchema,
  CreateFolderSchema,
  CreateFileSchema,
  UpdateFileSchema,
  GetFileSchema,
  ListFilesSchema,
  UpdateFileMetadataSchema,
} from '@/types/schemas.js';

export class MCPGoogleSuiteServer {
  private server: Server;
  private docsService: GoogleDocsService;
  private driveService: GoogleDriveService;
  private sheetsService: GoogleSheetsService;
  private authService: AuthService;

  constructor(auth: OAuth2Client) {
    this.server = new Server(
      {
        name: "mcp-servers/gsuite",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.authService = AuthService.getInstance();
    this.docsService = new GoogleDocsService(auth);
    this.driveService = new GoogleDriveService(auth);
    this.sheetsService = new GoogleSheetsService(auth);

    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    this.setupListResources();
    this.setupReadResource();
    this.setupListTools();
    this.setupCallTool();
  }

  private setupListResources(): void {
    this.server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
      const files = await this.driveService.searchFiles({
        query: "",
        page_size: 10,
      });

      return {
        resources: files.map((file) => ({
          uri: `gdrive:///${file.id}`,
          mimeType: file.mimeType,
          name: file.name,
        })),
        nextCursor: null,
      };
    });
  }

  private setupReadResource(): void {
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const fileId = request.params.uri.replace("gdrive:///", "");
      const { mimeType, content } = await this.driveService.getFileContent({ fileId });

      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType,
            text: typeof content === "string" ? content : content.toString("base64"),
          },
        ],
      };
    });
  }

  private setupListTools(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Drive Tools
          {
            name: "search",
            description: "Search for files in Google Drive",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string" },
                page_size: { type: "number", default: 10 }
              },
              required: ["query"]
            }
          },
          {
            name: "drive_create_folder",
            description: "Create a new folder in Google Drive",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                parents: { type: "array", items: { type: "string" } },
                description: { type: "string" }
              },
              required: ["name"]
            }
          },
          {
            name: "drive_create_file",
            description: "Create a new file in Google Drive",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                mimeType: { type: "string" },
                parents: { type: "array", items: { type: "string" } },
                description: { type: "string" },
                content: { type: "string" }
              },
              required: ["name", "mimeType", "content"]
            }
          },
          {
            name: "drive_update_file",
            description: "Update an existing file in Google Drive",
            inputSchema: {
              type: "object",
              properties: {
                fileId: { type: "string" },
                content: { type: "string" },
                mimeType: { type: "string" }
              },
              required: ["fileId", "content", "mimeType"]
            }
          },
          {
            name: "drive_get_file",
            description: "Get file metadata from Google Drive",
            inputSchema: {
              type: "object",
              properties: {
                fileId: { type: "string" },
                fields: { type: "string" }
              },
              required: ["fileId"]
            }
          },
          {
            name: "drive_list_files",
            description: "List files in Google Drive with optional filtering",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string" },
                pageSize: { type: "number" },
                fields: { type: "string" },
                orderBy: { type: "string" }
              }
            }
          },
          {
            name: "drive_update_metadata",
            description: "Update file metadata in Google Drive",
            inputSchema: {
              type: "object",
              properties: {
                fileId: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                mimeType: { type: "string" },
                addParents: { type: "array", items: { type: "string" } },
                removeParents: { type: "array", items: { type: "string" } }
              },
              required: ["fileId"]
            }
          },
          // Docs Tools
          {
            name: "docs_create",
            description: "Create a new Google Doc with formatting",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                content: {
                  type: "object",
                  properties: {
                    coverPage: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        subtitle: { type: "string" },
                        date: { type: "string" }
                      },
                      required: ["title"]
                    },
                    headers: {
                      type: "object",
                      properties: {
                        default: { type: "string" },
                        firstPage: { type: "string" }
                      }
                    },
                    footer: { type: "string" },
                    body: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          text: { type: "string" },
                          style: {
                            type: "object",
                            properties: {
                              bold: { type: "boolean" },
                              italic: { type: "boolean" },
                              fontSize: { type: "number" },
                              foregroundColor: {
                                type: "object",
                                properties: {
                                  red: { type: "number", minimum: 0, maximum: 1 },
                                  green: { type: "number", minimum: 0, maximum: 1 },
                                  blue: { type: "number", minimum: 0, maximum: 1 }
                                }
                              },
                              backgroundColor: {
                                type: "object",
                                properties: {
                                  red: { type: "number", minimum: 0, maximum: 1 },
                                  green: { type: "number", minimum: 0, maximum: 1 },
                                  blue: { type: "number", minimum: 0, maximum: 1 }
                                }
                              },
                              heading: {
                                type: "string",
                                enum: ["NORMAL", "HEADING_1", "HEADING_2", "HEADING_3"]
                              }
                            }
                          }
                        },
                        required: ["text"]
                      }
                    }
                  }
                }
              },
              required: ["title"]
            }
          },
          {
            name: "docs_get_content",
            description: "Get the contents of a Google Doc",
            inputSchema: {
              type: "object",
              properties: {
                document_id: { type: "string" }
              },
              required: ["document_id"]
            }
          },
          {
            name: "docs_update_content",
            description: "Update the content of a Google Doc",
            inputSchema: {
              type: "object",
              properties: {
                document_id: { type: "string" },
                content: {
                  anyOf: [
                    { type: "string" },
                    {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        style: {
                          type: "object",
                          properties: {
                            bold: { type: "boolean" },
                            italic: { type: "boolean" },
                            fontSize: { type: "number" },
                            foregroundColor: {
                              type: "object",
                              properties: {
                                red: { type: "number", minimum: 0, maximum: 1 },
                                green: { type: "number", minimum: 0, maximum: 1 },
                                blue: { type: "number", minimum: 0, maximum: 1 }
                              }
                            }
                          }
                        }
                      },
                      required: ["text"]
                    },
                    {
                      type: "object",
                      properties: {
                        coverPage: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            subtitle: { type: "string" },
                            date: { type: "string" }
                          },
                          required: ["title"]
                        },
                        headers: {
                          type: "object",
                          properties: {
                            default: { type: "string" },
                            firstPage: { type: "string" }
                          }
                        },
                        footer: { type: "string" },
                        body: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              text: { type: "string" },
                              style: {
                                type: "object",
                                properties: {
                                  bold: { type: "boolean" },
                                  italic: { type: "boolean" },
                                  fontSize: { type: "number" },
                                  foregroundColor: {
                                    type: "object",
                                    properties: {
                                      red: { type: "number", minimum: 0, maximum: 1 },
                                      green: { type: "number", minimum: 0, maximum: 1 },
                                      blue: { type: "number", minimum: 0, maximum: 1 }
                                    }
                                  }
                                }
                              }
                            },
                            required: ["text"]
                          }
                        }
                      }
                    }
                  ]
                }
              },
              required: ["document_id", "content"]
            }
          },
          // Sheets Tools
          {
            name: "sheets_create",
            description: "Create a new Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                sheets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      gridProperties: {
                        type: "object",
                        properties: {
                          rowCount: { type: "number", minimum: 1 },
                          columnCount: { type: "number", minimum: 1 },
                          frozenRowCount: { type: "number", minimum: 0 },
                          frozenColumnCount: { type: "number", minimum: 0 }
                        }
                      }
                    },
                    required: ["title"]
                  }
                }
              },
              required: ["title"]
            }
          },
          {
            name: "sheets_update_values",
            description: "Update values in a Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                spreadsheetId: { type: "string" },
                range: { type: "string" },
                values: {
                  type: "array",
                  items: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                majorDimension: {
                  type: "string",
                  enum: ["ROWS", "COLUMNS"]
                }
              },
              required: ["spreadsheetId", "range", "values"]
            }
          },
          {
            name: "sheets_format_cells",
            description: "Format cells in a Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                spreadsheetId: { type: "string" },
                range: { type: "string" },
                format: {
                  type: "object",
                  properties: {
                    backgroundColor: {
                      type: "object",
                      properties: {
                        red: { type: "number", minimum: 0, maximum: 1 },
                        green: { type: "number", minimum: 0, maximum: 1 },
                        blue: { type: "number", minimum: 0, maximum: 1 },
                        alpha: { type: "number", minimum: 0, maximum: 1 }
                      }
                    },
                    textFormat: {
                      type: "object",
                      properties: {
                        foregroundColor: {
                          type: "object",
                          properties: {
                            red: { type: "number", minimum: 0, maximum: 1 },
                            green: { type: "number", minimum: 0, maximum: 1 },
                            blue: { type: "number", minimum: 0, maximum: 1 },
                            alpha: { type: "number", minimum: 0, maximum: 1 }
                          }
                        },
                        fontFamily: { type: "string" },
                        fontSize: { type: "number" },
                        bold: { type: "boolean" },
                        italic: { type: "boolean" },
                        strikethrough: { type: "boolean" },
                        underline: { type: "boolean" }
                      }
                    },
                    horizontalAlignment: {
                      type: "string",
                      enum: ["LEFT", "CENTER", "RIGHT"]
                    },
                    verticalAlignment: {
                      type: "string",
                      enum: ["TOP", "MIDDLE", "BOTTOM"]
                    }
                  }
                }
              },
              required: ["spreadsheetId", "range", "format"]
            }
          },
          {
            name: "sheets_dimension_operation",
            description: "Perform operations on rows or columns in a Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                spreadsheetId: { type: "string" },
                sheetId: { type: "number" },
                dimension: {
                  type: "string",
                  enum: ["ROWS", "COLUMNS"]
                },
                startIndex: { type: "number" },
                endIndex: { type: "number" },
                operation: {
                  type: "string",
                  enum: ["INSERT", "DELETE", "RESIZE"]
                },
                size: { type: "number" }
              },
              required: ["spreadsheetId", "sheetId", "dimension", "startIndex", "operation"]
            }
          },
          {
            name: "sheets_merge_cells",
            description: "Merge cells in a Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                spreadsheetId: { type: "string" },
                range: { type: "string" }
              },
              required: ["spreadsheetId", "range"]
            }
          },
          {
            name: "sheets_get_values",
            description: "Get values from a Google Sheet",
            inputSchema: {
              type: "object",
              properties: {
                spreadsheetId: { type: "string" },
                range: { type: "string" },
                majorDimension: {
                  type: "string",
                  enum: ["ROWS", "COLUMNS"]
                }
              },
              required: ["spreadsheetId", "range"]
            }
          }
        ]
      };
    });
  }

  private setupCallTool(): void {
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        console.error(`Handling tool request: ${request.params.name}`);
        console.error(`Request arguments:`, JSON.stringify(request.params.arguments, null, 2));

        switch (request.params.name) {
          // Drive operations
          case "search": {
            console.error('Parsing search input...');
            const input = SearchInputSchema.parse(request.params.arguments);
            console.error('Search input parsed:', JSON.stringify(input, null, 2));
            
            console.error('Calling Drive searchFiles...');
            const files = await this.driveService.searchFiles(input);
            console.error(`Found ${files.length} files`);
            
            const fileList = files
              .map((file) => `${file.name} (${file.mimeType})`)
              .join("\n");

            return {
              content: [{ type: "text", text: `Found ${files.length} files:\n${fileList}` }],
              isError: false,
            };
          }

          case "drive_create_folder": {
            const input = CreateFolderSchema.parse(request.params.arguments);
            const folder = await this.driveService.createFolder(input);
            return {
              content: [{ type: "text", text: `Created folder with ID: ${folder.id}` }],
              isError: false,
            };
          }

          case "drive_create_file": {
            const input = CreateFileSchema.parse(request.params.arguments);
            const file = await this.driveService.createFile(input);
            return {
              content: [{ type: "text", text: `Created file with ID: ${file.id}` }],
              isError: false,
            };
          }

          case "drive_update_file": {
            const input = UpdateFileSchema.parse(request.params.arguments);
            await this.driveService.updateFile(input);
            return {
              content: [{ type: "text", text: "File updated successfully" }],
              isError: false,
            };
          }

          case "drive_get_file": {
            const input = GetFileSchema.parse(request.params.arguments);
            const file = await this.driveService.getFile(input);
            return {
              content: [{ type: "text", text: JSON.stringify(file, null, 2) }],
              isError: false,
            };
          }

          case "drive_list_files": {
            const input = ListFilesSchema.parse(request.params.arguments);
            const files = await this.driveService.listFiles(input);
            return {
              content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
              isError: false,
            };
          }

          case "drive_update_metadata": {
            const input = UpdateFileMetadataSchema.parse(request.params.arguments);
            await this.driveService.updateFileMetadata(input);
            return {
              content: [{ type: "text", text: "File metadata updated successfully" }],
              isError: false,
            };
          }

          // Docs operations
          case "docs_create": {
            const input = CreateDocInputSchema.parse(request.params.arguments);
            const documentId = await this.docsService.createDocument(input);
            return {
              content: [{ type: "text", text: `Created document with ID: ${documentId}` }],
              isError: false,
            };
          }

          case "docs_get_content": {
            const input = GetDocContentInputSchema.parse(request.params.arguments);
            const content = await this.docsService.getDocumentContent(input);
            return {
              content: [{ type: "text", text: content }],
              isError: false,
            };
          }

          case "docs_update_content": {
            const input = UpdateDocContentInputSchema.parse(request.params.arguments);
            await this.docsService.updateDocument(input);
            return {
              content: [{ type: "text", text: "Document updated successfully" }],
              isError: false,
            };
          }

          // Sheets operations
          case "sheets_create": {
            const input = CreateSpreadsheetSchema.parse(request.params.arguments);
            const spreadsheetId = await this.sheetsService.createSpreadsheet(input);
            return {
              content: [{ type: "text", text: `Created spreadsheet with ID: ${spreadsheetId}` }],
              isError: false,
            };
          }

          case "sheets_update_values": {
            const input = UpdateValuesSchema.parse(request.params.arguments);
            await this.sheetsService.updateValues(input);
            return {
              content: [{ type: "text", text: "Values updated successfully" }],
              isError: false,
            };
          }

          case "sheets_format_cells": {
            const input = FormatCellsSchema.parse(request.params.arguments);
            await this.sheetsService.formatCells(input);
            return {
              content: [{ type: "text", text: "Cell formatting applied successfully" }],
              isError: false,
            };
          }

          case "sheets_dimension_operation": {
            const input = DimensionOperationSchema.parse(request.params.arguments);
            await this.sheetsService.dimensionOperation(input);
            return {
              content: [{ type: "text", text: `${input.operation} operation completed successfully` }],
              isError: false,
            };
          }

          case "sheets_merge_cells": {
            const input = MergeCellsSchema.parse(request.params.arguments);
            await this.sheetsService.mergeCells(input);
            return {
              content: [{ type: "text", text: "Cells merged successfully" }],
              isError: false,
            };
          }

          case "sheets_get_values": {
            const input = GetValuesSchema.parse(request.params.arguments);
            const values = await this.sheetsService.getValues(input);
            return {
              content: [{ type: "text", text: JSON.stringify(values, null, 2) }],
              isError: false,
            };
          }

          default:
            throw new Error("Tool not found");
        }
      } catch (error) {
        console.error('Error details:', error);
        
        let errorMessage = 'An error occurred: ';
        if (error instanceof Error) {
          errorMessage += error.message;
          if ('cause' in error) {
            errorMessage += `\nCause: ${JSON.stringify(error.cause)}`;
          }
        } else {
          errorMessage += JSON.stringify(error);
        }

        return {
          content: [{ type: "text", text: errorMessage }],
          isError: true,
        };
      }
    });
  }

  async connect(transport: any): Promise<void> {
    await this.server.connect(transport);
  }
} 