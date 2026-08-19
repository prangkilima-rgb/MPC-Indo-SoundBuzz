const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const docRef = doc(db, 'appData', 'main');
  const snap = await getDoc(docRef);
  const data = snap.data();
  
  if (data && data.users) {
      let modified = false;
      const newUsers = data.users.map(u => {
          if (u.appUsername === 'alsukorejoi') { // wait, prangkilima's appUsername is 'alsukorejoi'
              const history = u.checkInHistory || [];
              if (!history.includes('2026-08-18')) {
                  history.push('2026-08-18');
                  // sort history just in case
                  history.sort();
                  u.checkInHistory = history;
                  modified = true;
                  console.log('Restored 2026-08-18 for alsukorejoi');
              }
          }
          return u;
      });
      if (modified) {
          await setDoc(docRef, { ...data, users: newUsers });
          console.log('Saved.');
      } else {
          console.log('Already exists or user not found.');
      }
  }
  process.exit(0);
}
run().catch(console.error);
