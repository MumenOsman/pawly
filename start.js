/**
 * Pawly All-in-One Launcher
 * Runs the Go backend and Vite frontend concurrently in a single terminal with zero dependencies.
 */
const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const goCmd = isWin ? 'go.exe' : 'go';

console.log('\x1b[36m%s\x1b[0m', '🐾 Starting Pawly Application (Backend :3000 + Frontend :5173)...\n');

// 1. Launch Go Backend
const backend = spawn(goCmd, ['run', 'cmd/api/main.go'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'pipe',
  shell: isWin,
});

backend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[36m[BACKEND]\x1b[0m ${data}`);
});
backend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[33m[BACKEND]\x1b[0m ${data}`);
});
backend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\x1b[31m[BACKEND] Process exited with code ${code}\x1b[0m`);
  }
});

// 2. Launch Vite Frontend
const frontend = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'pipe',
  shell: isWin,
});

frontend.stdout.on('data', (data) => {
  process.stdout.write(`\x1b[32m[FRONTEND]\x1b[0m ${data}`);
});
frontend.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[35m[FRONTEND]\x1b[0m ${data}`);
});
frontend.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\x1b[31m[FRONTEND] Process exited with code ${code}\x1b[0m`);
  }
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Shutting down Pawly servers...');
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
