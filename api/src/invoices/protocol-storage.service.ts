import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, type drive_v3 } from 'googleapis';
import { Readable } from 'stream';

/**
 * Stores works acceptance protocols in a Google Drive folder through the service account.
 * The folder must live on a Shared drive: service accounts have no storage of their own.
 */
@Injectable()
export class ProtocolStorageService {
  private readonly logger = new Logger(ProtocolStorageService.name);
  private readonly drive: drive_v3.Drive;
  private readonly folderId: string | undefined;

  constructor(config: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      keyFile: config.get<string>('GOOGLE_CREDENTIALS_FILE', 'google-credentials.json'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth });
    this.folderId = config.get<string>('GOOGLE_DRIVE_PROTOCOLS_FOLDER_ID')?.trim() || undefined;
  }

  async upload(file: { buffer: Buffer; mimetype: string }, name: string): Promise<string> {
    if (!this.folderId) {
      throw new ServiceUnavailableException('Folder na protokoły (Google Drive) nie jest skonfigurowany');
    }
    try {
      const res = await this.drive.files.create({
        requestBody: { name, parents: [this.folderId] },
        media: { mimeType: file.mimetype, body: Readable.from(file.buffer) },
        fields: 'id',
        supportsAllDrives: true,
      });
      if (!res.data.id) throw new Error('Drive returned no file id');
      return res.data.id;
    } catch (error) {
      const message = (error as Error).message ?? String(error);
      this.logger.error(`Protocol upload failed: ${message}`);
      if (message.includes('storage quota')) {
        throw new ServiceUnavailableException(
          'Nie można zapisać protokołu: folder na Google Drive musi znajdować się na Dysku współdzielonym',
        );
      }
      throw new ServiceUnavailableException('Nie udało się zapisać protokołu na Google Drive');
    }
  }

  async download(fileId: string): Promise<Readable> {
    const res = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' },
    );
    return res.data as unknown as Readable;
  }

  /**
   * Best effort, moves the file to the Drive trash (a content manager cannot delete for good).
   * Used when saving the invoice fails after the upload and when an invoice is deleted.
   */
  async remove(fileId: string): Promise<void> {
    try {
      await this.drive.files.update({ fileId, requestBody: { trashed: true }, supportsAllDrives: true });
    } catch (error) {
      this.logger.warn(`Could not remove protocol ${fileId}: ${(error as Error).message}`);
    }
  }
}
