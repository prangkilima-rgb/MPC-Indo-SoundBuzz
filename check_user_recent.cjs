const fetch = require('node-fetch');

async function check() {
  const username = 'prangkilima';
  const apiKey = 'b1b1dffdab7bfcefce5047e611a857ee';
  
  const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=50`;
  const res = await fetch(url);
  const data = await res.json();
  
  if (data.recenttracks && data.recenttracks.track) {
    const tracks = Array.isArray(data.recenttracks.track) ? data.recenttracks.track : [data.recenttracks.track];
    console.log('Most recent 15 tracks played:');
    tracks.slice(0, 15).forEach(t => {
      console.log(`- ${t.name} by ${t.artist['#text']} [${t.date ? t.date['#text'] : (t['@attr']?.nowplaying ? 'NOW PLAYING' : 'No date')}]`);
    });
  }
}
check().catch(console.error);
