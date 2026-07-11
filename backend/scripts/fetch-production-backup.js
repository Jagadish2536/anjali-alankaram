const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Target paths
const backupDir = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Javascript code to run inside container
const codeToRun = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const settings = await prisma.storeSettings.findFirst();
  console.log('___BACKUP_JSON___' + JSON.stringify({ users, settings }));
}
run().catch(e => console.error(e)).finally(() => prisma.$disconnect());
`;

const base64Code = Buffer.from(codeToRun).toString('base64');
const evalCommand = `eval(Buffer.from('${base64Code}', 'base64').toString('utf8'))`;

// Ensure the Session Manager plugin path is included in the execution path
const pluginPath = "C:\\Users\\prata\\.gemini\\antigravity-ide\\session-manager-plugin\\bin\\bin";
process.env.PATH = `${pluginPath};${process.env.PATH}`;

const args = [
  "ecs", "execute-command",
  "--cluster", "anjali-alankaram-cluster",
  "--task", "0807bdc4223941d5b1de1dc497708cf7",
  "--container", "backend",
  "--interactive",
  "--command", `node -e "${evalCommand}"`,
  "--region", "ap-south-2"
];

const child = spawn("aws", args, { shell: false });

let stdoutData = "";
let stderrData = "";

child.stdout.on('data', (data) => {
  stdoutData += data.toString();
});

child.stderr.on('data', (data) => {
  stderrData += data.toString();
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Process exited with code ${code}`);
    console.error("Stderr output was:", stderrData);
    process.exit(code);
  }

  console.log("Parsing response...");
  const marker = "___BACKUP_JSON___";
  const markerIndex = stdoutData.indexOf(marker);
  if (markerIndex === -1) {
    console.error("❌ Error: Could not find backup JSON marker in output.");
    console.log("Stdout output was:", stdoutData);
    console.log("Stderr output was:", stderrData);
    process.exit(1);
  }

  const jsonStr = stdoutData.slice(markerIndex + marker.length).trim();
  const endJsonIndex = jsonStr.lastIndexOf("}");
  if (endJsonIndex === -1) {
    console.error("❌ Error: Received incomplete JSON payload.");
    process.exit(1);
  }
  const cleanJsonStr = jsonStr.slice(0, endJsonIndex + 1);

  try {
    const payload = JSON.parse(cleanJsonStr);
    
    // Save Customers Backup
    const customersPath = path.join(backupDir, 'customers_backup.json');
    fs.writeFileSync(customersPath, JSON.stringify(payload.users || [], null, 2));
    console.log(`✅ Saved ${payload.users?.length || 0} customers/users to: ${customersPath}`);

    // Save Settings Backup
    const settingsPath = path.join(backupDir, 'settings_backup.json');
    fs.writeFileSync(settingsPath, JSON.stringify(payload.settings || {}, null, 2));
    console.log(`✅ Saved store settings to: ${settingsPath}`);

    // Fetch and save active Razorpay config from local env
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
      console.log(`✅ Saved active environment Razorpay configs to: ${envBackupPath}`);
    }

    console.log("\nBackup sync completed successfully!");
  } catch (parseError) {
    console.error("❌ Failed to parse JSON payload:", parseError);
    console.log("Raw payload was:", cleanJsonStr);
  }
});
