const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const manifest = {
  id: "org.stremio.autoplay.best",
  version: "1.0.0",
  name: "AutoPlay Best Stream",
  description: "Autoplays the best stream (highest resolution + most seeders) from existing sources.",
  types: ["movie", "series"],
  catalogs: [],
  resources: ["stream"],
  idPrefixes: ["tt"]
};

const builder = new addonBuilder(manifest);

// Add-on sources to fetch streams from (you can add more)
const sources = [
  "https://torrentio.strem.fun",
  "https://mediafusion.strem.fun"
];

builder.defineStreamHandler(async ({ type, id }) => {
  let allStreams = [];

  for (const baseUrl of sources) {
    try {
      const res = await fetch(`${baseUrl}/stream/${type}/${id}.json`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          allStreams.push(...data);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch from ${baseUrl}:`, err);
    }
  }

  // Scoring streams: higher resolution and more seeders = better
  const scoreStream = (s) => {
    const resolutionMatch = s.title?.match(/(\d{3,4})p/);
    const resolution = resolutionMatch ? parseInt(resolutionMatch[1]) : 0;
    const seedersMatch = s.title?.match(/(\d+)\s+seeders/i);
    const seeders = seedersMatch ? parseInt(seedersMatch[1]) : 0;
    return resolution * 1000 + seeders;
  };

  const bestStream = allStreams
    .filter(s => s.infoHash || s.url) // ensure it's playable
    .sort((a, b) => scoreStream(b) - scoreStream(a))[0];

  return {
    streams: bestStream ? [bestStream] : []
  };
});

module.exports = builder.getInterface();
