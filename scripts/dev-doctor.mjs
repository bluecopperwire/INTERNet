import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root, 'backend', '.env');
const minimumNode = [24, 20, 0];
let failed = false;

function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function parseVersion(value) {
  return value.replace(/^v/, '').split('.').map(Number);
}

function atLeast(actual, expected) {
  return actual[0] > expected[0]
    || (actual[0] === expected[0] && (actual[1] > expected[1]
      || (actual[1] === expected[1] && actual[2] >= expected[2])));
}

const nodeVersion = parseVersion(process.version);
if (atLeast(nodeVersion, minimumNode) && nodeVersion[0] < 25) {
  pass(`Node ${process.version} is supported`);
} else {
  fail(`Node ${process.version} is unsupported; install Node 24.20.x LTS.`);
}

if (!existsSync(envPath)) {
  fail('backend/.env is missing. Copy backend/.env.example, set a database password, and set JWT secrets.');
} else {
  const env = readFileSync(envPath, 'utf8');
  for (const key of ['DATABASE_PASSWORD', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const match = env.match(new RegExp(`^${key}=(.*)$`, 'm'));
    if (!match || !match[1].trim() || match[1].includes('your_secure_password')) {
      fail(`${key} must be set in backend/.env.`);
    }
  }
  if (!failed) pass('backend/.env contains required local settings');
}

try {
  execFileSync('docker', ['compose', 'version'], { stdio: 'ignore' });
  pass('Docker Compose is available');
} catch {
  fail('Docker Compose is unavailable. Install Docker Desktop and start its engine.');
}

if (failed) process.exitCode = 1;
