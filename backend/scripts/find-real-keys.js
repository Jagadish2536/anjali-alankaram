const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function findRealKeys() {
  try {
    const versionsData = await secretsManager.listSecretVersionIds({ 
      SecretId: 'anjali-alankaram-backend-env',
      IncludeDeprecated: true
    }).promise();

    for (const version of versionsData.Versions) {
      try {
        const data = await secretsManager.getSecretValue({
          SecretId: 'anjali-alankaram-backend-env',
          VersionId: version.VersionId
        }).promise();
        
        const env = JSON.parse(data.SecretString);
        console.log(`\nVersion: ${version.VersionId}`);
        console.log(`Created: ${version.CreatedDate}`);
        console.log(`AWS_ACCESS_KEY_ID: ${env['AWS_ACCESS_KEY_ID']}`);
        // console.log(`AWS_SECRET_ACCESS_KEY: ${env['AWS_SECRET_ACCESS_KEY']}`);
      } catch (err) {
        // some versions might not be parseable or available
      }
    }
  } catch (e) {
    console.error(e);
  }
}

findRealKeys();
