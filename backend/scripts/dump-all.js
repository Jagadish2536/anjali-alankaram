const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function dump() {
  const data = await secretsManager.getSecretValue({
    SecretId: 'anjali-alankaram-backend-env',
    VersionId: '405bda00-7a6d-41e4-bcba-c7e9b0e8d80e' // May 16
  }).promise();
  
  const env = JSON.parse(data.SecretString);
  console.log("May 16 Backend Keys:", env);
}
dump();
