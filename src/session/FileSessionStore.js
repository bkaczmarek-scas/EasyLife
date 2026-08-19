const fs = require('fs');
const path = require('path');
const session = require('express-session');

const Store = session.Store;

class FileSessionStore extends Store {
  constructor({ filePath, ttl = 7 * 24 * 60 * 60 * 1000, cleanupInterval = 60 * 60 * 1000 } = {}) {
    super();
    this.filePath = filePath || path.join(process.cwd(), 'data', 'sessions.json');
    this.ttl = ttl;
    this.sessions = new Map();
    this._ensureDir();
    this._load();
    this._cleanupTimer = setInterval(() => this._cleanup(), cleanupInterval);
    this._cleanupTimer.unref?.();
  }

  _ensureDir() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.sessions = new Map(Object.entries(parsed));
      this._cleanup();
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  _persist() {
    const data = Object.fromEntries(this.sessions);
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data), 'utf8');
    fs.renameSync(tempPath, this.filePath);
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
    const cookieMaxAge = sessionData.cookie?.maxAge;
    const expiresAt = Date.now() + (Number.isFinite(cookieMaxAge) ? cookieMaxAge : this.ttl);
    this.sessions.set(sid, { session: sessionData, expiresAt });
    try {
      this._persist();
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid, callback) {
    this.sessions.delete(sid);
    try {
      this._persist();
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  touch(sid, sessionData, callback) {
    const entry = this.sessions.get(sid);
    if (!entry) return callback?.(null);
    const cookieMaxAge = sessionData.cookie?.maxAge;
    entry.session = sessionData;
    entry.expiresAt = Date.now() + (Number.isFinite(cookieMaxAge) ? cookieMaxAge : this.ttl);
    try {
      this._persist();
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }

  clear(callback) {
    this.sessions.clear();
    try {
      this._persist();
      callback?.(null);
    } catch (err) {
      callback?.(err);
    }
  }
}

module.exports = FileSessionStore;
