const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const workspaces = ['server', 'client'];
const children = [];
let shuttingDown = false;
let exited = 0;
const npmCliFromEnv = process.env.npm_execpath;
const npmCliFromNode = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const npmCliPath = npmCliFromEnv && fs.existsSync(npmCliFromEnv) ? npmCliFromEnv : npmCliFromNode;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(exitCode);
  }, 2000).unref();
}

for (const workspace of workspaces) {
  const spawnConfig = {
    stdio: 'inherit',
    env: process.env,
  };
  const child = fs.existsSync(npmCliPath)
    ? spawn(process.execPath, [npmCliPath, 'run', 'dev', '--workspace', workspace], spawnConfig)
    : spawn('npm', ['run', 'dev', '--workspace', workspace], {
        ...spawnConfig,
        shell: process.platform === 'win32',
      });

  child.on('exit', (code) => {
    if (shuttingDown) return;

    if (code && code !== 0) {
      shutdown(code);
      return;
    }

    exited += 1;
    if (exited === workspaces.length) {
      process.exit(0);
    }
  });

  child.on('error', () => {
    shutdown(1);
  });

  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
