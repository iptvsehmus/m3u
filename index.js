const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const CATALOG_URL = 'https://nuvio-kool-ws.vercel.app/catalog/tv/kool_live_tv/genre=Turkey.json';

app.get(['/', '/tr.m3u'], async (req, res) => {
  try {
    const response = await fetch(CATALOG_URL);
    const data = await response.json();
    const metas = data.metas || [];

    const host = `${req.protocol}://${req.get('host')}`;
    let m3u = '#EXTM3U\n';

    for (const ch of metas) {
      const rawId = ch.id.split(':').pop();
      const name = (ch.name || 'Kanal').replace(/,/g, ' ');
      const logo = ch.poster || '';

      m3u += `#EXTINF:-1 tvg-id="${rawId}" tvg-name="${name}" tvg-logo="${logo}" group-title="Turkiye",${name}\n`;
      m3u += `${host}/play/${rawId}.m3u8\n`;
    }

    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.send(m3u);
  } catch (err) {
    res.status(500).send('Hata: ' + err.message);
  }
});

// Yayın linkini çözer ve yönlendirir
app.get('/play/:id.m3u8', async (req, res) => {
  const id = req.params.id;

  try {
    // 1. Önce nuvio-kool-ws stream endpoint'ini tireli formatla (kool-live:) dene
    const nuvioRes = await fetch(`https://nuvio-kool-ws.vercel.app/stream/tv/kool-live:${id}.json`);
    if (nuvioRes.ok) {
      const nuvioData = await nuvioRes.json();
      if (nuvioData.streams && nuvioData.streams.length > 0 && nuvioData.streams[0].url) {
        return res.redirect(302, nuvioData.streams[0].url);
      }
    }

    // 2. Olmazsa Vavoo/Kool.to play adresini VAVOO User-Agent ile takip edip gerçek URL'yi al
    const vavooRes = await fetch(`https://vavoo.to/play/${id}/index.m3u8`, {
      headers: { 'User-Agent': 'VAVOO/2.6' },
      redirect: 'follow'
    });

    if (vavooRes.ok && vavooRes.url) {
      return res.redirect(302, vavooRes.url);
    }

    res.status(502).send('Yayin kaynagi bulunamadi');
  } catch (err) {
    res.status(500).send('Yayin hatasi: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));
