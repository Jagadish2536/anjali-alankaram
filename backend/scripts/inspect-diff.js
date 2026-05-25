const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function compareSecrets(secretId, currentVersionId, previousVersionId) {
  try {
    console.log(`\n=== Comparing secret ${secretId} ===`);
    const currentData = await secretsManager.getSecretValue({ SecretId: secretId, VersionId: currentVersionId }).promise();
    const previousData = await secretsManager.getSecretValue({ SecretId: secretId, VersionId: previousVersionId }).promise();

    const currentEnv = JSON.parse(currentData.SecretString);
    const previousEnv = JSON.parse(previousData.SecretString);

    console.log("Keys in Previous but not in Current:");
    for (const key of Object.keys(previousEnv)) {
      if (!(key in currentEnv)) {
        console.log(`  - ${key}`);
      }
    }

    console.log("\nKeys in Current but not in Previous:");
    for (const key of Object.keys(currentEnv)) {
      if (!(key in previousEnv)) {
        console.log(`  - ${key}`);
      }
    }

    console.log("\nValue Differences (Previous -> Current):");
    for (const key of Object.keys(previousEnv)) {
      if (key in currentEnv && previousEnv[key] !== currentEnv[key]) {
        // Mask values for privacy/security, but show if they are placeholder vs real
        const isPrevPlaceholder = previousEnv[key].includes('your_') || previousEnv[key].includes('super-secret') || previousEnv[key].includes('localhost');
        const isCurrPlaceholder = currentEnv[key].includes('your_') || currentEnv[key].includes('super-secret') || currentEnv[key].includes('localhost');
        console.log(`  ${key}:`);
        console.log(`    Previous: ${isPrevPlaceholder ? '[PLACEHOLDER]' : '[REAL VALUE]'} (${previousEnv[key].substring(0, 8)}...)`);
        console.log(`    Current:  ${isCurrPlaceholder ? '[PLACEHOLDER]' : '[REAL VALUE]'} (${currentEnv[key].substring(0, 8)}...)`);
      }
    }
  } catch (err) {
    console.error(`Error comparing ${secretId}:`, err.message);
  }
}

async function main() {
  await compareSecrets('anjali-alankaram-backend-env', '72b64824-9a6b-4e3c-ba34-4c51f02decc8', '44977aa5-f8c9-488f-96c2-e79366aa3468');
  await compareSecrets('anjali-alankaram-frontend-env', '8ccb9c23-879f-4e6b-9472-e5a655acec1c', '6d942e1a-8f7e-456d-bd1d-a36ac72631d2');
}

main();
