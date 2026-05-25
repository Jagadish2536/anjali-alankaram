const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

// Configuration
const REGION = 'ap-south-2'; 
const PROJECT_NAME = 'anjali-alankaram';
const SECRET_NAME = `${PROJECT_NAME}-backend-env`;

// Parse local .env to find the keys
function getAWSKeysFromEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`.env file not found at ${envPath}`);
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  let accessKeyId = '';
  let secretAccessKey = '';
  
  content.split('\n').forEach(line => {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) return;
    const [key, ...rest] = line.split('=');
    const value = rest.join('=').trim().replace(/^["']|["']$/g, '');
    if (key.trim() === 'AWS_ACCESS_KEY_ID') accessKeyId = value;
    if (key.trim() === 'AWS_SECRET_ACCESS_KEY') secretAccessKey = value;
  });
  
  return { accessKeyId, secretAccessKey };
}

async function main() {
  console.log('🔄 Loading local AWS keys...');
  const keys = getAWSKeysFromEnv();
  
  if (!keys.accessKeyId || !keys.secretAccessKey) {
    console.error('❌ Could not find AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in backend/.env');
    process.exit(1);
  }
  
  console.log(`Access Key to push: ${keys.accessKeyId.substring(0, 8)}...`);

  // Configure AWS SDK explicitly using the keys we read
  AWS.config.update({
    region: REGION,
    accessKeyId: keys.accessKeyId,
    secretAccessKey: keys.secretAccessKey
  });

  const secretsManager = new AWS.SecretsManager();

  console.log(`\n🔄 Fetching existing secret payload for "${SECRET_NAME}"...`);
  let existingPayload = {};
  try {
    const data = await secretsManager.getSecretValue({ SecretId: SECRET_NAME }).promise();
    if ('SecretString' in data) {
      existingPayload = JSON.parse(data.SecretString);
      console.log('✅ Fetched existing secret payload successfully.');
    }
  } catch (error) {
    console.error('❌ Failed to fetch existing secret payload:', error.message);
    process.exit(1);
  }

  // Merge the AWS keys into the existing payload
  const updatedPayload = {
    ...existingPayload,
    AWS_ACCESS_KEY_ID: keys.accessKeyId,
    AWS_SECRET_ACCESS_KEY: keys.secretAccessKey
  };

  console.log('\n🔄 Updating Secrets Manager secret...');
  try {
    await secretsManager.putSecretValue({
      SecretId: SECRET_NAME,
      SecretString: JSON.stringify(updatedPayload)
    }).promise();
    console.log(`✅ Success! AWS keys are now updated in AWS Secrets Manager secret: ${SECRET_NAME}`);
  } catch (error) {
    console.error('❌ Failed to update AWS Secrets Manager:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
