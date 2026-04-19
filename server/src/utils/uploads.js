const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const storageProvider = String(process.env.STORAGE_PROVIDER || 'local').toLowerCase();

function getStorageRegion() {
  return process.env.STORAGE_AWS_REGION || process.env.AWS_REGION || 'auto';
}

function getStorageEndpoint() {
  return process.env.STORAGE_S3_ENDPOINT || process.env.S3_ENDPOINT || process.env.R2_ENDPOINT;
}

function getStorageCredentials() {
  const accessKeyId = process.env.STORAGE_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }
  return { accessKeyId, secretAccessKey };
}

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function buildS3CompatibleClient() {
  return new S3Client({
    region: getStorageRegion(),
    endpoint: getStorageEndpoint(),
    credentials: getStorageCredentials(),
    forcePathStyle: false
  });
}

function buildUploadUrl(req, fileName) {
  if (storageProvider !== 'local' && process.env.STORAGE_PUBLIC_BASE_URL) {
    return `${process.env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, '')}/${fileName}`;
  }
  return `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
}

function inferExtension(mimeType, fileName) {
  return path.extname(fileName || '') ||
    (mimeType.includes('pdf') ? '.pdf' :
      mimeType.includes('sheet') ? '.xlsx' :
        mimeType.includes('word') ? '.docx' :
          mimeType.includes('png') ? '.png' :
            mimeType.includes('jpeg') ? '.jpg' :
              '.bin');
}

function buildStoredFileName({ fallbackName, fileName, mimeType, folder = '' }) {
  const extension = inferExtension(mimeType, fileName);
  const safeBaseName = (fallbackName || 'upload').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'upload';
  const prefix = folder ? `${folder.replace(/^\/+|\/+$/g, '')}/` : '';
  return `${prefix}${safeBaseName}-${crypto.randomBytes(6).toString('hex')}${extension}`;
}

async function saveBase64Upload({ req, fileData, fileName, fallbackName, folder }) {
  const match = String(fileData || '').match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    const error = new Error('Uploaded file format is invalid');
    error.statusCode = 400;
    throw error;
  }

  const mimeType = match[1];
  const storedFileName = buildStoredFileName({ fallbackName, fileName, mimeType, folder });
  const fileBuffer = Buffer.from(match[2], 'base64');

  if (storageProvider !== 'local') {
    const bucket = process.env.STORAGE_BUCKET || process.env.R2_BUCKET || process.env.S3_BUCKET;
    if (!bucket) {
      const error = new Error('Cloud storage bucket is not configured');
      error.statusCode = 500;
      throw error;
    }

    const client = buildS3CompatibleClient();
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: storedFileName,
      Body: fileBuffer,
      ContentType: mimeType
    }));

    return {
      storedFileName,
      url: buildUploadUrl(req, storedFileName)
    };
  }

  ensureUploadsDir();
  fs.writeFileSync(path.join(uploadsDir, storedFileName), fileBuffer);
  return {
    storedFileName,
    url: buildUploadUrl(req, storedFileName)
  };
}

module.exports = {
  ensureUploadsDir,
  buildUploadUrl,
  saveBase64Upload
};
