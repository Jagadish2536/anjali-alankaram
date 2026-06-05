const fs = require('fs');
const path = require('path');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Read environment variables manually from .env
const envPath = path.resolve(__dirname, '../.env');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf-8');
} catch (err) {
  console.error('Could not find .env file at:', envPath);
  process.exit(1);
}

const getEnv = (key, fallback = '') => {
  const match = envContent.match(new RegExp(`^${key}=["']?([^"'\r\n]*)["']?`, 'm'));
  return match ? match[1] : (process.env[key] || fallback);
};

const accessKeyId = getEnv('AWS_ACCESS_KEY_ID');
const secretAccessKey = getEnv('AWS_SECRET_ACCESS_KEY');
const region = getEnv('AWS_REGION', 'ap-south-2');
const fromEmail = getEnv('SES_FROM_EMAIL', 'noreply@anjalialankaram.com');
const fromName = getEnv('SES_FROM_NAME', 'Anjali Alankaram');

// Get recipient from CLI arguments
const recipient = process.argv[2];

if (!recipient) {
  console.log('\nUsage: node scripts/test-ses.js <recipient-email-address>');
  console.log('\nLoaded Configuration:');
  console.log(`- AWS Region: ${region}`);
  console.log(`- Sender Name: ${fromName}`);
  console.log(`- Sender Email: ${fromEmail}`);
  console.log(`- AWS Credentials: ${accessKeyId ? 'FOUND' : 'MISSING'}`);
  process.exit(1);
}

console.log('--- AWS SES Test Tool ---');
console.log(`Using Region: ${region}`);
console.log(`Using Sender: ${fromName} <${fromEmail}>`);
console.log(`Sending To  : ${recipient}`);
console.log('-------------------------');

if (!accessKeyId || !secretAccessKey) {
  console.error('ERROR: AWS credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) not found in .env file.');
  process.exit(1);
}

// Set up credentials for the SES client
const ses = new SESClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  const command = new SendEmailCommand({
    Source: `${fromName} <${fromEmail}>`,
    Destination: {
      ToAddresses: [recipient],
    },
    Message: {
      Subject: {
        Data: 'AWS SES Production Test Email',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
            <h1>AWS SES Production Test</h1>
            <p>If you are reading this, your AWS SES integration is working perfectly!</p>
            <ul>
              <li><strong>Status:</strong> Sandbox/Production Active</li>
              <li><strong>Sender:</strong> ${fromEmail}</li>
              <li><strong>Time:</strong> ${new Date().toISOString()}</li>
            </ul>
          `,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    const response = await ses.send(command);
    console.log('\n✅ SUCCESS!');
    console.log('Email sent successfully. Message ID:', response.MessageId);
    console.log('Please check the inbox of:', recipient);
  } catch (err) {
    console.error('\n❌ ERROR SENDING EMAIL:');
    console.error(err);
  }
}

main();
