import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { promises as fs, createReadStream } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

/**
 * Object storage with two backends:
 *  - S3 / S3-compatible (R2, MinIO) when S3_* env is set → presigned URLs.
 *  - Local disk fallback (dev) → files streamed through the API.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3?: S3Client;
  private readonly bucket: string;
  private readonly uploadDir: string;

  constructor(private config: ConfigService) {
    this.bucket = config.get<string>('s3.bucket') ?? '';
    this.uploadDir = config.get<string>('uploadDir') ?? 'uploads';
    if (config.get<boolean>('s3.enabled')) {
      const endpoint = config.get<string>('s3.endpoint') || undefined;
      this.s3 = new S3Client({
        region: config.get<string>('s3.region') || 'auto',
        endpoint,
        forcePathStyle: !!endpoint,
        credentials: {
          accessKeyId: config.get<string>('s3.accessKeyId')!,
          secretAccessKey: config.get<string>('s3.secretAccessKey')!,
        },
      });
      this.logger.log('Storage backend: S3');
    } else {
      this.logger.log(`Storage backend: local disk (${this.uploadDir})`);
    }
  }

  get usingS3(): boolean {
    return !!this.s3;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.s3) {
      await this.s3.send(
        new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
      );
      return;
    }
    const full = path.join(this.uploadDir, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  /** S3: a time-limited presigned GET URL. Local: throws (use streamLocal). */
  async presignedGet(key: string, filename: string): Promise<string> {
    if (!this.s3) throw new Error('presignedGet is only available with S3 backend');
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `inline; filename="${encodeURIComponent(filename)}"`,
    });
    return getSignedUrl(this.s3, cmd, { expiresIn: 3600 });
  }

  streamLocal(key: string): Readable {
    return createReadStream(path.join(this.uploadDir, key));
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.s3) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } else {
        await fs.unlink(path.join(this.uploadDir, key));
      }
    } catch (e) {
      this.logger.warn(`Failed to delete ${key}: ${(e as Error).message}`);
    }
  }
}
