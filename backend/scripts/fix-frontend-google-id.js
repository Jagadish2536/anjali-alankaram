const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function fix() {
  try {
    const frontendData = await secretsManager.getSecretValue({ SecretId: 'anjali-alankaram-frontend-env' }).promise();
    const frontendEnv = JSON.parse(frontendData.SecretString);

    const oldFrontendData = await secretsManager.getSecretValue({ 
      SecretId: 'anjali-alankaram-frontend-env', 
      VersionId: '5899481f-37ec-444a-8776-e7b266a22c23' 
    }).promise();
    const oldFrontendEnv = JSON.parse(oldFrontendData.SecretString);

    frontendEnv['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = oldFrontendEnv['NEXT_PUBLIC_GOOGLE_CLIENT_ID'];

    await secretsManager.putSecretValue({
      SecretId: 'anjali-alankaram-frontend-env',
      SecretString: JSON.stringify(frontendEnv)
    }).promise();
    console.log("Successfully restored frontend NEXT_PUBLIC_GOOGLE_CLIENT_ID from May 16!");
  } catch (e) {
    console.error(e);
  }
}

fix();
