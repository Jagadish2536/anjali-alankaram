const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function printMay16() {
  try {
    const data = await secretsManager.getSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      VersionId: '405bda00-7a6d-41e4-bcba-c7e9b0e8d80e'
    }).promise();
    const env = JSON.parse(data.SecretString);
    console.log("JWT_SECRET:", env.JWT_SECRET);
    console.log("GOOGLE_CLIENT_ID:", env.GOOGLE_CLIENT_ID);
    console.log("ALLOWED_ORIGINS:", env.ALLOWED_ORIGINS);
  } catch (err) {
    console.error(err);
  }
}

printMay16();
