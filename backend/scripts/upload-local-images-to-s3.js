const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'ap-south-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});


const BUCKET = 'anjali-alankaram-assets-716403252967';
const LOCAL_DIR = path.join(__dirname, '../uploads/products');

async function uploadFiles() {
  if (!fs.existsSync(LOCAL_DIR)) {
    console.log('No local uploads directory found.');
    return;
  }

  const files = fs.readdirSync(LOCAL_DIR);
  console.log(`Found ${files.length} local images to upload.`);

  for (const file of files) {
    const filePath = path.join(LOCAL_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    const s3Key = `products/${file}`;

    console.log(`Uploading ${file} -> s3://${BUCKET}/${s3Key}...`);

    await s3
      .putObject({
        Bucket: BUCKET,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'image/jpeg',
      })
      .promise();

    const publicUrl = `https://${BUCKET}.s3.ap-south-2.amazonaws.com/${s3Key}`;
    console.log(`✅ Uploaded: ${publicUrl}`);
  }
}

uploadFiles().catch(console.error);
