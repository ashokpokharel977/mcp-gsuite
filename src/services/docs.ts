import { google, docs_v1 } from 'googleapis';
import { GoogleService } from '@/services/base.js';
import {
  CreateDocInput,
  GetDocContentInput,
  UpdateDocContentInput,
  DocumentContent,
} from '@/types/schemas.js';

export class GoogleDocsService extends GoogleService {
  private docs!: docs_v1.Docs;

  protected initialize(): void {
    this.docs = google.docs('v1');
  }

  async createDocument(input: CreateDocInput): Promise<string> {
    const { title, content } = input;
    const doc = await this.docs.documents.create({
      requestBody: { title },
    });

    const documentId = doc.data.documentId!;

    if (content) {
      await this.updateDocumentContent(documentId, content);
    }

    return documentId;
  }

  private async updateDocumentContent(documentId: string, content: DocumentContent): Promise<void> {
    const requests: docs_v1.Schema$Request[] = [];

    if (content.coverPage) {
      this.addCoverPageRequests(requests, content.coverPage);
    }

    if (content.headers) {
      this.addHeaderRequests(requests, content.headers);
    }

    if (content.footer) {
      this.addFooterRequests(requests, content.footer);
    }

    if (content.body) {
      this.addBodyContentRequests(requests, content.body);
    }

    if (requests.length > 0) {
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: { requests },
      });
    }
  }

  private addCoverPageRequests(requests: docs_v1.Schema$Request[], coverPage: DocumentContent['coverPage']): void {
    if (!coverPage) return;

    let currentIndex = 1;

    // Add title
    requests.push(
      {
        insertText: {
          location: { index: currentIndex },
          text: coverPage.title + '\n',
        },
      },
      {
        updateParagraphStyle: {
          range: { startIndex: currentIndex, endIndex: currentIndex + coverPage.title.length + 1 },
          paragraphStyle: {
            namedStyleType: 'TITLE',
            alignment: 'CENTER',
          },
          fields: 'namedStyleType,alignment',
        },
      }
    );

    currentIndex += coverPage.title.length + 2;

    // Add subtitle if present
    if (coverPage.subtitle) {
      requests.push(
        {
          insertText: {
            location: { index: currentIndex },
            text: coverPage.subtitle + '\n',
          },
        },
        {
          updateParagraphStyle: {
            range: { startIndex: currentIndex, endIndex: currentIndex + coverPage.subtitle.length + 1 },
            paragraphStyle: {
              namedStyleType: 'SUBTITLE',
              alignment: 'CENTER',
            },
            fields: 'namedStyleType,alignment',
          },
        }
      );
      currentIndex += coverPage.subtitle.length + 1;
    }

    // Add date if present
    if (coverPage.date) {
      requests.push(
        {
          insertText: {
            location: { index: currentIndex },
            text: coverPage.date + '\n\n',
          },
        },
        {
          updateParagraphStyle: {
            range: { startIndex: currentIndex, endIndex: currentIndex + coverPage.date.length + 1 },
            paragraphStyle: {
              alignment: 'CENTER',
            },
            fields: 'alignment',
          },
        }
      );
      currentIndex += coverPage.date.length + 2;
    }

    // Add page break
    requests.push({
      insertPageBreak: {
        location: { index: currentIndex },
      },
    });
  }

  private addHeaderRequests(requests: docs_v1.Schema$Request[], headers: DocumentContent['headers']): void {
    if (!headers) return;

    requests.push({
      createHeader: {
        type: 'DEFAULT',
        sectionBreakLocation: { index: 1 },
      },
    });

    if (headers.default) {
      requests.push({
        insertText: {
          location: { segmentId: 'header', index: 0 },
          text: headers.default,
        },
      });
    }

    if (headers.firstPage) {
      requests.push(
        {
          createHeader: {
            type: 'FIRST_PAGE',
            sectionBreakLocation: { index: 1 },
          },
        },
        {
          insertText: {
            location: { segmentId: 'first_header', index: 0 },
            text: headers.firstPage,
          },
        }
      );
    }
  }

  private addFooterRequests(requests: docs_v1.Schema$Request[], footer: string): void {
    requests.push(
      {
        createFooter: {
          type: 'DEFAULT',
          sectionBreakLocation: { index: 1 },
        },
      },
      {
        insertText: {
          location: { segmentId: 'footer', index: 0 },
          text: footer,
        },
      }
    );
  }

  private addBodyContentRequests(requests: docs_v1.Schema$Request[], body: DocumentContent['body']): void {
    if (!body) return;

    let currentIndex = requests.length > 0 ? requests.length + 2 : 1;

    for (const section of body) {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: section.text + '\n',
        },
      });

      if (section.style) {
        const textStyle: docs_v1.Schema$TextStyle = {};
        const updateTextStyleRequest: docs_v1.Schema$Request = {
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + section.text.length,
            },
            textStyle,
            fields: '',
          },
        };

        if (section.style.bold) {
          textStyle.bold = true;
          updateTextStyleRequest.updateTextStyle!.fields += 'bold,';
        }
        if (section.style.italic) {
          textStyle.italic = true;
          updateTextStyleRequest.updateTextStyle!.fields += 'italic,';
        }
        if (section.style.fontSize) {
          textStyle.fontSize = { magnitude: section.style.fontSize, unit: 'PT' };
          updateTextStyleRequest.updateTextStyle!.fields += 'fontSize,';
        }
        if (section.style.foregroundColor) {
          textStyle.foregroundColor = { color: { rgbColor: section.style.foregroundColor } };
          updateTextStyleRequest.updateTextStyle!.fields += 'foregroundColor,';
        }
        if (section.style.backgroundColor) {
          textStyle.backgroundColor = { color: { rgbColor: section.style.backgroundColor } };
          updateTextStyleRequest.updateTextStyle!.fields += 'backgroundColor,';
        }

        if (updateTextStyleRequest.updateTextStyle!.fields) {
          requests.push(updateTextStyleRequest);
        }

        if (section.style.heading && section.style.heading !== 'NORMAL') {
          requests.push({
            updateParagraphStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + section.text.length,
              },
              paragraphStyle: {
                namedStyleType: section.style.heading,
              },
              fields: 'namedStyleType',
            },
          });
        }
      }

      currentIndex += section.text.length + 1;
    }
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
    const { document_id, content } = input;

    const doc = await this.docs.documents.get({
      documentId: document_id,
    });

    const endIndex = doc.data.body?.content?.[doc.data.body.content.length - 1]?.endIndex || 1;
    await this.docs.documents.batchUpdate({
      documentId: document_id,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: endIndex,
              },
            },
          },
          {
            insertText: {
              location: {
                index: 1,
              },
              text: content,
            },
          },
        ],
      },
    });
  }
} 