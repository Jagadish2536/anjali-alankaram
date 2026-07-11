const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const REGION = 'ap-south-2';
const PROJECT_NAME = 'anjali-alankaram';

const secretsManager = new AWS.SecretsManager({ region: REGION });

const backupDir = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function getSecret(secretName) {
  try {
    const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
    if ('SecretString' in data) {
      return JSON.parse(data.SecretString);
    }
  } catch (error) {
    console.error(`❌ Failed to fetch secret ${secretName}:`, error.message);
  }
  return null;
}

async function main() {
  console.log('Starting AWS Secrets Manager backup...');

  // 1. Backend Secrets
  const backendSecretName = `${PROJECT_NAME}-backend-env`;
  console.log(`Fetching ${backendSecretName}...`);
  const backendSecrets = await getSecret(backendSecretName);
  if (backendSecrets) {
    const outputPath = path.join(backupDir, 'aws_secrets_backend_backup.json');
    fs.writeFileSync(outputPath, JSON.stringify(backendSecrets, null, 2));
    console.log(`✅ Saved backend secrets to: ${outputPath}`);
  }

  // 2. Frontend Secrets
  const frontendSecretName = `${PROJECT_NAME}-frontend-env`;
  console.log(`Fetching ${frontendSecretName}...`);
  const frontendSecrets = await getSecret(frontendSecretName);
  if (frontendSecrets) {
    const outputPath = path.join(backupDir, 'aws_secrets_frontend_backup.json');
    fs.writeFileSync(outputPath, JSON.stringify(frontendSecrets, null, 2));
    console.log(`✅ Saved frontend secrets to: ${outputPath}`);
  }

  console.log('\nAWS Secrets Manager backup complete!');
}

main().catch(console.error);
