const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configuration
const REGION = 'ap-south-2'; 
const PROJECT_NAME = 'anjali-alankaram'; 

// Initialize AWS Secrets Manager
const secretsManager = new AWS.SecretsManager({ region: REGION });

// Helper to parse .env file
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: File not found - ${filePath}`);
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  
  content.split('\n').forEach((line) => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) return;
    
    const [key, ...rest] = line.split('=');
    const value = rest.join('=').trim().replace(/^["']|["']$/g, '');
    
    if (key) {
      const trimmedKey = key.trim();
      // Skip these keys entirely so we don't overwrite production endpoints with localhost
      if (trimmedKey === 'AWS_ACCESS_KEY_ID' || trimmedKey === 'AWS_SECRET_ACCESS_KEY' || 
          trimmedKey === 'DATABASE_URL' || trimmedKey === 'REDIS_HOST' || 
          trimmedKey === 'REDIS_PORT' || trimmedKey === 'REDIS_PASSWORD') {
        return;
      }
      env[trimmedKey] = value || '';
    }
  });

  return env;
}

async function updateSecret(secretName, localEnvVars) {
  try {
    // First, fetch the existing secrets from AWS to preserve infrastructure variables
    let existingEnv = {};
    try {
      const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
      if ('SecretString' in data) {
        existingEnv = JSON.parse(data.SecretString);
      }
    } catch (err) {
      console.log(`Could not fetch existing secret ${secretName}, creating a new payload...`);
    }

    // Merge local variables INTO the existing AWS variables
    const finalEnv = { ...existingEnv, ...localEnvVars };
    
    const params = {
      SecretId: secretName,
      SecretString: JSON.stringify(finalEnv)
    };
    
    await secretsManager.putSecretValue(params).promise();
    console.log(`✅ Successfully synced local changes to secret: ${secretName}`);
  } catch (error) {
    console.error(`❌ Failed to update secret ${secretName}:`, error.message);
  }
}

async function main() {
  console.log('Starting secrets sync...');

  // 1. Sync Backend
  const backendEnvPath = path.join(__dirname, '..', '.env');
  const backendSecretName = `${PROJECT_NAME}-backend-env`;
  console.log(`\nProcessing Backend (.env -> ${backendSecretName})`);
  const backendEnv = parseEnv(backendEnvPath);
  await updateSecret(backendSecretName, backendEnv);

  // 2. Sync Frontend
  const frontendEnvPath = path.join(__dirname, '..', '..', 'frontend', '.env.local');
  const frontendSecretName = `${PROJECT_NAME}-frontend-env`;
  console.log(`\nProcessing Frontend (.env.local -> ${frontendSecretName})`);
  const frontendEnv = parseEnv(frontendEnvPath);
  await updateSecret(frontendSecretName, frontendEnv);

  console.log('\nSync complete!');
}

main().catch(console.error);
