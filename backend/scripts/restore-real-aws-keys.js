const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function restoreAWSKeys() {
  try {
    const backendData = await secretsManager.getSecretValue({ SecretId: 'anjali-alankaram-backend-env' }).promise();
    const backendEnv = JSON.parse(backendData.SecretString);
    
    // The exact version where the real keys were found
    const targetVersionId = '27cfa736-b354-4952-a3a0-e7464e08cb4f';
    const oldBackendData = await secretsManager.getSecretValue({ 
      SecretId: 'anjali-alankaram-backend-env', 
      VersionId: targetVersionId 
    }).promise();
    const oldBackendEnv = JSON.parse(oldBackendData.SecretString);
    
    backendEnv['AWS_ACCESS_KEY_ID'] = oldBackendEnv['AWS_ACCESS_KEY_ID'];
    backendEnv['AWS_SECRET_ACCESS_KEY'] = oldBackendEnv['AWS_SECRET_ACCESS_KEY'];
    
    await secretsManager.putSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      SecretString: JSON.stringify(backendEnv)
    }).promise();
    console.log("Successfully restored real AWS keys to the backend Secrets Manager!");
  } catch (e) {
    console.error(e);
  }
}

restoreAWSKeys();
