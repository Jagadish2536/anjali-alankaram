const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Manually load backend/.env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
      if (key && val) {
        process.env[key] = val;
      }
    }
  });
}

const authKey = process.env.MSG91_AUTH_KEY;
const whatsappSender = process.env.MSG91_WHATSAPP_SENDER;

console.log('authKey configured:', !!authKey);
console.log('whatsappSender:', whatsappSender);

async function main() {
  if (!authKey) {
    console.error('MSG91_AUTH_KEY is not set in environment!');
    return;
  }

  try {
    console.log('Fetching account info from https://control.msg91.com/api/v1/account...');
    const accountRes = await axios.get('https://control.msg91.com/api/v1/account', {
      headers: { authkey: authKey },
      timeout: 5000,
    });
    console.log('Account API Response:', JSON.stringify(accountRes.data, null, 2));
  } catch (err) {
    console.error('Account API Error:', err.message, err.response?.data);
  }

  if (whatsappSender) {
    try {
      const cleanSender = whatsappSender.replace(/\D/g, '');
      console.log(`Fetching WhatsApp balance for sender ${cleanSender}...`);
      const waRes = await axios.post(
        'https://control.msg91.com/api/v5/subscriptions/fetchPrepaidBalance',
        {
          integrated_number: cleanSender,
          service: 'whatsapp',
        },
        {
          headers: {
            authkey: authKey,
            'content-type': 'application/json',
          },
          timeout: 5000,
        }
      );
      console.log('WhatsApp API Response:', JSON.stringify(waRes.data, null, 2));
    } catch (err) {
      console.error('WhatsApp API Error:', err.message, err.response?.data);
    }
  }
}

main();
