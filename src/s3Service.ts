import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface S3UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadScreenshotToS3(buffer: Buffer): Promise<S3UploadResult> {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueId = uuidv4();
    const fileName = `screenshots/${timestamp}-${uniqueId}.png`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: 'image/png',
      ContentDisposition: 'inline',
    });

    await s3Client.send(command);

    // Construct the public URL
    const url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;

    console.log('Screenshot uploaded to S3:', url);
    return { success: true, url };
  } catch (error) {
    console.error('Failed to upload screenshot to S3:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

export async function uploadAudioToS3(buffer: Buffer, fileExtension: string = 'm4a'): Promise<S3UploadResult> {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
    }

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueId = uuidv4();
    const fileName = `audio/${timestamp}-${uniqueId}.${fileExtension}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: `audio/${fileExtension}`,
      ContentDisposition: 'inline',
    });

    await s3Client.send(command);

    // Construct the public URL
    const url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;

    console.log('Audio uploaded to S3:', url);
    return { success: true, url };
  } catch (error) {
    console.error('Failed to upload audio to S3:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
} 