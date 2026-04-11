const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function buildUploadUrl(req, fileName) {
  return `${req.protocol}://${req.get('host')}/uploads/${fileName}`;
}

function saveBase64Upload({ req, fileData, fileName, fallbackName }) {
  const match = String(fileData || '').match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    const error = new Error('Uploaded file format is invalid');
    error.statusCode = 400;
    throw error;
  }

  ensureUploadsDir();
  const mimeType = match[1];
  const extension = path.extname(fileName || '') ||
    (mimeType.includes('pdf') ? '.pdf' :
      mimeType.includes('sheet') ? '.xlsx' :
        mimeType.includes('word') ? '.docx' :
          mimeType.includes('png') ? '.png' :
            mimeType.includes('jpeg') ? '.jpg' :
              '.bin');
  const safeBaseName = (fallbackName || 'upload').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'upload';
  const storedFileName = `${safeBaseName}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  const fileBuffer = Buffer.from(match[2], 'base64');
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
