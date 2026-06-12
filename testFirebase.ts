import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  try {
    const docRef = doc(db, 'appData', 'main');
    const snap = await getDoc(docRef);
    console.log("Read success:", snap.exists());
    await setDoc(docRef, { test: 1 }, { merge: true });
    console.log("Write success");
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
