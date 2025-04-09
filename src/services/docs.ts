import { google, docs_v1 } from 'googleapis';
import { GoogleService } from '@/services/base.js';
import {
  CreateDocInput,
  GetDocContentInput,
  UpdateDocContentInput,
} from '@/types/schemas.js';

export class GoogleDocsService extends GoogleService {
  private docs!: docs_v1.Docs;

  protected initialize(): void {
    this.docs = google.docs('v1');
  }

  async createDocument(input: CreateDocInput): Promise<string> {
    const { title } = input;
    const doc = await this.docs.documents.create({
      requestBody: { title },
    });

    return doc.data.documentId!;
  }

  async getDocumentContent(input: GetDocContentInput): Promise<string> {
    const doc = await this.docs.documents.get({
      documentId: input.document_id,
    });

    let content = '';
    if (doc.data.body?.content) {
      for (const element of doc.data.body.content) {
        if (element.paragraph?.elements) {
          for (const paragraphElement of element.paragraph.elements) {
            if (paragraphElement.textRun?.content) {
              content += paragraphElement.textRun.content;
            }
          }
        }
      }
    }

    return content;
  }

  async updateDocument(input: UpdateDocContentInput): Promise<void> {
    const { document_id, requests } = input;

    await this.docs.documents.batchUpdate({
      documentId: document_id,
      requestBody: {
        requests,
      },
    });
  }
} 