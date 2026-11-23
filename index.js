const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

const CATALOG_URL = 'https://nuvio-kool-ws.vercel.app/catalog/tv/kool_live_tv/genre=Turkey.json';

// Doğrudan ana adresten (/) ve /tr.m3u üzerinden Türkiye M3U listesi üretir
app.get(['/', '/tr.m3u'], async (req, res) => {
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) {
      throw new Error(`Katalog HTTP ${response.status}`);
    }

    const data = await response.json();
    const metas = data.metas || [];

    const host = `${req.protocol}://${req.get('host')}`;
    let m3u = '#EXTM3U\n';

    for (const ch of metas) {
      // ID formatı: "kool:live:2325261206" -> sadece sayısal ID'yi al
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

// Kanal tıklandığında yayın akışına yönlendirir
app.get('/play/:id.m3u8', async (req, res) => {
  const id = req.params.id;
  res.redirect(302, `https://kool.to/play/${id}/index.m3u8`);
});

app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));
