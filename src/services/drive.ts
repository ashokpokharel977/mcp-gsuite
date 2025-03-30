import { google, drive_v3 } from 'googleapis';
import { GoogleService } from '@services/base.js';
import {
  SearchInput,
  CreateFolder,
  CreateFile,
  UpdateFile,
  GetFile,
  ListFiles,
  UpdateFileMetadata,
} from '../types/schemas.js';

export class GoogleDriveService extends GoogleService {
  private drive!: drive_v3.Drive;

  protected initialize(): void {
    this.drive = google.drive('v3');
  }

  async searchFiles(input: SearchInput): Promise<drive_v3.Schema$File[]> {
    const { query, page_size } = input;
    const escapedQuery = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const formattedQuery = `fullText contains '${escapedQuery}'`;

    const res = await this.drive.files.list({
      q: formattedQuery,
      pageSize: page_size,
      fields: "files(id, name, mimeType, modifiedTime, size)",
    } as drive_v3.Params$Resource$Files$List);

    return res.data.files || [];
  }

  async createFolder(input: CreateFolder): Promise<drive_v3.Schema$File> {
    const fileMetadata = {
      name: input.name,
      mimeType: 'application/vnd.google-apps.folder',
      description: input.description,
      parents: input.parents,
    };

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, mimeType, description, parents',
    });

    return res.data;
  }

  async createFile(input: CreateFile): Promise<drive_v3.Schema$File> {
    const fileMetadata = {
      name: input.name,
      mimeType: input.mimeType,
      description: input.description,
      parents: input.parents,
    };

    const media = {
      mimeType: input.mimeType,
      body: input.content,
    };

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, mimeType, description, parents',
    });

    return res.data;
  }

  async updateFile(input: UpdateFile): Promise<drive_v3.Schema$File> {
    const media = {
      mimeType: input.mimeType,
      body: input.content,
    };

    const res = await this.drive.files.update({
      fileId: input.fileId,
      media: media,
      fields: 'id, name, mimeType, modifiedTime',
    });

    return res.data;
  }

  async getFileContent(input: GetFile): Promise<{ mimeType: string; content: string | Buffer }> {
    // First get file metadata to check mime type
    const file = await this.drive.files.get({
      fileId: input.fileId,
      fields: "mimeType",
    });

    const mimeType = file.data.mimeType || "application/octet-stream";

    // For Google Docs/Sheets/etc we need to export
    if (mimeType.startsWith("application/vnd.google-apps")) {
      let exportMimeType: string;
      switch (mimeType) {
        case "application/vnd.google-apps.document":
          exportMimeType = "text/markdown";
          break;
        case "application/vnd.google-apps.spreadsheet":
          exportMimeType = "text/csv";
          break;
        case "application/vnd.google-apps.presentation":
          exportMimeType = "text/plain";
          break;
        case "application/vnd.google-apps.drawing":
          exportMimeType = "image/png";
          break;
        default:
          exportMimeType = "text/plain";
      }

      const res = await this.drive.files.export(
        { fileId: input.fileId, mimeType: exportMimeType },
        { responseType: "text" },
      );

      return {
        mimeType: exportMimeType,
        content: res.data as string,
      };
    }

    // For regular files download content
    const res = await this.drive.files.get(
      { fileId: input.fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );

    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      return {
        mimeType,
        content: Buffer.from(res.data as ArrayBuffer).toString("utf-8"),
      };
    }

    return {
      mimeType,
      content: Buffer.from(res.data as ArrayBuffer),
    };
  }

  async getFile(input: GetFile): Promise<drive_v3.Schema$File> {
    const res = await this.drive.files.get({
      fileId: input.fileId,
      fields: input.fields || 'id, name, mimeType, modifiedTime, size',
    });

    return res.data;
  }

  async listFiles(input: ListFiles): Promise<drive_v3.Schema$FileList> {
    const res = await this.drive.files.list({
      q: input.query,
      pageSize: input.pageSize || 100,
      fields: input.fields || 'files(id, name, mimeType)',
      orderBy: input.orderBy,
    });

    return res.data;
  }

  async updateFileMetadata(input: UpdateFileMetadata): Promise<drive_v3.Schema$File> {
    const res = await this.drive.files.update({
      fileId: input.fileId,
      requestBody: {
        name: input.name,
        description: input.description,
        mimeType: input.mimeType,
      },
      addParents: input.addParents?.join(','),
      removeParents: input.removeParents?.join(','),
      fields: 'id, name, mimeType, description, parents',
    });

    return res.data;
  }
} 