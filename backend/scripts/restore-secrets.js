const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function restore() {
  try {
    const secretId = 'anjali-alankaram-backend-env';
    
    // Get the current version
    const currentData = await secretsManager.getSecretValue({ SecretId: secretId }).promise();
    const currentEnv = JSON.parse(currentData.SecretString);
    
    // Get the version from before we messed up (10:55 AM)
    const oldData = await secretsManager.getSecretValue({ 
      SecretId: secretId, 
      VersionId: 'fece4cd5-39b7-4ba3-8ed2-5b5e36fa6587' 
    }).promise();
    const oldEnv = JSON.parse(oldData.SecretString);

    let restoredCount = 0;
    // Iterate over the old keys. If they don't exist in the current keys, restore them!
    for (const key of Object.keys(oldEnv)) {
      if (!(key in currentEnv) || currentEnv[key] === '') {
        // Only restore if we don't have a value for it, but exclude AWS explicit keys
        if (key !== 'AWS_ACCESS_KEY_ID' && key !== 'AWS_SECRET_ACCESS_KEY') {
          currentEnv[key] = oldEnv[key];
          restoredCount++;
          console.log(`Restored key: ${key}`);
        }
      }
    }

    if (restoredCount > 0) {
      await secretsManager.putSecretValue({
        SecretId: secretId,
        SecretString: JSON.stringify(currentEnv)
      }).promise();
      console.log(`Successfully restored ${restoredCount} deleted keys from the previous version!`);
    } else {
      console.log('No keys were missing, everything is intact.');
    }
  } catch (e) {
    console.error(e);
  }
}

restore();
