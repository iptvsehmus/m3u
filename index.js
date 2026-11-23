const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const KOOL_API = 'https://kool.to';

// Türkiye kanalları için M3U listesi üretir
app.get('/tr.m3u', async (req, res) => {
  try {
    const response = await fetch(`${KOOL_API}/channels`, {
      headers: { 'User-Agent': 'VAVOO/2.6' }
    });
    const channels = await response.json();
    const trChannels = channels.filter(c => c.country === 'Turkey');

    const host = `${req.protocol}://${req.get('host')}`;
    let m3u = '#EXTM3U\n';

    for (const ch of trChannels) {
      const name = ch.name.replace(/,/g, ' ');
      m3u += `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${name}" group-title="Turkiye",${name}\n`;
      m3u += `${host}/play/${ch.id}.m3u8\n`;
    }

    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.send(m3u);
  } catch (err) {
    res.status(500).send('Liste alinamadi: ' + err.message);
  }
});

// Kanal tıklandığında güncel yayın adresine yönlendirir
app.get('/play/:id.m3u8', async (req, res) => {
  try {
    const streamUrl = `${KOOL_API}/play/${req.params.id}/index.m3u8`;
    res.redirect(302, streamUrl);
  } catch (err) {
    res.status(500).send('Yayin hatasi');
  }
});

app.get('/', (req, res) => {
  res.send('Kool M3U Proxy Aktif. Liste adresi: /tr.m3u');
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));
