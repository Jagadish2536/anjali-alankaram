const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configuration
const REGION = 'ap-south-2'; 
const PROJECT_NAME = 'anjali-alankaram';

// Initialize AWS Secrets Manager
const secretsManager = new AWS.SecretsManager({ region: REGION });

function writeEnvFile(filePath, envVars) {
  let content = '';
  
  // Try to preserve existing comments or non-secret lines if the file exists
  if (fs.existsSync(filePath)) {
    const existingContent = fs.readFileSync(filePath, 'utf-8');
    existingContent.split('\n').forEach(line => {
      // Keep comments and empty lines
      if (!line || line.trim().startsWith('#')) {
        content += line + '\n';
      }
    });
  }

  // Append the fetched secrets
  for (const [key, value] of Object.entries(envVars)) {
    // Quote the value if it has spaces or special characters, otherwise leave as is
    const safeValue = value.includes(' ') || value.includes('#') ? `"${value}"` : value;
    content += `${key}=${safeValue}\n`;
  }

  fs.writeFileSync(filePath, content.trim() + '\n');
}

async function fetchSecret(secretName) {
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
  console.log('Starting secrets pull...');

  // 1. Pull Backend
  const backendSecretName = `${PROJECT_NAME}-backend-env`;
  console.log(`\nFetching Backend (${backendSecretName} -> .env)`);
  const backendEnv = await fetchSecret(backendSecretName);
  
  if (backendEnv) {
    const backendEnvPath = path.join(__dirname, '..', '.env');
    writeEnvFile(backendEnvPath, backendEnv);
    console.log(`✅ Successfully updated backend .env`);
  }

  // 2. Pull Frontend
  const frontendSecretName = `${PROJECT_NAME}-frontend-env`;
  console.log(`\nFetching Frontend (${frontendSecretName} -> .env.local)`);
  const frontendEnv = await fetchSecret(frontendSecretName);

  if (frontendEnv) {
    const frontendEnvPath = path.join(__dirname, '..', '..', 'frontend', '.env.local');
    writeEnvFile(frontendEnvPath, frontendEnv);
    console.log(`✅ Successfully updated frontend .env.local`);
  }

  console.log('\nPull complete!');
}

main().catch(console.error);
