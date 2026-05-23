const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function fixBackendFinal() {
  try {
    // We want the true baseline from May 16th
    const trueBaselineData = await secretsManager.getSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      VersionId: '405bda00-7a6d-41e4-bcba-c7e9b0e8d80e' // May 16th
    }).promise();
    const trueBaselineEnv = JSON.parse(trueBaselineData.SecretString);

    // We also want the exact AWS keys the user manually added today
    const keysData = await secretsManager.getSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      VersionId: '27cfa736-b354-4952-a3a0-e7464e08cb4f' // The 16:46 IST snapshot with AWS keys
    }).promise();
    const keysEnv = JSON.parse(keysData.SecretString);

    // Construct the final correct environment
    const finalEnv = { ...trueBaselineEnv };
    
    // Inject the real AWS keys
    finalEnv['AWS_ACCESS_KEY_ID'] = keysEnv['AWS_ACCESS_KEY_ID'];
    finalEnv['AWS_SECRET_ACCESS_KEY'] = keysEnv['AWS_SECRET_ACCESS_KEY'];

    // We must ensure the DATABASE_URL points to the newly restored DB
    finalEnv['DATABASE_URL'] = 'postgresql://postgres:AnjaliAlankaram2026Secure@anjali-alankaram-db.c9ww8iywy18f.ap-south-2.rds.amazonaws.com/anjali_alankaram';

    // Also add all other keys that should be there (e.g. PORT, NODE_ENV, AWS_REGION, AWS_S3_BUCKET, RAZORPAY, SHIPROCKET, FIREBASE)
    // Actually, I should just take the keysEnv (from today) but OVERWRITE the dangerous local values with the true May 16 values
    const mergedEnv = { ...keysEnv };
    
    mergedEnv['DATABASE_URL'] = 'postgresql://postgres:AnjaliAlankaram2026Secure@anjali-alankaram-db.c9ww8iywy18f.ap-south-2.rds.amazonaws.com:5432/anjali_alankaram?schema=public';
    mergedEnv['REDIS_HOST'] = trueBaselineEnv['REDIS_HOST'];
    mergedEnv['REDIS_PORT'] = '6379'; // Ensure port is right
    mergedEnv['GOOGLE_CLIENT_ID'] = trueBaselineEnv['GOOGLE_CLIENT_ID'];

    // Save it
    await secretsManager.putSecretValue({
      SecretId: 'anjali-alankaram-backend-env',
      SecretString: JSON.stringify(mergedEnv)
    }).promise();

    console.log("CRITICAL FIX: Successfully restored true production endpoints and Google Client ID while keeping real AWS keys!");

  } catch (e) {
    console.error(e);
  }
}

fixBackendFinal();
