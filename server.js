const express = require('express');
const app = express();

app.use(express.static('public'));

app.get('/api/releases', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const response = await fetch(
      'https://api.github.com/repos/muwanindia345-beep/Luciagram-/releases',
      { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'LuciaStore' } }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('LuciaStore running on port ' + PORT));

app.get('/download/:channel', async (req, res) => {
  try {
    const { default: fetch } = await import('node-fetch');
    const releases = await (await fetch(
      'https://api.github.com/repos/muwanindia345-beep/Luciagram-/releases',
      { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'LuciaStore' } }
    )).json();
    const isBeta = req.params.channel === 'beta';
    const release = releases.find(r => r.prerelease === isBeta);
    const apk = release?.assets?.find(a => a.name.endsWith('.apk'));
    if (!apk) return res.status(404).json({ error: 'APK not found' });
    res.redirect(apk.browser_download_url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
