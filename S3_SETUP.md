# AWS S3 Setup for Contextor

This document explains how to set up AWS S3 for storing screenshots and audio recordings.

## Environment Variables

Add the following environment variables to your `.env` file:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name
```

## AWS S3 Setup Steps

1. **Create an S3 Bucket**
   - Log in to the AWS Console
   - Navigate to S3
   - Create a new bucket with a unique name
   - Choose your preferred region (e.g., `us-east-1`)

2. **Configure Bucket Permissions**
   - Set bucket policy to allow public read access for uploaded files
   - Enable CORS if needed for web access

3. **Create IAM User**
   - Go to IAM console
   - Create a new user for the application
   - Attach the following permissions:
     - `s3:PutObject`
     - `s3:PutObjectAcl`
     - `s3:GetObject` (optional, for verification)

4. **Generate Access Keys**
   - Create access keys for the IAM user
   - Copy the Access Key ID and Secret Access Key
   - Add them to your `.env` file

## S3 Bucket Policy Example

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

## File Structure

The application will upload files with the following structure:
- Screenshots: `screenshots/YYYY-MM-DDTHH-mm-ss-sssZ-uuid.png`
- Audio files: `audio/YYYY-MM-DDTHH-mm-ss-sssZ-uuid.m4a`

## Security Notes

- Keep your AWS credentials secure
- Use environment variables, never commit credentials to code
- Consider using IAM roles instead of access keys in production
- Regularly rotate access keys
- Monitor S3 usage and costs

## Troubleshooting

- Ensure your AWS credentials have the correct permissions
- Check that the bucket name is globally unique
- Verify the region matches your bucket's region
- Check CloudWatch logs for detailed error messages 