const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the Session Manager plugin path is included in the execution path
const pluginPath = "C:\\Users\\prata\\.gemini\\antigravity-ide\\session-manager-plugin\\bin\\bin";
process.env.PATH = `${pluginPath};${process.env.PATH}`;

const REGION = 'ap-south-2';
const CLUSTER = 'anjali-alankaram-cluster';

const backupsDir = path.join(__dirname, '..', '..', 'backups');
const usersPath = path.join(backupsDir, 'customers_backup.json');
const settingsPath = path.join(backupsDir, 'settings_backup.json');

if (!fs.existsSync(usersPath) || !fs.existsSync(settingsPath)) {
  console.error("❌ Error: Backup files do not exist. Please run the backup task first.");
  process.exit(1);
}

const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
const settingsData = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

// Format users and settings for restore
const codeToRun = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Starting restore operation inside container...');
  
  const users = ${JSON.stringify(usersData)};
  const settings = ${JSON.stringify(settingsData)};

  // 1. Restore settings
  console.log('Restoring store settings...');
  await prisma.storeSettings.deleteMany();
  const settingsList = Array.isArray(settings) ? settings : [settings];
  for (const s of settingsList) {
    const { id, ...data } = s;
    await prisma.storeSettings.create({ data });
  }
  console.log('✅ Store settings restored.');

  // 2. Restore users
  console.log('Restoring users...');
  await prisma.user.deleteMany();
  const cleanUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    avatar: u.avatar,
    role: u.role,
    googleId: u.googleId,
    password: u.password,
    isPhoneVerified: u.isPhoneVerified,
    isEmailVerified: u.isEmailVerified,
    isActive: u.isActive,
    fcmToken: u.fcmToken,
    warehouseId: u.warehouseId,
    createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
    updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date()
  }));

  await prisma.user.createMany({ data: cleanUsers });
  console.log('✅ ' + cleanUsers.length + ' users restored successfully.');
}

run()
  .then(() => console.log('___RESTORE_SUCCESS___'))
  .catch(e => console.error('❌ Restore failed inside container:', e))
  .finally(() => prisma.$disconnect());
`;

const base64Code = Buffer.from(codeToRun).toString('base64');
const evalCommand = `eval(Buffer.from('${base64Code}', 'base64').toString('utf8'))`;

function getBackendTaskId() {
  return new Promise((resolve, reject) => {
    exec(`aws ecs list-tasks --cluster ${CLUSTER} --region ${REGION}`, (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        const payload = JSON.parse(stdout);
        const taskArns = payload.taskArns || [];
        if (taskArns.length === 0) return reject(new Error('No tasks found in cluster'));
        
        const queryCmd = `aws ecs describe-tasks --cluster ${CLUSTER} --tasks ${taskArns.join(' ')} --region ${REGION}`;
        exec(queryCmd, (err2, stdout2, stderr2) => {
          if (err2) return reject(err2);
          try {
            const desc = JSON.parse(stdout2);
            for (const task of desc.tasks) {
              const backendContainer = task.containers.find(c => c.name === 'backend');
              // Make sure the task is running to accept command execution
              if (backendContainer && task.lastStatus === 'RUNNING') {
                return resolve(task.taskArn.split('/').pop());
              }
            }
            reject(new Error('No running backend task found'));
          } catch (e) {
            reject(e);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function main() {
  console.log('Finding running backend ECS task...');
  let taskId;
  try {
    taskId = await getBackendTaskId();
  } catch (error) {
    console.error('❌ Failed to locate running backend task:', error.message);
    process.exit(1);
  }
  console.log(`Found backend task ID: ${taskId}`);

  const args = [
    "ecs", "execute-command",
    "--cluster", CLUSTER,
    "--task", taskId,
    "--container", "backend",
    "--interactive",
    "--command", `node -e "${evalCommand}"`,
    "--region", REGION
  ];

  console.log("Triggering restore script inside the Fargate container...");
  const child = spawn("aws", args, { shell: false });

  child.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Local backup files restored to production successfully!');
    } else {
      console.error(`❌ Restore exited with code ${code}`);
      process.exit(code);
    }
  });
}

main().catch(console.error);
