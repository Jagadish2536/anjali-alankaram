const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function dumpSecretVersions(secretId) {
  try {
    console.log(`\n=== All Versions for ${secretId} ===`);
    const data = await secretsManager.listSecretVersionIds({ SecretId: secretId }).promise();
    for (const v of data.Versions) {
      console.log(`\nVersionId: ${v.VersionId} | Created: ${v.CreatedDate} | Stages: ${v.VersionStages.join(', ')}`);
      try {
        const secretVal = await secretsManager.getSecretValue({ SecretId: secretId, VersionId: v.VersionId }).promise();
        const env = JSON.parse(secretVal.SecretString);
        console.log("Keys and value preview:");
        for (const [key, value] of Object.entries(env)) {
          const isPlaceholder = value.includes('your_') || value.includes('super-secret') || value.includes('localhost');
          console.log(`  - ${key}: ${isPlaceholder ? '[PLACEHOLDER]' : '[REAL VALUE]'} (${value.substring(0, 15)}...)`);
        }
      } catch (err) {
        console.log(`  Could not retrieve value: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`Error listing versions for ${secretId}:`, err.message);
  }
}

async function main() {
  await dumpSecretVersions('anjali-alankaram-backend-env');
  await dumpSecretVersions('anjali-alankaram-frontend-env');
}

main();
