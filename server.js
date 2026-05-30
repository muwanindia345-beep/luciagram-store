const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.static('public'));

// ===== UPTIME BOT =====
const StoreUptimeBot = require('./uptimebot');
const bot = new StoreUptimeBot();
bot.start();

// ===== GITHUB HELPER =====
const REPO = 'muwanindia345-beep/Luciagram-';

async function githubFetch(path) {
  const { default: fetch } = await import('node-fetch');
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'LuciaStore',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = 'token ' + process.env.GITHUB_TOKEN;
  }
  const res = await fetch('https://api.github.com' + path, { headers });
  if (!res.ok) throw new Error('GitHub API error: ' + res.status);
  return res.json();
}

// ===== ROUTES =====

// Releases list
app.get('/api/releases', async (req, res) => {
  try {
    const data = await githubFetch('/repos/' + REPO + '/releases');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download APK — streams with content-length for progress bar
app.get('/download/:channel', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const releases = await githubFetch('/repos/' + REPO + '/releases');
    const isBeta = req.params.channel === 'beta';
    const release = releases.find(r => r.prerelease === isBeta);
    const apk = release?.assets?.find(a => a.name.endsWith('.apk'));
    if (!apk) return res.status(404).json({ error: 'APK not found. No release published yet.' });

    // Stream APK with proper headers for download progress
    const apkRes = await fetch(apk.browser_download_url);
    if (!apkRes.ok) throw new Error('Failed to fetch APK from GitHub');

    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="LuciaGram-' + req.params.channel + '.apk"');
    res.setHeader('Content-Length', apk.size);
    res.setHeader('Access-Control-Allow-Origin', '*');

    apkRes.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Status
app.get('/status', (req, res) => {
  res.json({
    app: 'LuciaStore',
    version: '2.0.0',
    repo: REPO,
    githubToken: !!process.env.GITHUB_TOKEN,
    ...bot.getReport(),
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✨ LuciaStore running on port ' + PORT);
  console.log('📦 Repo:', REPO);
  console.log('🔑 GitHub Token:', !!process.env.GITHUB_TOKEN);
});
