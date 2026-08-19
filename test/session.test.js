const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const preload = path.join(__dirname, '..', 'src', 'session.js');

function runProduction(env) {
  return spawnSync(process.execPath, ['-r', preload, '-e', ''], {
    env: { ...process.env, NODE_ENV: 'production', ...env },
    encoding: 'utf8'
  });
}

test('production startup fails without SESSION_SECRET', () => {
  const result = runProduction({ SESSION_SECRET: '', REDIS_URL: 'redis://localhost:6379' });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /SESSION_SECRET must be configured/);
});

test('production startup fails without REDIS_URL', () => {
  const result = runProduction({ SESSION_SECRET: 'test-secret', REDIS_URL: '' });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}${result.stdout}`, /REDIS_URL must be configured/);
});
