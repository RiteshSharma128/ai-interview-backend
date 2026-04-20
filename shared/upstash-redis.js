// ================================================================
// UPSTASH REDIS CLIENT — REST API based (works without Docker)
// No ioredis needed — uses HTTP requests to Upstash
// ================================================================
const https = require('https');

class UpstashRedis {
  constructor() {
    this.url = process.env.UPSTASH_REDIS_REST_URL;
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!this.url || !this.token) {
      console.warn('[Redis] Upstash credentials missing — cache disabled, app will still work');
      this.disabled = true;
    }
  }

  async _request(command) {
    if (this.disabled) return null;
    
    return new Promise((resolve) => {
      const body = JSON.stringify(command);
      const url = new URL(this.url);
      
      const options = {
        hostname: url.hostname,
        path: '/',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.result !== undefined ? parsed.result : null);
          } catch {
            resolve(null);
          }
        });
      });

      req.on('error', () => resolve(null)); // Graceful fail
      req.setTimeout(3000, () => { req.destroy(); resolve(null); });
      req.write(body);
      req.end();
    });
  }

  async get(key) {
    return this._request(['GET', key]);
  }

  async set(key, value, ...args) {
    const cmd = ['SET', key, typeof value === 'object' ? JSON.stringify(value) : String(value)];
    // Handle EX (expiry) option
    if (args.length >= 2 && args[0] === 'EX') cmd.push('EX', args[1]);
    return this._request(cmd);
  }

  async setex(key, seconds, value) {
    return this._request(['SET', key, typeof value === 'object' ? JSON.stringify(value) : String(value), 'EX', seconds]);
  }

  async del(key) {
    return this._request(['DEL', key]);
  }

  async exists(key) {
    return this._request(['EXISTS', key]);
  }

  async expire(key, seconds) {
    return this._request(['EXPIRE', key, seconds]);
  }

  async ttl(key) {
    return this._request(['TTL', key]);
  }

  async incr(key) {
    return this._request(['INCR', key]);
  }

  async hset(key, field, value) {
    return this._request(['HSET', key, field, String(value)]);
  }

  async hget(key, field) {
    return this._request(['HGET', key, field]);
  }

  async hgetall(key) {
    return this._request(['HGETALL', key]);
  }

  async sadd(key, ...members) {
    return this._request(['SADD', key, ...members]);
  }

  async smembers(key) {
    return this._request(['SMEMBERS', key]);
  }

  async ping() {
    return this._request(['PING']);
  }

  // For compatibility with ioredis connect pattern
  async connect() {
    if (this.disabled) return;
    const result = await this.ping();
    if (result === 'PONG') {
      console.log('[Redis] ✅ Upstash Redis connected');
    }
    return this;
  }

  on(event, handler) {
    // No-op for compatibility
    return this;
  }
}

// Singleton instance
let instance = null;

const getRedis = () => {
  if (!instance) instance = new UpstashRedis();
  return instance;
};

const connectRedis = async () => {
  instance = new UpstashRedis();
  await instance.connect();
  return instance;
};

module.exports = { UpstashRedis, getRedis, connectRedis };
