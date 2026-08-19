const fs = require('fs');
const path = require('path');
const session = require('express-session');

class FileSessionStore extends session.Store {
  constructor(filePath = path.join(process.cwd(), 'data', 'sessions.json')) {
    super();
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.sessions = new Map();
    this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      this.sessions = new Map(Object.entries(JSON.parse(raw)));
      this._cleanup();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  _persist() {
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(Object.fromEntries(this.sessions)), 'utf8');
    fs.renameSync(temp, this.filePath);
  }

  _cleanup() {
    const now = Date.now();
    let changed = false;
    for (const [sid, entry] of this.sessions) {
      if (!entry || entry.expiresAt <= now) {
        this.sessions.delete(sid);
        changed = true;
      }
    }
    if (changed) this._persist();
  }

  get(sid, callback) {
    const entry = this.sessions.get(sid);
    if (!entry || entry.expiresAt <= Date.now()) {
      if (entry) {
        this.sessions.delete(sid);
        this._persist();
      }
      return callback(null, null);
    }
    callback(null, entry.session);
  }

  set(sid, sessionData, callback) {
    const maxAge = Number(sessionData?.cookie?.maxAge);
    this.sessions.set(sid, {
      session: sessionData,
      expiresAt: Date.now() + (Number.isFinite(maxAge) ? maxAge : 7 * 24 * 60 * 60 * 1000)
    });
    try {
      this._persist();
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  touch(sid, sessionData, callback) {
    const entry = this.sessions.get(sid);
    if (!entry) return callback?.(null);
    const maxAge = Number(sessionData?.cookie?.maxAge);
    entry.session = sessionData;
    entry.expiresAt = Date.now() + (Number.isFinite(maxAge) ? maxAge : 7 * 24 * 60 * 60 * 1000);
    try {
      this._persist();
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }

  destroy(sid, callback) {
    this.sessions.delete(sid);
    try {
      this._persist();
      callback?.(null);
    } catch (error) {
      callback?.(error);
    }
  }
}

module.exports = FileSessionStore;
