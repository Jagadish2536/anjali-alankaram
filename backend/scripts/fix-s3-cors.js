const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-2',
});

async function fixCors() {
  const bucket = process.env.AWS_S3_BUCKET || 'anjali-alankaram-assets-716403252967';
  console.log(`Setting CORS configuration on S3 bucket: ${bucket}...`);

  const corsParams = {
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'HEAD'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag', 'Content-Type', 'Content-Length', 'Access-Control-Allow-Origin'],
          MaxAgeSeconds: 86400,
        },
      ],
    },
  };

  try {
    await s3.putBucketCors(corsParams).promise();
    console.log('✅ Successfully applied CORS policy to S3 bucket!');
  } catch (err) {
    console.error('❌ Failed to update S3 CORS policy:', err.message);
  }
}

fixCors();
