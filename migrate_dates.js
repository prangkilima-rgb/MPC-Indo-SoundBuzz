import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = config.firestoreDatabaseId ? getFirestore(app, config.firestoreDatabaseId) : getFirestore(app);

function parseToIso(dateStr) {
  if (!dateStr) return null;
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

  // Try to parse as DD/MM/YYYY or MM/DD/YYYY
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    let y, m, d;
    if (parts[2].length === 4) {
      y = parseInt(parts[2]);
      const p0 = parseInt(parts[0]);
      const p1 = parseInt(parts[1]);
      
      if (p0 > 12) { d = p0; m = p1; }
      else if (p1 > 12) { m = p0; d = p1; }
      else {
        const dateMD = new Date(y, p0 - 1, p1);
        const dateDM = new Date(y, p1 - 1, p0);
        const now = new Date('2026-08-04T00:00:00Z'); 
        
        if (dateDM > now) {
          m = p0; d = p1;
        } else if (dateMD > now) {
          d = p0; m = p1;
        } else {
          m = p0; d = p1;
        }
      }
    } else if (parts[0].length === 4) {
      y = parseInt(parts[0]);
      m = parseInt(parts[1]);
      d = parseInt(parts[2]);
    }
    
    if (y && m && d) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return dateStr;
}

async function run() {
  console.log('Starting migration...');
  const q = collection(db, "appData");
  const querySnapshot = await getDocs(q);
  
  for (const document of querySnapshot.docs) {
    const data = document.data();
    let modified = false;
    
    if (data.users) {
      data.users = data.users.map(user => {
        let userModified = false;
        
        if (user.checkInHistory) {
          const newHistory = [...new Set(user.checkInHistory.map(parseToIso).filter(Boolean))];
          if (JSON.stringify(newHistory) !== JSON.stringify(user.checkInHistory)) {
            user.checkInHistory = newHistory;
            userModified = true;
          }
        }
        
        if (user.patchedDates) {
          const newPatched = [...new Set(user.patchedDates.map(parseToIso).filter(Boolean))];
          if (JSON.stringify(newPatched) !== JSON.stringify(user.patchedDates)) {
            user.patchedDates = newPatched;
            userModified = true;
          }
        }
        
        if (user.extraPointsClaimedDates) {
          const newClaimed = {};
          for (const [k, v] of Object.entries(user.extraPointsClaimedDates)) {
            const pk = parseToIso(k);
            if (pk) newClaimed[pk] = v;
          }
          if (JSON.stringify(newClaimed) !== JSON.stringify(user.extraPointsClaimedDates)) {
            user.extraPointsClaimedDates = newClaimed;
            userModified = true;
          }
        }
        
        if (user.lastCheckInDate) {
          const newLast = parseToIso(user.lastCheckInDate);
          if (newLast && newLast !== user.lastCheckInDate) {
            user.lastCheckInDate = newLast;
            userModified = true;
          }
        }
        
        if (userModified) modified = true;
        return user;
      });
    }
    
    if (data.dailyUsedLastFmAccounts) {
      const newDaily = {};
      for (const [k, v] of Object.entries(data.dailyUsedLastFmAccounts)) {
        const pk = parseToIso(k);
        if (pk) newDaily[pk] = v;
      }
      if (JSON.stringify(newDaily) !== JSON.stringify(data.dailyUsedLastFmAccounts)) {
        data.dailyUsedLastFmAccounts = newDaily;
        modified = true;
      }
    }
    
    if (modified) {
      await setDoc(doc(db, "appData", document.id), data);
      console.log(`Updated document: ${document.id}`);
    } else {
      console.log(`No changes for document: ${document.id}`);
    }
  }
  console.log('Migration complete.');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
