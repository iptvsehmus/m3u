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

// Yönlendirme yerine yayını Vercel üzerinden proxy yaparak aktarır (TR engelini aşar)
app.get('/play/:id.m3u8', async (req, res) => {
  const id = req.params.id;
  try {
    const authRes = await fetch('https://www.vavoo.tv/api/box/ping2', {
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
    const authData = await authRes.json();
    const sig = authData?.response?.signed || authData?.signed || '';

    const targetUrl = sig
      ? `https://vavoo.to/play/${id}/index.m3u8?n=${encodeURIComponent(sig)}`
      : `https://vavoo.to/play/${id}/index.m3u8`;

    const streamRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'VAVOO/2.6' }
    });

    if (!streamRes.ok) {
      return res.status(streamRes.status).send('Kaynak akis hatasi: ' + streamRes.status);
    }

    let m3u8Text = await streamRes.text();
    const baseUrl = streamRes.url.substring(0, streamRes.url.lastIndexOf('/') + 1);

    // Göreli segment (.ts) yollarını tam adreslere çevir
    m3u8Text = m3u8Text.replace(/^(?!#)(?!http)(.+)$/gm, (line) => {
      return baseUrl + line.trim();
    });

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(m3u8Text);
  } catch (err) {
    res.status(500).send('Proxy hatasi: ' + err.message);
  }
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));
