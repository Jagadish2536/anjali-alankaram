const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function listAllFrontendVersions() {
  try {
    console.log("Listing all versions for anjali-alankaram-frontend-env...");
    const data = await secretsManager.listSecretVersionIds({ SecretId: 'anjali-alankaram-frontend-env' }).promise();
    console.log(`Found ${data.Versions.length} versions.`);
    for (const v of data.Versions) {
      console.log(`Version: ${v.VersionId} | Created: ${v.CreatedDate}`);
      try {
        const val = await secretsManager.getSecretValue({
          SecretId: 'anjali-alankaram-frontend-env',
          VersionId: v.VersionId
        }).promise();
        const env = JSON.parse(val.SecretString);
        for (const [key, value] of Object.entries(env)) {
          const isPlaceholder = value.includes('your_') || value.includes('super-secret') || value.includes('localhost');
          console.log(`  - ${key}: ${isPlaceholder ? '[PLACEHOLDER]' : '[REAL VALUE]'} (${value.substring(0, 20)}...)`);
        }
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

listAllFrontendVersions();
