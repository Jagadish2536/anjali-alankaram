const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function listVersions(secretId) {
  try {
    console.log(`\n--- Versions for ${secretId} ---`);
    const data = await secretsManager.listSecretVersionIds({ SecretId: secretId }).promise();
    data.Versions.forEach(v => {
      console.log(`VersionId: ${v.VersionId}`);
      console.log(`  Created: ${v.CreatedDate}`);
      console.log(`  Stages:  ${v.VersionStages.join(', ')}`);
    });
  } catch (err) {
    console.error(`Error listing versions for ${secretId}:`, err.message);
  }
}

async function main() {
  await listVersions('anjali-alankaram-backend-env');
  await listVersions('anjali-alankaram-frontend-env');
}

main();
