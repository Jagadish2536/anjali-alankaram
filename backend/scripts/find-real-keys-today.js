const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function findAllKeys() {
  try {
    let nextToken = undefined;
    let allVersions = [];

    do {
      const versionsData = await secretsManager.listSecretVersionIds({ 
        SecretId: 'anjali-alankaram-backend-env',
        IncludeDeprecated: true,
        NextToken: nextToken
      }).promise();
      
      allVersions = allVersions.concat(versionsData.Versions);
      nextToken = versionsData.NextToken;
    } while (nextToken);

    console.log(`Found ${allVersions.length} total versions.`);

    for (const version of allVersions) {
      const createdStr = version.CreatedDate.toISOString();
      if (createdStr.includes('2026-05-23')) {
        try {
          const data = await secretsManager.getSecretValue({
            SecretId: 'anjali-alankaram-backend-env',
            VersionId: version.VersionId
          }).promise();
          
          const env = JSON.parse(data.SecretString);
          console.log(`\nVersion: ${version.VersionId}`);
          console.log(`Created: ${createdStr}`);
          console.log(`AWS_ACCESS_KEY_ID: ${env['AWS_ACCESS_KEY_ID']}`);
          if (env['AWS_ACCESS_KEY_ID'] && env['AWS_ACCESS_KEY_ID'] !== 'your_access_key' && env['AWS_ACCESS_KEY_ID'] !== 'undefined') {
             console.log(`FOUND REAL KEY IN VERSION: ${version.VersionId}`);
             console.log(`AWS_SECRET_ACCESS_KEY: ${env['AWS_SECRET_ACCESS_KEY']}`);
          }
        } catch (err) {
          // ignore
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

findAllKeys();
