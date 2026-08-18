const bcrypt = require('bcryptjs');

function isConfigured() {
  return Boolean(process.env.AUTH_EMAIL && process.env.AUTH_PASSWORD_HASH);
}

function verify(email, password) {
  if (!isConfigured()) return false;
  if (email !== process.env.AUTH_EMAIL) return false;
  return bcrypt.compareSync(password, process.env.AUTH_PASSWORD_HASH);
}

module.exports = { isConfigured, verify };
