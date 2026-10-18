const fetch = require('node-fetch');

async function check() {
  const username = 'prangkilima';
  const apiKey = 'b1b1dffdab7bfcefce5047e611a857ee';
  
  // Date Oct 18, 2026 in Jakarta (UTC+7)
  const dStart = new Date('2026-10-18T00:00:00+07:00');
  const dEnd = new Date('2026-10-18T23:59:59+07:00');
  const from = Math.floor(dStart.getTime() / 1000);
  const to = Math.floor(dEnd.getTime() / 1000);
  
  console.log('Checking from:', from, 'to:', to);
  const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=50&from=${from}&to=${to}`;
  const res = await fetch(url);
  const data = await res.json();
  
  console.log('Total tracks on 2026-10-18 (TODAY):', data.recenttracks ? data.recenttracks['@attr']?.total : 'None');
  if (data.recenttracks && data.recenttracks.track) {
    const tracks = Array.isArray(data.recenttracks.track) ? data.recenttracks.track : [data.recenttracks.track];
    console.log('Tracks count:', tracks.length);
    tracks.slice(0, 10).forEach(t => console.log(`- ${t.name} by ${t.artist['#text']}`));
  }
}
check().catch(console.error);
