const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function patch() {
  try {
    const secretId = 'anjali-alankaram-backend-env';
    const data = await secretsManager.getSecretValue({ SecretId: secretId }).promise();
    const env = JSON.parse(data.SecretString);

    // Fix the database and redis URLs for production
    env.DATABASE_URL = 'postgresql://postgres:AnjaliAlankaram2026Secure@anjali-alankaram-db.c9ww8iywy18f.ap-south-2.rds.amazonaws.com:5432/anjali_alankaram?schema=public';
    env.REDIS_HOST = 'anjali-alankaram-redis.vvknwf.0001.aps2.cache.amazonaws.com';
    env.REDIS_PORT = '6379';
    env.REDIS_PASSWORD = '';

    await secretsManager.putSecretValue({
      SecretId: secretId,
      SecretString: JSON.stringify(env)
    }).promise();

    console.log('Successfully patched production secrets with correct RDS and Redis endpoints!');
  } catch (e) {
    console.error(e);
  }
}

patch();
