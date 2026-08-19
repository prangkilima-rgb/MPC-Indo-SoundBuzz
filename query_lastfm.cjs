const username = 'prangkilima';
const apiKey = 'b1b1dffdab7bfcefce5047e611a857ee';
const fetch = require('node-fetch');

async function run() {
    const from = Math.floor(new Date('2026-08-18T00:00:00+07:00').getTime() / 1000);
    const to = Math.floor(new Date('2026-08-18T23:59:59+07:00').getTime() / 1000);
    
    let url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=200&from=${from}&to=${to}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(`Found ${data.recenttracks?.track?.length || 0} tracks for ${username} on 18th.`);
    if (data.recenttracks?.track?.length > 0) {
        console.log("Sample track 1:", data.recenttracks.track[0]);
    }
}
run().catch(console.error);
