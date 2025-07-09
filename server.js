// Simple development server that starts both frontend and backend
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Match-Werkstatt Development Server...');

// Start Backend (server.cjs on port 3001)
console.log('📦 Starting Backend Server...');
const backend = spawn('node', ['server.cjs'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

backend.stdout.on('data', (data) => {
  console.log(`[Backend] ${data}`);
});

backend.stderr.on('data', (data) => {
  console.error(`[Backend Error] ${data}`);
});

// Start Frontend (Vite on port 3000)
console.log('🌐 Starting Frontend Server...');
const frontend = spawn('npx', ['vite', '--port', '3000', '--host'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

frontend.stdout.on('data', (data) => {
  console.log(`[Frontend] ${data}`);
});

frontend.stderr.on('data', (data) => {
  console.error(`[Frontend Error] ${data}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit(0);
});

console.log('✅ Development servers starting...');
console.log('🌐 Frontend: http://localhost:3000');
console.log('📦 Backend: http://localhost:3001');
console.log('Press Ctrl+C to stop both servers');