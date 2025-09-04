import { desktopCapturer, screen, BrowserWindow } from 'electron';

// ============================================================================
// SCREENSHOT SERVICE
// ============================================================================

export interface ScreenshotResult {
  buffer: Buffer;
  messageId: string;
  screenshotUrl: string;
}

export class ScreenshotService {
  private readonly baseUrl = 'https://contextor-api-c1cb32489441.herokuapp.com';

  // --------------------------------------------------------------------------
  // PUBLIC METHODS
  // --------------------------------------------------------------------------

  async takeScreenshot(window: BrowserWindow, token: string, conversationId: string): Promise<ScreenshotResult | null> {
    try {
      const buffer = await this.captureScreen();
      if (!buffer) return null;

      const uploadResult = await this.uploadToS3Directly(buffer, token, conversationId);
      if (!uploadResult) return null;

      return { 
        buffer, 
        messageId: uploadResult.messageId,
        screenshotUrl: uploadResult.screenshotUrl
      };
    } catch (error) {
      console.error('Screenshot process failed:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private async captureScreen(): Promise<Buffer | null> {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;
      console.log('Screen size:', { width, height });

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height },
        fetchWindowIcons: false
      });

      if (sources.length === 0) {
        console.error('No screen sources found');
        return null;
      }

      const screenSource = sources[0];
      console.log('Capturing display:', screenSource.name);

      const image = screenSource.thumbnail;
      const size = image.getSize();
      console.log('Image size:', size);

      if (size.width === 0 || size.height === 0) {
        console.error('Invalid image size:', size);
        return null;
      }

      const buffer = image.toPNG();
      if (buffer.length === 0) {
        console.error('Generated buffer is empty');
        return null;
      }

      console.log('Buffer size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('Failed to capture screen:', error);
      return null;
    }
  }

  private async uploadToS3Directly(buffer: Buffer, token: string, conversationId: string): Promise<{ messageId: string; screenshotUrl: string } | null> {
    try {
      // Step 1: Get pre-signed URL from API
      console.log('Getting pre-signed URL...');
      const presignedResponse = await fetch(`${this.baseUrl}/conversations/${conversationId}/messages/get_screenshot_upload_url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!presignedResponse.ok) {
        console.error('Failed to get pre-signed URL:', presignedResponse.statusText);
        return null;
      }

      const presignedData = await presignedResponse.json();
      const { upload_url, filename } = presignedData;

      // Step 2: Upload directly to S3 using pre-signed URL
      console.log('Uploading to S3...');
      const s3Response = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png',
        },
        body: buffer,
      });

      if (!s3Response.ok) {
        console.error('Failed to upload to S3:', s3Response.statusText);
        return null;
      }

      // Step 3: Create message with S3 URL
      console.log('Creating message with S3 URL...');
      const s3Url = `https://${process.env.AWS_S3_BUCKET || 'contextor-api'}.s3.amazonaws.com/${filename}`;
      
      const messageResponse = await fetch(`${this.baseUrl}/conversations/${conversationId}/messages/create_screenshot_from_s3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          screenshot_url: s3Url
        }),
      });

      if (!messageResponse.ok) {
        console.error('Failed to create message:', messageResponse.statusText);
        return null;
      }

      const messageData = await messageResponse.json();
      const messageId = messageData.data.id;
      
      console.log('Screenshot uploaded successfully, message ID:', messageId);
      console.log('Screenshot URL:', s3Url);
      
      return { messageId, screenshotUrl: s3Url };
    } catch (error) {
      console.error('Failed to upload screenshot to S3:', error);
      return null;
    }
  }
} 