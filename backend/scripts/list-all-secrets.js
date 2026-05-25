const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'ap-south-2' });

async function listSecrets() {
  try {
    const data = await secretsManager.listSecrets({}).promise();
    console.log("=== All Secrets in AWS Secrets Manager ===");
    data.SecretList.forEach(s => {
      console.log(`Name: ${s.Name} | Description: ${s.Description}`);
    });
  } catch (err) {
    console.error(err);
  }
}

listSecrets();
