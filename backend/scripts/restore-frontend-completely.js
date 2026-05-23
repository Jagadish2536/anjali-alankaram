const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function restoreFrontend() {
  try {
    const oldFrontendData = await secretsManager.getSecretValue({
      SecretId: 'anjali-alankaram-frontend-env',
      VersionId: '5899481f-37ec-444a-8776-e7b266a22c23' // May 16th pristine version
    }).promise();
    
    // Completely overwrite current with the pristine May 16th version
    await secretsManager.putSecretValue({
      SecretId: 'anjali-alankaram-frontend-env',
      SecretString: oldFrontendData.SecretString
    }).promise();
    
    console.log("Successfully restored ENTIRE frontend secret to the pristine May 16th state!");
  } catch (e) {
    console.error(e);
  }
}
restoreFrontend();
