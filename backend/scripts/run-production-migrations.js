const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the Session Manager plugin path is included in the execution path
const pluginPath = "C:\\Users\\prata\\.gemini\\antigravity-ide\\session-manager-plugin\\bin\\bin";
process.env.PATH = `${pluginPath};${process.env.PATH}`;

const REGION = 'ap-south-2';
const CLUSTER = 'anjali-alankaram-cluster';

function getBackendTaskId() {
  return new Promise((resolve, reject) => {
    exec(`aws ecs list-tasks --cluster ${CLUSTER} --region ${REGION}`, (err, stdout, stderr) => {
      if (err) return reject(err);
      try {
        const payload = JSON.parse(stdout);
        const taskArns = payload.taskArns || [];
        if (taskArns.length === 0) return reject(new Error('No tasks found in cluster'));
        
        // Describe tasks to find the backend one
        const queryCmd = `aws ecs describe-tasks --cluster ${CLUSTER} --tasks ${taskArns.join(' ')} --region ${REGION}`;
        exec(queryCmd, (err2, stdout2, stderr2) => {
          if (err2) return reject(err2);
          try {
            const desc = JSON.parse(stdout2);
            for (const task of desc.tasks) {
              const backendContainer = task.containers.find(c => c.name === 'backend');
              if (backendContainer) {
                // Return task ARN or ID
                return resolve(task.taskArn.split('/').pop());
              }
            }
            reject(new Error('No backend task found'));
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
  console.log('Finding active backend ECS task...');
  let taskId;
  try {
    taskId = await getBackendTaskId();
  } catch (error) {
    console.error('❌ Failed to locate backend task:', error.message);
    process.exit(1);
  }
  console.log(`Found backend task ID: ${taskId}`);

  const migrationsCmd = "npx prisma migrate deploy && node prisma/migrate.js && node prisma/seed-settings.js";
  const args = [
    "ecs", "execute-command",
    "--cluster", CLUSTER,
    "--task", taskId,
    "--container", "backend",
    "--interactive",
    "--command", migrationsCmd,
    "--region", REGION
  ];

  console.log("Triggering database migrations inside the Fargate container...");
  const child = spawn("aws", args, { shell: false });

  child.stdout.on('data', (data) => {
    process.stdout.write(data.toString());
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data.toString());
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Production migrations and seeding completed successfully!');
    } else {
      console.error(`❌ Migrations exited with code ${code}`);
      process.exit(code);
    }
  });
}

main().catch(console.error);
