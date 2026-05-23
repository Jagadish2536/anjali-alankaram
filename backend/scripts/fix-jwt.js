const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function fixJWT() {
  try {
    const baselineData = await secretsManager.getSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      VersionId: '405bda00-7a6d-41e4-bcba-c7e9b0e8d80e' // May 16th
    }).promise();
    const baselineEnv = JSON.parse(baselineData.SecretString);

    const currentData = await secretsManager.getSecretValue({
      SecretId: 'anjali-alankaram-backend-env'
    }).promise();
    const currentEnv = JSON.parse(currentData.SecretString);

    // Specifically restore JWT and MSG91 which might have been overwritten
    currentEnv['JWT_SECRET'] = baselineEnv['JWT_SECRET'];
    currentEnv['MSG91_AUTH_KEY'] = baselineEnv['MSG91_AUTH_KEY'];
    currentEnv['MSG91_TEMPLATE_ID'] = baselineEnv['MSG91_TEMPLATE_ID'];
    currentEnv['ALLOWED_ORIGINS'] = baselineEnv['ALLOWED_ORIGINS'];

    await secretsManager.putSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      SecretString: JSON.stringify(currentEnv)
    }).promise();

    console.log("Successfully restored JWT_SECRET and other missing May 16 baseline values!");
  } catch (e) {
    console.error(e);
  }
}

fixJWT();
