const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function fixAll() {
  try {
    const currentData = await secretsManager.getSecretValue({ SecretId: 'anjali-alankaram-backend-env' }).promise();
    const currentEnv = JSON.parse(currentData.SecretString);

    console.log('Current GOOGLE_CLIENT_ID:', currentEnv['GOOGLE_CLIENT_ID']);
    console.log('Current AWS_S3_BUCKET:', currentEnv['AWS_S3_BUCKET']);
    console.log('Current JWT_SECRET:', currentEnv['JWT_SECRET']);

    // Fix 1: S3 bucket name (real bucket is anjali-alankaram-assets-908027403766)
    currentEnv['AWS_S3_BUCKET'] = 'anjali-alankaram-assets-908027403766';

    // Fix 2: Google Client ID - restore from May 16 pristine
    // The real client ID is: 98366727786-33s4ejrb2d1g5od9uap7mjhg361bh1tq.apps.googleusercontent.com
    // Check if it got corrupted
    if (!currentEnv['GOOGLE_CLIENT_ID'] || !currentEnv['GOOGLE_CLIENT_ID'].includes('.apps.googleusercontent.com')) {
      currentEnv['GOOGLE_CLIENT_ID'] = '98366727786-33s4ejrb2d1g5od9uap7mjhg361bh1tq.apps.googleusercontent.com';
      console.log('Fixed GOOGLE_CLIENT_ID');
    }

    await secretsManager.putSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      SecretString: JSON.stringify(currentEnv)
    }).promise();

    console.log('\nSuccessfully fixed backend secrets!');
    console.log('New AWS_S3_BUCKET:', currentEnv['AWS_S3_BUCKET']);
    console.log('New GOOGLE_CLIENT_ID:', currentEnv['GOOGLE_CLIENT_ID']);
  } catch (e) {
    console.error(e);
  }
}

fixAll();
