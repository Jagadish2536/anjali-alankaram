const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function view() {
  try {
    const oldData = await secretsManager.getSecretValue({ 
      SecretId: 'anjali-alankaram-backend-env', 
      VersionId: 'fece4cd5-39b7-4ba3-8ed2-5b5e36fa6587' 
    }).promise();
    const oldEnv = JSON.parse(oldData.SecretString);
    console.log('Old backend keys:', Object.keys(oldEnv));
    console.log('GOOGLE_CLIENT_ID:', oldEnv['GOOGLE_CLIENT_ID']);
    console.log('AWS_ACCESS_KEY_ID:', oldEnv['AWS_ACCESS_KEY_ID']);
    console.log('AWS_SECRET_ACCESS_KEY:', oldEnv['AWS_SECRET_ACCESS_KEY']);

    const oldFrontendData = await secretsManager.getSecretValue({ 
      SecretId: 'anjali-alankaram-frontend-env' 
    }).promise();
    const oldFrontendEnv = JSON.parse(oldFrontendData.SecretString);
    console.log('Old frontend keys:', Object.keys(oldFrontendEnv));
  } catch (e) {
    console.error(e);
  }
}

view();
