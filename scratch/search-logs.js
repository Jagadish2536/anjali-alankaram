const fs = require('fs');
const path = require('path');

const files = [
  '500_errors.json',
  'backend_logs.txt',
  'crash_logs.json',
  'errors.json',
  'errors.txt',
  'latest_logs.json',
  'logs.json',
  'recent_logs.json',
  'short_logs.txt'
];

for (const file of files) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf16le');
    if (!content.includes('events') && !content.includes('message')) {
      content = fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (_) {}
  }
  
  const lines = content.split('\n');
  let matchCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/email|google|otp|fail|error|warn/i.test(line)) {
      if (matchCount < 30) {
        console.log(`[${file}:${i+1}] ${line.trim().substring(0, 150)}`);
      }
      matchCount++;
    }
  }
  console.log(`Found ${matchCount} matches in ${file}\n`);
}
