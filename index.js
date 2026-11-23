const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const CATALOG_URL = 'https://nuvio-kool-ws.vercel.app/catalog/tv/kool_live_tv/genre=Turkey.json';

// Vavoo / Kool.to yayınları için geçici imza (auth) üretir
async function getVavooAuth() {
  const res = await fetch('https://www.vavoo.tv/api/box/ping2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'VAVOO/2.6'
    },
    body: JSON.stringify({
      vec: '1.0',
      pkg: 'tv.vavoo.app',
      v: '2.6',
      id: '0000000000000000'
    })
  });
  const data = await res.json();
  return data?.response?.signed || data?.signed || '';
}

// Türkiye M3U listesi
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
      m3u += `#EXTVLCOPT:http-user-agent=VAVOO/2.6\n`;
      m3u += `${host}/play/${rawId}.m3u8\n`;
    }

    res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
    res.send(m3u);
  } catch (err) {
    res.status(500).send('Hata: ' + err.message);
  }
});

// İmzalı yayın akışına yönlendirir
app.get('/play/:id.m3u8', async (req, res) => {
  const id = req.params.id;
  try {
    const sig = await getVavooAuth();
    const targetUrl = sig
      ? `https://vavoo.to/play/${id}/index.m3u8?n=${encodeURIComponent(sig)}`
      : `https://vavoo.to/play/${id}/index.m3u8`;

    res.redirect(302, targetUrl);
  } catch (err) {
    res.status(500).send('Yayin hatasi: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));
