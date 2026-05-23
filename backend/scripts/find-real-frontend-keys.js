const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function findRealFrontendKeys() {
  try {
    const versionsData = await secretsManager.listSecretVersionIds({ 
      SecretId: 'anjali-alankaram-frontend-env',
      IncludeDeprecated: true
    }).promise();

    for (const version of versionsData.Versions) {
      try {
        const data = await secretsManager.getSecretValue({
          SecretId: 'anjali-alankaram-frontend-env',
          VersionId: version.VersionId
        }).promise();
        
        const env = JSON.parse(data.SecretString);
        console.log(`\nVersion: ${version.VersionId}`);
        console.log(`Created: ${version.CreatedDate}`);
        console.log(`NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${env['NEXT_PUBLIC_GOOGLE_CLIENT_ID']}`);
      } catch (err) {
        // some versions might not be parseable or available
      }
    }
  } catch (e) {
    console.error(e);
  }
}

findRealFrontendKeys();
