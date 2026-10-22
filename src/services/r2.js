const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../../config');

let client = null;
function getClient() {
  if (!config.r2.endpoint) return null;
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return client;
}

function isConfigured() { return !!getClient(); }

async function presignUpload(key, contentType, expiresIn) {
  const s3 = getClient();
  if (!s3) throw new Error('R2 not configured');
  const cmd = new PutObjectCommand({
    Bucket: config.r2.bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresIn || 900 });
}

async function presignDownload(key, expiresIn, filename) {
  const s3 = getClient();
  if (!s3) throw new Error('R2 not configured');
  const input = { Bucket: config.r2.bucket, Key: key };
  if (filename) input.ResponseContentDisposition = 'attachment; filename="' + filename + '"';
  const cmd = new GetObjectCommand(input);
  return getSignedUrl(s3, cmd, { expiresIn: expiresIn || 3600 });
}

async function deleteObject(key) {
  const s3 = getClient();
  if (!s3) throw new Error('R2 not configured');
  await s3.send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
}

function publicUrl(key) {
  if (!config.r2.publicUrl) return null;
  return config.r2.publicUrl.replace(/\/$/, '') + '/' + key;
}

module.exports = {
  isConfigured: isConfigured,
  presignUpload: presignUpload,
  presignDownload: presignDownload,
  deleteObject: deleteObject,
  publicUrl: publicUrl,
};
