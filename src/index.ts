#!/usr/bin/env node

import { authenticate } from "@google-cloud/local-auth";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "fs";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from 'url';
import { MCPGoogleSuiteServer } from "@/server.js";
import { OAuth2Client } from 'google-auth-library';
import { GoogleDriveService } from '@/services/drive.js';
import { GoogleDocsService } from '@/services/docs.js';
import { GoogleSheetsService } from '@/services/sheets.js';
import { 
  CellFormat, 
  CreateDocInput, 
  GetDocContentInput, 
  UpdateDocContentInput,
  SearchInput
} from '@/types/schemas.js';
import os from 'os';

function expandPath(filepath: string): string {
  if (!filepath) return '';
  if (filepath.startsWith('~/')) {
    return path.join(os.homedir(), filepath.slice(2));
  }
  return filepath;
}

function ensureDirectory(filepath: string) {
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const defaultCredentialsPath = path.join(os.homedir(), '.google/server-creds.json');
const defaultOAuthPath = path.join(os.homedir(), '.google/oauth.keys.json');

const credentialsPath = expandPath(process.env.GOOGLE_CREDENTIALS_PATH || defaultCredentialsPath);
const oauthPath = expandPath(process.env.GOOGLE_OAUTH_PATH || defaultOAuthPath);

async function authenticateAndSaveCredentials() {
  ensureDirectory(credentialsPath);
  ensureDirectory(oauthPath);

  if (!fs.existsSync(oauthPath)) {
    console.error(`OAuth keys file not found at ${oauthPath}`);
    console.error('\nTo set up authentication:');
    console.error('1. Go to Google Cloud Console');
    console.error('2. Create a project or select an existing one');
    console.error('3. Enable the required APIs (Drive, Docs, Sheets)');
    console.error('4. Create OAuth 2.0 credentials');
    console.error('5. Download the OAuth keys file');
    console.error(`6. Save it to ${oauthPath}`);
    console.error('\nThen run this command again.');
    process.exit(1);
  }

  console.log("Launching auth flow…");
  const auth = await authenticate({
    keyfilePath: oauthPath,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/spreadsheets"
    ],
  });

  fs.writeFileSync(credentialsPath, JSON.stringify(auth.credentials, null, 2));
  console.log(`\nCredentials saved to ${credentialsPath}`);
  console.log('You can now run the server.');
}

async function loadCredentialsAndRunServer() {
  if (!fs.existsSync(credentialsPath)) {
    console.error(`\nCredentials not found at ${credentialsPath}`);
    console.error('\nPlease run the following command first:');
    console.error(`node ${process.argv[1]} auth`);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
  const auth = new google.auth.OAuth2();
  auth.setCredentials(credentials);

  console.error("Credentials loaded. Starting server.");
  const transport = new StdioServerTransport();
  const server = new MCPGoogleSuiteServer(auth);
  await server.connect(transport);
}

export class GoogleSuiteService {
  private auth!: OAuth2Client;
  private drive!: GoogleDriveService;
  private docs!: GoogleDocsService;
  private sheets!: GoogleSheetsService;

  constructor(auth?: OAuth2Client) {
    if (auth) {
      this.auth = auth;
      this.initializeServices();
    }
  }

  async authenticate(credentialsPath?: string) {
    this.auth = await authenticate({
      keyfilePath: expandPath(credentialsPath || process.env.GOOGLE_OAUTH_PATH || path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../../google-oauth.keys.json",
      )),
      scopes: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/spreadsheets"
      ],
    });
    this.initializeServices();
  }

  private initializeServices() {
    this.drive = new GoogleDriveService(this.auth);
    this.docs = new GoogleDocsService(this.auth);
    this.sheets = new GoogleSheetsService(this.auth);
  }

  // Drive methods
  async searchFiles(query: string, pageSize: number = 10) {
    return this.drive.searchFiles({ query, page_size: pageSize });
  }

  async getFileContent(fileId: string) {
    return this.drive.getFileContent({ fileId });
  }

  async getFileMetadata(fileId: string, fields?: string) {
    return this.drive.getFile({ fileId, fields });
  }

  // Docs methods
  async createDocument(input: CreateDocInput) {
    return this.docs.createDocument(input);
  }

  async getDocumentContent(input: GetDocContentInput) {
    return this.docs.getDocumentContent(input);
  }

  async updateDocument(input: UpdateDocContentInput) {
    return this.docs.updateDocument(input);
  }

  // Sheets methods
  async createSpreadsheet(title: string, sheets?: { title: string, gridProperties?: { rowCount?: number, columnCount?: number, frozenRowCount?: number, frozenColumnCount?: number } }[]) {
    return this.sheets.createSpreadsheet({ title, sheets });
  }

  async getValues(spreadsheetId: string, range: string) {
    return this.sheets.getValues({ spreadsheetId, range });
  }

  async updateValues(spreadsheetId: string, range: string, values: string[][], majorDimension?: 'ROWS' | 'COLUMNS') {
    return this.sheets.updateValues({ spreadsheetId, range, values, majorDimension });
  }

  async formatCells(spreadsheetId: string, range: string, format: CellFormat) {
    return this.sheets.formatCells({ spreadsheetId, range, format });
  }

  async dimensionOperation(spreadsheetId: string, sheetId: number, dimension: 'ROWS' | 'COLUMNS', startIndex: number, operation: 'INSERT' | 'DELETE' | 'RESIZE', endIndex?: number, size?: number) {
    return this.sheets.dimensionOperation({
      spreadsheetId,
      sheetId,
      dimension,
      startIndex,
      operation,
      endIndex,
      size,
    });
  }

  async mergeCells(spreadsheetId: string, range: string) {
    return this.sheets.mergeCells({ spreadsheetId, range });
  }
}

// Check if any argument contains 'auth'
if (process.argv.includes("auth")) {
  authenticateAndSaveCredentials().catch(console.error);
} else {
  loadCredentialsAndRunServer().catch(console.error);
} 