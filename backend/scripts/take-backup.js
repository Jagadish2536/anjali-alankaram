const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting backup process...');
  
  // Ensure backups directory exists in workspace root
  const backupDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Backup all users / customers
  console.log('Fetching customers...');
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  const usersPath = path.join(backupDir, 'customers_backup.json');
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  console.log(`✅ Backed up ${users.length} users/customers to: ${usersPath}`);

  // 2. Backup general settings & database Razorpay integration settings
  console.log('Fetching database store settings...');
  const settings = await prisma.storeSettings.findMany();
  const settingsPath = path.join(backupDir, 'settings_backup.json');
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log(`✅ Backed up store settings to: ${settingsPath}`);

  // 3. Backup active environment Razorpay settings (.env)
  const envPath = path.join(__dirname, '..', '.env');
  const envBackup = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      if (!line || line.trim().startsWith('#') || !line.includes('=')) return;
      const [key, ...rest] = line.split('=');
      const name = key.trim();
      const value = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (name.startsWith('RAZORPAY_') || name === 'NEXT_PUBLIC_RAZORPAY_KEY_ID') {
        envBackup[name] = value;
      }
    });
    const envBackupPath = path.join(backupDir, 'razorpay_env_backup.json');
    fs.writeFileSync(envBackupPath, JSON.stringify(envBackup, null, 2));
    console.log(`✅ Backed up environment Razorpay credentials to: ${envBackupPath}`);
  }

  console.log('\nBackup process completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Backup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
