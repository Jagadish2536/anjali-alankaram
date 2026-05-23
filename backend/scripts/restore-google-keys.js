const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function restoreKeys() {
  try {
    console.log("Restoring backend keys...");
    const backendData = await secretsManager.getSecretValue({ SecretId: 'anjali-alankaram-backend-env' }).promise();
    const backendEnv = JSON.parse(backendData.SecretString);
    
    const oldBackendData = await secretsManager.getSecretValue({ 
      SecretId: 'anjali-alankaram-backend-env', 
      VersionId: 'fece4cd5-39b7-4ba3-8ed2-5b5e36fa6587' 
    }).promise();
    const oldBackendEnv = JSON.parse(oldBackendData.SecretString);
    
    backendEnv['GOOGLE_CLIENT_ID'] = oldBackendEnv['GOOGLE_CLIENT_ID'];
    backendEnv['AWS_ACCESS_KEY_ID'] = oldBackendEnv['AWS_ACCESS_KEY_ID'];
    backendEnv['AWS_SECRET_ACCESS_KEY'] = oldBackendEnv['AWS_SECRET_ACCESS_KEY'];
    
    await secretsManager.putSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      SecretString: JSON.stringify(backendEnv)
    }).promise();
    console.log("Successfully restored backend GOOGLE_CLIENT_ID and AWS keys!");

    console.log("Restoring frontend keys...");
    const frontendData = await secretsManager.getSecretValue({ SecretId: 'anjali-alankaram-frontend-env' }).promise();
    const frontendEnv = JSON.parse(frontendData.SecretString);

    const oldFrontendData = await secretsManager.getSecretValue({ 
      SecretId: 'anjali-alankaram-frontend-env', 
      VersionId: 'd9be7368-5bef-4dd5-ba25-dd73db039d7d' 
    }).promise();
    const oldFrontendEnv = JSON.parse(oldFrontendData.SecretString);

    frontendEnv['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = oldFrontendEnv['NEXT_PUBLIC_GOOGLE_CLIENT_ID'];
    
    // Also restore NEXT_PUBLIC_API_URL just in case it was a placeholder
    frontendEnv['NEXT_PUBLIC_API_URL'] = oldFrontendEnv['NEXT_PUBLIC_API_URL'];

    await secretsManager.putSecretValue({
      SecretId: 'anjali-alankaram-frontend-env',
      SecretString: JSON.stringify(frontendEnv)
    }).promise();
    console.log("Successfully restored frontend NEXT_PUBLIC_GOOGLE_CLIENT_ID!");

  } catch (e) {
    console.error(e);
  }
}

restoreKeys();
