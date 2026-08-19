const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');
const fs = require('fs');
const fetch = require('node-fetch');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function checkLastFm(username, apiKey, dateStr) {
    if (!username) return 0;
    const date = new Date(dateStr + 'T00:00:00+07:00'); // using Jakarta time
    const from = Math.floor(date.getTime() / 1000);
    const to = Math.floor(new Date(dateStr + 'T23:59:59+07:00').getTime() / 1000);
    
    const keyToUse = apiKey || 'b1b1dffdab7bfcefce5047e611a857ee';
    
    let url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${keyToUse}&format=json&limit=1&from=${from}&to=${to}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.recenttracks && data.recenttracks['@attr']) {
            return parseInt(data.recenttracks['@attr'].total || 0);
        }
        return 0;
    } catch (e) {
        return 0;
    }
}

async function run() {
  const docRef = doc(db, 'appData', 'main');
  const snap = await getDoc(docRef);
  const data = snap.data();
  
  const datesToCheck = ['2026-08-17', '2026-08-18'];
  let modified = false;
  
  if (data && data.users) {
      const newUsers = [];
      for (const u of data.users) {
          const history = u.checkInHistory || [];
          let userModified = false;
          
          for (const date of datesToCheck) {
              if (!history.includes(date)) {
                  const totalTracks = await checkLastFm(u.lastFmUsername || u.appUsername, u.lastFmApiKey, date);
                  if (totalTracks > 0) {
                      history.push(date);
                      userModified = true;
                      modified = true;
                      console.log(`Restored check-in for ${u.appUsername} on ${date}`);
                  }
              }
          }
          
          if (userModified) {
              history.sort();
              u.checkInHistory = history;
          }
          newUsers.push(u);
      }
      
      if (modified) {
          await setDoc(docRef, { ...data, users: newUsers });
          console.log('Saved all restored check-ins.');
      } else {
          console.log('No check-ins needed restoring.');
      }
  }
  process.exit(0);
}
run().catch(console.error);
