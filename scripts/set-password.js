// Sets the login email/password for the app. Run with: node scripts/set-password.js
// Updates AUTH_EMAIL and AUTH_PASSWORD_HASH in .env (input is shown in the terminal, not masked).
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');

const ENV_PATH = path.join(__dirname, '..', '.env');

function setEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.trimEnd()}\n${line}\n`;
}

if (!fs.existsSync(ENV_PATH)) {
  console.error('.env not found. Copy .env.example to .env first.');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Login email: ', (emailAnswer) => {
  const email = emailAnswer.trim();
  rl.question('Login password: ', (passwordAnswer) => {
    const password = passwordAnswer.trim();
    rl.close();

    if (!email || !password) {
      console.error('Email and password are both required.');
      process.exit(1);
    }

    const hash = bcrypt.hashSync(password, 10);
    let content = fs.readFileSync(ENV_PATH, 'utf8');
    content = setEnvVar(content, 'AUTH_EMAIL', email);
    content = setEnvVar(content, 'AUTH_PASSWORD_HASH', hash);
    fs.writeFileSync(ENV_PATH, content);

    console.log('\nLogin credentials saved to .env. Restart the server for changes to take effect.');
  });
});
