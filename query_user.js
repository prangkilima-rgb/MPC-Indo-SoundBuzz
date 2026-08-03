import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

async function run() {
  const q = collection(db, "appData");
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.users) {
        const user = data.users.find(u => u.appUsername === 'alsukorejoi');
        if (user) {
            console.log("Checkin history for alsukorejoi:");
            console.log(user.checkInHistory);
        }
    }
  });
  process.exit(0);
}
run().catch(e => {
  console.error(e);
  process.exit(1);
});
