const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function dumpFrontend() {
  const data = await secretsManager.getSecretValue({
    SecretId: 'anjali-alankaram-frontend-env',
    VersionId: '5899481f-37ec-444a-8776-e7b266a22c23' // May 16th version
  }).promise();
  
  const env = JSON.parse(data.SecretString);
  console.log("May 16 Frontend Keys:", env);
}
dumpFrontend();
