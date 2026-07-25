const https = require('https');
const crypto = require('crypto');

const accessKeyId = process.env.SES_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.SES_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const regions = ['us-east-1', 'ap-south-1', 'ap-south-2', 'us-west-2', 'eu-west-1'];

function hmac(key, string) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest();
}

function hash(string) {
  return crypto.createHash('sha256').update(string, 'utf8').digest('hex');
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

function callSes(region, action, params = {}) {
  return new Promise((resolve, reject) => {
    const host = `email.${region}.amazonaws.com`;
    const method = 'POST';
    const service = 'ses';
    const body = new URLSearchParams({ Action: action, Version: '2010-12-01', ...params }).toString();

    const t = new Date();
    const amzDate = t.toISOString().replace(/[:\.-]/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';
    const payloadHash = hash(body);
    const canonicalRequest = `${method}\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${hash(canonicalRequest)}`;
    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const req = https.request(`https://${host}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Amz-Date': amzDate,
        'Authorization': authHeader,
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function checkRegion(region) {
  try {
    const quotaRes = await callSes(region, 'GetSendQuota');
    const idsRes = await callSes(region, 'ListIdentities');
    
    console.log(`\n=== REGION: ${region} ===`);
    console.log(`Quota Response:`, quotaRes.data);
    console.log(`Identities Response:`, idsRes.data);
  } catch (err) {
    console.log(`Region ${region} failed:`, err.message);
  }
}

async function main() {
  for (const r of regions) {
    await checkRegion(r);
  }
}

main();
