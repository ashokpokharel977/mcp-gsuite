import { google, docs_v1 } from 'googleapis';
import { GoogleService } from '@/services/base.js';
import {
  CreateDocInput,
  GetDocContentInput,
  UpdateDocContentInput,
  DocumentContent,
  Style,
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
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: coverPage.title + '\n',
      }
    });

    currentIndex += coverPage.title.length + 1;

    requests.push({
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: currentIndex },
        paragraphStyle: {
          namedStyleType: 'TITLE',
          alignment: 'CENTER',
        },
        fields: 'namedStyleType,alignment',
      }
    });

    // Add subtitle if present
    if (coverPage.subtitle) {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: coverPage.subtitle + '\n',
        }
      });

      const subtitleStart = currentIndex;
      currentIndex += coverPage.subtitle.length + 1;

      requests.push({
        updateParagraphStyle: {
          range: { startIndex: subtitleStart, endIndex: currentIndex },
          paragraphStyle: {
            namedStyleType: 'SUBTITLE',
            alignment: 'CENTER',
          },
          fields: 'namedStyleType,alignment',
        }
      });
    }

    // Add date if present
    if (coverPage.date) {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: coverPage.date + '\n\n',
        }
      });

      const dateStart = currentIndex;
      currentIndex += coverPage.date.length + 2;

      requests.push({
        updateParagraphStyle: {
          range: { startIndex: dateStart, endIndex: currentIndex },
          paragraphStyle: {
            alignment: 'CENTER',
          },
          fields: 'alignment',
        }
      });
    }

    // Add page break
    requests.push({
      insertPageBreak: {
        location: { index: currentIndex },
      }
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

    let currentIndex = 1;
    
    // Calculate the current index based on previous content
    for (const request of requests) {
      if ('insertText' in request) {
        const text = (request.insertText as any).text;
        if (text) {
          currentIndex += text.length;
        }
      }
    }

    for (const section of body) {
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: section.text,
        },
      });

      if (section.style) {
        const textStyle: docs_v1.Schema$TextStyle = {};
        const paragraphStyle: docs_v1.Schema$ParagraphStyle = {};
        
        const textFields = this.applyTextStyle(textStyle, section.style);
        const paragraphFields = this.applyParagraphStyle(paragraphStyle, section.style);

        if (textFields.length > 0) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + section.text.length,
              },
              textStyle,
              fields: textFields.join(','),
            },
          });
        }

        if (paragraphFields.length > 0) {
          requests.push({
            updateParagraphStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + section.text.length,
              },
              paragraphStyle,
              fields: paragraphFields.join(','),
            },
          });
        }
      }

      currentIndex += section.text.length;
    }
  }

  private applyTextStyle(textStyle: docs_v1.Schema$TextStyle, style: Style): string[] {
    const fields: string[] = [];

    if (style.bold) {
      textStyle.bold = true;
      fields.push('bold');
    }
    if (style.italic) {
      textStyle.italic = true;
      fields.push('italic');
    }
    if (style.underline) {
      textStyle.underline = true;
      fields.push('underline');
    }
    if (style.strikethrough) {
      textStyle.strikethrough = true;
      fields.push('strikethrough');
    }
    if (style.fontSize) {
      textStyle.fontSize = { magnitude: style.fontSize, unit: 'PT' };
      fields.push('fontSize');
    }
    if (style.foregroundColor) {
      textStyle.foregroundColor = { color: { rgbColor: style.foregroundColor } };
      fields.push('foregroundColor');
    }
    if (style.backgroundColor) {
      textStyle.backgroundColor = { color: { rgbColor: style.backgroundColor } };
      fields.push('backgroundColor');
    }
    if (style.fontFamily) {
      textStyle.weightedFontFamily = {
        fontFamily: style.fontFamily.family,
        weight: style.fontFamily.weight || 400
      };
      fields.push('weightedFontFamily');
    }

    return fields;
  }

  private applyParagraphStyle(paragraphStyle: docs_v1.Schema$ParagraphStyle, style: Style): string[] {
    const fields: string[] = [];

    if (style.alignment) {
      paragraphStyle.alignment = style.alignment;
      fields.push('alignment');
    }
    if (style.lineSpacing) {
      paragraphStyle.lineSpacing = style.lineSpacing;
      fields.push('lineSpacing');
    }
    if (style.spaceAbove) {
      paragraphStyle.spaceAbove = { magnitude: style.spaceAbove, unit: 'PT' };
      fields.push('spaceAbove');
    }
    if (style.spaceBelow) {
      paragraphStyle.spaceBelow = { magnitude: style.spaceBelow, unit: 'PT' };
      fields.push('spaceBelow');
    }
    if (style.indentStart) {
      paragraphStyle.indentStart = { magnitude: style.indentStart, unit: 'PT' };
      fields.push('indentStart');
    }
    if (style.indentEnd) {
      paragraphStyle.indentEnd = { magnitude: style.indentEnd, unit: 'PT' };
      fields.push('indentEnd');
    }
    if (style.indentFirstLine) {
      paragraphStyle.indentFirstLine = { magnitude: style.indentFirstLine, unit: 'PT' };
      fields.push('indentFirstLine');
    }
    if (style.direction) {
      paragraphStyle.direction = style.direction;
      fields.push('direction');
    }
    if (style.keepLinesTogether !== undefined) {
      paragraphStyle.keepLinesTogether = style.keepLinesTogether;
      fields.push('keepLinesTogether');
    }
    if (style.keepWithNext !== undefined) {
      paragraphStyle.keepWithNext = style.keepWithNext;
      fields.push('keepWithNext');
    }
    if (style.pageBreakBefore !== undefined) {
      paragraphStyle.pageBreakBefore = style.pageBreakBefore;
      fields.push('pageBreakBefore');
    }
    if (style.heading) {
      paragraphStyle.namedStyleType = style.heading;
      fields.push('namedStyleType');
    }

    return fields;
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

    // First get the document to find the end index
    const doc = await this.docs.documents.get({
      documentId: document_id,
    });

    const endIndex = doc.data.body?.content?.[doc.data.body.content.length - 1]?.endIndex || 1;

    // Initialize requests array
    const requests: docs_v1.Schema$Request[] = [
      // First delete existing content
      {
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex: endIndex,
          },
        },
      },
    ];

    // Handle different content types
    if (typeof content === 'string') {
      // Simple text content
      requests.push(
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
        {
          updateParagraphStyle: {
            range: {
              startIndex: 1,
              endIndex: content.length + 1,
            },
            paragraphStyle: {
              namedStyleType: 'NORMAL_TEXT',
            },
            fields: 'namedStyleType',
          },
        }
      );
    } else if ('text' in content) {
      // Single section with optional style
      requests.push({
        insertText: {
          location: { index: 1 },
          text: content.text,
        },
      });

      if (content.style) {
        const textStyle: docs_v1.Schema$TextStyle = {};
        const paragraphStyle: docs_v1.Schema$ParagraphStyle = {};
        
        const textFields = this.applyTextStyle(textStyle, content.style);
        const paragraphFields = this.applyParagraphStyle(paragraphStyle, content.style);

        if (textFields.length > 0) {
          requests.push({
            updateTextStyle: {
              range: {
                startIndex: 1,
                endIndex: content.text.length + 1,
              },
              textStyle,
              fields: textFields.join(','),
            },
          });
        }

        if (paragraphFields.length > 0) {
          requests.push({
            updateParagraphStyle: {
              range: {
                startIndex: 1,
                endIndex: content.text.length + 1,
              },
              paragraphStyle,
              fields: paragraphFields.join(','),
            },
          });
        }
      }
    } else {
      // Full document content with sections
      let currentIndex = 1;

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
    }

    // Send the batch update request
    await this.docs.documents.batchUpdate({
      documentId: document_id,
      requestBody: {
        requests,
      },
    });
  }
} 