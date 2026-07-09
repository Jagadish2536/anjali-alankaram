/**
 * Anjali Alankaram - Production Release Verification Script
 * 
 * Runs cross-platform check (Windows/Linux) validating
 * codebase health before deployment.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function runCheck(name, command, cwd) {
  console.log(`\n🔍 Checking: ${name}...`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
    console.log(`✅ ${name} passed!`);
    return true;
  } catch (err) {
    console.error(`❌ ${name} failed!`);
    return false;
  }
}

function verifyEnvExample() {
  console.log('\n🔍 Verifying .env.example configuration...');
  const envPath = path.join(__dirname, '..', 'backend', '.env.example');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.example file not found in backend folder!');
    return false;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const REQUIRED = ['DATABASE_URL', 'REDIS_HOST', 'AWS_SQS_QUEUE_URL', 'OPENAI_API_KEY'];
  let pass = true;
  for (const variable of REQUIRED) {
    if (!content.includes(variable)) {
      console.error(`❌ Missing variable declaration in .env.example: ${variable}`);
      pass = false;
    }
  }
  if (pass) {
    console.log('✅ .env.example contains all critical production declarations.');
  }
  return pass;
}

function run() {
  console.log('🚀 Starting Production Release Health Check...');
  const root = path.join(__dirname, '..');

  const step1 = runCheck(
    'Prisma type generation',
    'npx prisma generate',
    path.join(root, 'backend')
  );

  const step2 = verifyEnvExample();

  const step3 = runCheck(
    'NestJS Backend Compilation',
    'npm run build',
    path.join(root, 'backend')
  );

  const step4 = runCheck(
    'Next.js Frontend Compilation',
    'npm run build',
    path.join(root, 'frontend')
  );

  if (step1 && step2 && step3 && step4) {
    console.log('\n🎉 ALL PRODUCTION HEALTH CHESTS PASSED! Release is ready for deployment.');
    process.exit(0);
  } else {
    console.error('\n🚨 RELEASE HEALTH CHEST FAILED! Fix compilation/configuration errors before pushing.');
    process.exit(1);
  }
}

run();
