const express = require('express');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.static('public'));
app.use(express.json());

const StoreUptimeBot = require('./uptimebot');
const bot = new StoreUptimeBot();
bot.start();

const REPO = 'muwanindia345-beep/Luciagram-';
const NATIVE_REPO = 'muwanindia345-beep/Luciagram-native';
const RATINGS_FILE = './ratings.json';

function loadRatings() {
  try { return JSON.parse(fs.readFileSync(RATINGS_FILE)); }
  catch { return { total: 0, count: 0 }; }
}

async function githubFetch(path) {
  const { default: fetch } = await import('node-fetch');
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'LuciaStore' };
  if (process.env.GITHUB_TOKEN) headers['Authorization'] = 'token ' + process.env.GITHUB_TOKEN;
  const res = await fetch('https://api.github.com' + path, { headers });
  if (!res.ok) throw new Error('GitHub API error: ' + res.status);
  return res.json();
}

app.get('/api/releases', async (req, res) => {
  try {
    // Stable = Capacitor repo (manual releases)
    // Beta = React Native repo (GitHub Actions)
    const [stable, beta] = await Promise.all([
      githubFetch('/repos/' + REPO + '/releases').catch(() => []),
      githubFetch('/repos/' + NATIVE_REPO + '/releases').catch(() => []),
    ]);
    const stableRelease = stable.find(r => !r.prerelease) || null;
    const betaRelease = beta.find(r => r) || null; // latest from native
    res.json({ stableRelease, betaRelease });
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/rating', (req, res) => {
  const r = loadRatings();
  res.json({ avg: r.count > 0 ? (r.total/r.count).toFixed(1) : '0', count: r.count });
});

app.post('/api/rating', (req, res) => {
  const stars = parseInt(req.body.stars);
  if (!stars || stars < 1 || stars > 5) return res.status(400).json({ error: 'Invalid' });
  const r = loadRatings();
  r.total += stars; r.count += 1;
  fs.writeFileSync(RATINGS_FILE, JSON.stringify(r));
  res.json({ avg: (r.total/r.count).toFixed(1), count: r.count });
});

app.get('/download/:channel', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const isBeta = req.params.channel === 'beta';
    const repo = isBeta ? NATIVE_REPO : REPO;
    const releases = await githubFetch('/repos/' + repo + '/releases');
    const release = isBeta
      ? releases[0]
      : releases.find(r => !r.prerelease);
    const apk = release?.assets?.find(a => a.name.endsWith('.apk'));
    if (!apk) return res.status(404).json({ error: 'APK not found' });
    const apkRes = await fetch(apk.browser_download_url);
    if (!apkRes.ok) throw new Error('Failed to fetch APK');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="LuciaGram-' + req.params.channel + '.apk"');
    res.setHeader('Content-Length', apk.size);
    apkRes.body.pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// OTA check API — Luciagram APK yeh call karega
app.get('/api/check-update', async (req, res) => {
  try {
    const { channel = 'stable', currentVersion = '' } = req.query;
    const isBeta = channel === 'beta';
    const repo = isBeta ? NATIVE_REPO : REPO;
    const releases = await githubFetch('/repos/' + repo + '/releases');
    const release = isBeta ? releases[0] : releases.find(r => !r.prerelease);
    if (!release) return res.json({ hasUpdate: false });
    const apk = release.assets.find(a => a.name.endsWith('.apk'));
    const latestVersion = release.tag_name;
    const hasUpdate = currentVersion !== latestVersion;
    res.json({
      hasUpdate,
      latestVersion,
      currentVersion,
      size: apk ? Math.round(apk.size / 1024 / 1024 * 10) / 10 + ' MB' : '',
      changelog: release.body || 'Bug fixes and improvements.',
      downloadUrl: '/download/' + channel,
      publishedAt: release.published_at,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/check-update', async (req, res) => {
  try {
    const { channel = 'stable', currentVersion = '' } = req.query;
    const isBeta = channel === 'beta';
    const repo = isBeta ? NATIVE_REPO : REPO;
    const releases = await githubFetch('/repos/' + repo + '/releases');
    const release = isBeta ? releases[0] : releases.find(r => !r.prerelease);
    if (!release) return res.json({ hasUpdate: false });
    const apk = release.assets.find(a => a.name.endsWith('.apk'));
    const latestVersion = release.tag_name;
    const hasUpdate = currentVersion !== latestVersion;
    res.json({
      hasUpdate,
      latestVersion,
      currentVersion,
      size: apk ? (apk.size / 1024 / 1024).toFixed(1) + ' MB' : '',
      changelog: release.body || 'Bug fixes and improvements.',
      downloadUrl: '/download/' + channel,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/status', (req, res) => res.json({ app: 'LuciaStore', version: '2.0.0', ...bot.getReport() }));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('✨ LuciaStore running on port ' + PORT));
