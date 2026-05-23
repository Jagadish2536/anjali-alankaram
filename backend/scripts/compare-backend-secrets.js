const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function compareSecrets() {
  try {
    // Current live state
    const currentData = await secretsManager.getSecretValue({ SecretId: 'anjali-alankaram-backend-env' }).promise();
    const currentEnv = JSON.parse(currentData.SecretString);

    // Pristine state from 16:46 IST today (right after user added AWS keys)
    const pristineData = await secretsManager.getSecretValue({ 
      SecretId: 'anjali-alankaram-backend-env', 
      VersionId: '27cfa736-b354-4952-a3a0-e7464e08cb4f' 
    }).promise();
    const pristineEnv = JSON.parse(pristineData.SecretString);

    let differencesFound = false;

    // Check what is missing or different in CURRENT compared to PRISTINE
    for (const key of Object.keys(pristineEnv)) {
      if (!(key in currentEnv)) {
        console.log(`[MISSING IN CURRENT]: ${key} was ${pristineEnv[key]} but is completely missing now.`);
        differencesFound = true;
      } else if (currentEnv[key] !== pristineEnv[key]) {
        console.log(`[DIFFERENT]: ${key}`);
        console.log(`  Pristine: ${pristineEnv[key]}`);
        console.log(`  Current : ${currentEnv[key]}`);
        differencesFound = true;
      }
    }

    // Check if there's anything NEW in CURRENT that wasn't in PRISTINE
    for (const key of Object.keys(currentEnv)) {
      if (!(key in pristineEnv)) {
        console.log(`[NEW IN CURRENT]: ${key} = ${currentEnv[key]} (This wasn't in the pristine snapshot)`);
        differencesFound = true;
      }
    }

    if (!differencesFound) {
      console.log("SUCCESS: The current backend Secrets Manager perfectly matches the pristine state!");
    } else {
      console.log("ATTENTION: Found differences between current and pristine state. Preparing to fix...");
      
      // We will merge pristine into current, keeping the new keys but fixing the different/missing ones
      for (const key of Object.keys(pristineEnv)) {
        currentEnv[key] = pristineEnv[key];
      }
      
      await secretsManager.putSecretValue({
        SecretId: 'anjali-alankaram-backend-env',
        SecretString: JSON.stringify(currentEnv)
      }).promise();
      
      console.log("FIXED: Successfully restored all missing/modified backend keys from the pristine snapshot!");
    }

  } catch (e) {
    console.error(e);
  }
}

compareSecrets();
