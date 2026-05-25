const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function checkMay16() {
  try {
    const data = await secretsManager.getSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      VersionId: '405bda00-7a6d-41e4-bcba-c7e9b0e8d80e'
    }).promise();
    const env = JSON.parse(data.SecretString);
    console.log("=== May 16 Baseline Secret ===");
    for (const [key, value] of Object.entries(env)) {
      const isPlaceholder = value.includes('your_') || value.includes('super-secret') || value.includes('localhost');
      console.log(`  - ${key}: ${isPlaceholder ? '[PLACEHOLDER]' : '[REAL VALUE]'} (${value.substring(0, 15)}...)`);
    }
  } catch (err) {
    console.error("Error retrieving May 16 version:", err.message);
  }
}

checkMay16();
