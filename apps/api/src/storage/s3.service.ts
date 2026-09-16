import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly defaultBucketName = process.env.S3_BUCKET_NAME || 'reports';

  constructor() {
    this.s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true, // Necessary for MinIO
    });
  }

  async uploadPdf(key: string, pdfBuffer: Buffer | Uint8Array): Promise<string> {
    const bucket = this.defaultBucketName;
    try {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
      } catch (e: any) {
        // BucketAlreadyExists or BucketAlreadyOwnedByYou are fine
      }
      this.logger.log(`Uploading ${key} to bucket ${bucket}...`);
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
        })
      );
      this.logger.log(`Upload successful for ${key}`);
      return bucket;
    } catch (err: any) {
      this.logger.error(`S3 Upload failed: ${err.message}`);
      throw new Error(`S3 Upload failed: ${err.message}`);
    }
  }

  async getPresignedUrl(key: string, bucket: string = this.defaultBucketName): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      // URL expires in 1 hour
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return url;
    } catch (err: any) {
      this.logger.error(`Failed to generate presigned URL: ${err.message}`);
      throw new Error(`Failed to generate presigned URL: ${err.message}`);
    }
  }
}
