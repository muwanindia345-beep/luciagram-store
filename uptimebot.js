const https = require('https');
const http = require('http');

class StoreUptimeBot {
  constructor() {
    this.services = [
      { name: 'LuciaStore', url: 'https://luciagram-store.onrender.com' },
      { name: 'Luciagram Backend', url: 'https://luciagram-backend.onrender.com' },
      { name: 'Luciagram Frontend', url: 'https://luciagram.onrender.com' },
    ];
    this.pingCount = 0;
    this.startTime = Date.now();
    this.failCounts = {};
    this.services.forEach(s => this.failCounts[s.name] = 0);
  }

  ping(service) {
    return new Promise((resolve) => {
      const start = Date.now();
      const client = service.url.startsWith('https') ? https : http;
      const req = client.get(service.url, (res) => {
        res.resume();
        const ms = Date.now() - start;
        const status = res.statusCode < 400 ? 'UP' : 'DEGRADED';
        resolve({ status, ms, code: res.statusCode });
      });
      req.on('error', () => resolve({ status: 'DOWN', ms: 0, code: 0 }));
      req.setTimeout(12000, () => {
        req.destroy();
        resolve({ status: 'TIMEOUT', ms: 12000, code: 0 });
      });
    });
  }

  getUptime() {
    const diff = Date.now() - this.startTime;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  }

  async pingAll() {
    this.pingCount++;
    const time = new Date().toLocaleTimeString();
    console.log(`\n🤖 [Ping #${this.pingCount}] ${time} | Uptime: ${this.getUptime()}`);
    console.log('─'.repeat(45));
    for (const svc of this.services) {
      const r = await this.ping(svc);
      const icon = r.status === 'UP' ? '🟢' : r.status === 'DOWN' ? '🔴' : '🟡';
      console.log(`${icon} ${svc.name} — ${r.status} | ${r.ms}ms | HTTP ${r.code}`);
      if (r.status !== 'UP') {
        this.failCounts[svc.name] = (this.failCounts[svc.name] || 0) + 1;
        if (this.failCounts[svc.name] >= 3) {
          console.log(`   ⚠️  ${svc.name} DOWN 3x in a row!`);
        }
        if (r.status === 'DOWN') {
          console.log(`   🔄 Retrying in 60s...`);
          setTimeout(() => this.ping(svc).then(res => {
            console.log(`   🔁 Retry: ${svc.name} ${res.status} (${res.ms}ms)`);
            if (res.status === 'UP') this.failCounts[svc.name] = 0;
          }), 60000);
        }
      } else {
        this.failCounts[svc.name] = 0;
      }
    }
  }

  getReport() {
    return {
      botUptime: this.getUptime(),
      pingCount: this.pingCount,
      services: this.services.map(s => ({
        name: s.name,
        failStreak: this.failCounts[s.name] || 0,
      })),
    };
  }

  start() {
    console.log('🚀 StoreUptimeBot started!');
    this.services.forEach(s => console.log(`   → ${s.url}`));
    this.pingAll();
    setInterval(() => this.pingAll(), 5 * 60 * 1000);
  }
}

module.exports = StoreUptimeBot;
