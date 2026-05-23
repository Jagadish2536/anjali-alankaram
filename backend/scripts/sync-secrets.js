const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configuration
const REGION = 'ap-south-2'; // From variables.tf default
const PROJECT_NAME = 'anjali-alankaram'; // From variables.tf default

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
      if (trimmedKey === 'AWS_ACCESS_KEY_ID' || trimmedKey === 'AWS_SECRET_ACCESS_KEY') {
        env[trimmedKey] = ''; // Force empty so production uses IAM Task Role
      } else {
        env[trimmedKey] = value || '';
      }
    }
  });

  // ECS requires all these keys to be present in Secrets Manager or it fails to start
  const REQUIRED_BACKEND_KEYS = [
    "JWT_SECRET", "DATABASE_URL", "REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD",
    "JWT_ACCESS_EXPIRES", 
    "MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID", "GOOGLE_CLIENT_ID", "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "SHIPROCKET_EMAIL",
    "SHIPROCKET_PASSWORD", "FIREBASE_SERVICE_ACCOUNT_BASE64", "RATE_LIMIT_REQUESTS",
    "ALLOWED_ORIGINS"
  ];
  
  if (filePath.includes('.env') && !filePath.includes('frontend')) {
    REQUIRED_BACKEND_KEYS.forEach(reqKey => {
      if (!(reqKey in env)) env[reqKey] = '';
    });
  }

  return env;
}

async function updateSecret(secretName, envVars) {
  if (Object.keys(envVars).length === 0) {
    console.log(`Skipping ${secretName} as no valid variables were found.`);
    return;
  }
  
  try {
    const params = {
      SecretId: secretName,
      SecretString: JSON.stringify(envVars)
    };
    
    await secretsManager.putSecretValue(params).promise();
    console.log(`✅ Successfully updated secret: ${secretName}`);
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
