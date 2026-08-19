const fs = require('fs');

let content = fs.readFileSync('services/storage.ts', 'utf8');

if (!content.includes('runTransaction')) {
    content = content.replace(/import { doc, getDoc, setDoc } from 'firebase\/firestore';/, "import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';");
}

const transactionHelper = `
  async _runTransaction(updateFn: (data: AppData) => AppData): Promise<AppData> {
    try {
        const config = await import('../firebase-applet-config.json');
        if (!config.projectId || config.projectId.includes('remixed-project-id')) {
          // Local fallback
          const data = await this._fetchFullData();
          const newData = updateFn(data);
          this._updateLocalCache(newData);
          return newData;
        }

        const docRef = doc(db, 'appData', 'main');
        let finalData: AppData | null = null;
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);
            const data: AppData = docSnap.exists() ? docSnap.data() as AppData : { users: [], tracks: [] };
            const newData = updateFn(data);
            transaction.set(docRef, newData);
            finalData = newData;
        });
        
        if (finalData) {
            this._updateLocalCache(finalData);
            return finalData;
        }
        throw new Error("Transaction failed to return data");
    } catch (e: any) {
        if (e.message?.includes('Firebase not provisioned')) {
          const data = await this._fetchFullData();
          const newData = updateFn(data);
          this._updateLocalCache(newData);
          return newData;
        } else {
          console.error("Transaction Error, saving locally only:", e);
          const data = await this._fetchFullData();
          const newData = updateFn(data);
          this._updateLocalCache(newData);
          return newData;
        }
    }
  },
`;

if (!content.includes('_runTransaction')) {
    content = content.replace('_updateLocalCache(data: AppData) {', transactionHelper + '\n  _updateLocalCache(data: AppData) {');
}

// Now replace methods to use _runTransaction
// registerUser
content = content.replace(
`  async registerUser(newUser: User): Promise<User> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    
    if (users.some(u => u.appUsername.toLowerCase() === newUser.appUsername.toLowerCase())) {
      throw new Error('Username already taken');
    }
    
    const updatedUsers = [...users, newUser];
    const newData = { ...data, users: updatedUsers };
    
    await this._saveFullData(newData);
    return newUser;
  },`,
`  async registerUser(newUser: User): Promise<User> {
    await this._runTransaction((data) => {
      const users = Array.isArray(data.users) ? data.users : [];
      if (users.some(u => u.appUsername.toLowerCase() === newUser.appUsername.toLowerCase())) {
        throw new Error('Username already taken');
      }
      return { ...data, users: [...users, newUser] };
    });
    return newUser;
  },`
);

// updateUserCheckIn
content = content.replace(
`  async updateUserCheckIn(userId: string, dateString: string, usedLastFmUsername: string | string[]): Promise<User> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    let updatedUser: User | null = null;
    
    // Track Last Fm Account usage to prevent 1 account being used multiple times a day
    const dailyUsedMap = data.dailyUsedLastFmAccounts || {};
    const usedToday = dailyUsedMap[dateString] || [];
    
    if (usedLastFmUsername) {
        const usernames = Array.isArray(usedLastFmUsername) ? usedLastFmUsername : [usedLastFmUsername];
        usernames.forEach(username => {
            if (!usedToday.includes(username)) {
                usedToday.push(username);
            }
        });
        dailyUsedMap[dateString] = usedToday;
    }

    const newUsers = users.map(u => {
      if (u.id === userId) {
        const history = u.checkInHistory || [];
        if (!history.includes(dateString)) {
          history.push(dateString);
        }
        // If checking in for today, update lastCheckInDate as well for backward compatibility
        const t = new Date();
        const tY = t.getFullYear();
        const tM = String(t.getMonth() + 1).padStart(2, '0');
        const tD = String(t.getDate()).padStart(2, '0');
        const todayStr = \`\${tY}-\${tM}-\${tD}\`;
        const newLastCheckIn = dateString === todayStr ? dateString : u.lastCheckInDate;
        
        updatedUser = { ...u, lastCheckInDate: newLastCheckIn, checkInHistory: history };
        return updatedUser;
      }
      return u;
    });

    if (!updatedUser) throw new Error('User not found');
    
    await this._saveFullData({ ...data, users: newUsers, dailyUsedLastFmAccounts: dailyUsedMap });
    return updatedUser!;
  },`,
`  async updateUserCheckIn(userId: string, dateString: string, usedLastFmUsername: string | string[]): Promise<User> {
    let updatedUser: User | null = null;
    await this._runTransaction((data) => {
        const users = Array.isArray(data.users) ? data.users : [];
        const dailyUsedMap = data.dailyUsedLastFmAccounts || {};
        const usedToday = [...(dailyUsedMap[dateString] || [])];
        
        if (usedLastFmUsername) {
            const usernames = Array.isArray(usedLastFmUsername) ? usedLastFmUsername : [usedLastFmUsername];
            usernames.forEach(username => {
                if (!usedToday.includes(username)) {
                    usedToday.push(username);
                }
            });
            dailyUsedMap[dateString] = usedToday;
        }

        const newUsers = users.map(u => {
          if (u.id === userId) {
            const history = [...(u.checkInHistory || [])];
            if (!history.includes(dateString)) {
              history.push(dateString);
            }
            const t = new Date();
            const tY = t.getFullYear();
            const tM = String(t.getMonth() + 1).padStart(2, '0');
            const tD = String(t.getDate()).padStart(2, '0');
            const todayStr = \`\${tY}-\${tM}-\${tD}\`;
            const newLastCheckIn = dateString === todayStr ? dateString : u.lastCheckInDate;
            
            updatedUser = { ...u, lastCheckInDate: newLastCheckIn, checkInHistory: history };
            return updatedUser;
          }
          return u;
        });

        if (!updatedUser) throw new Error('User not found');
        return { ...data, users: newUsers, dailyUsedLastFmAccounts: dailyUsedMap };
    });
    return updatedUser!;
  },`
);

// updateUserProfile
content = content.replace(
`  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    let updatedUser: User | null = null;
    
    const newUsers = users.map(u => {
      if (u.id === userId) {
        updatedUser = { ...u, ...updates };
        return updatedUser;
      }
      return u;
    });

    if (!updatedUser) throw new Error('User not found');
    
    await this._saveFullData({ ...data, users: newUsers });
    return updatedUser!;
  },`,
`  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    let updatedUser: User | null = null;
    await this._runTransaction((data) => {
        const users = Array.isArray(data.users) ? data.users : [];
        const newUsers = users.map(u => {
          if (u.id === userId) {
            updatedUser = { ...u, ...updates };
            return updatedUser;
          }
          return u;
        });

        if (!updatedUser) throw new Error('User not found');
        return { ...data, users: newUsers };
    });
    return updatedUser!;
  },`
);

// deleteUser
content = content.replace(
`  async deleteUser(userId: string): Promise<void> {
    const data = await this._fetchFullData();
    const users = Array.isArray(data.users) ? data.users : [];
    const newUsers = users.filter(u => u.id !== userId);
    await this._saveFullData({ ...data, users: newUsers });
  },`,
`  async deleteUser(userId: string): Promise<void> {
    await this._runTransaction((data) => {
        const users = Array.isArray(data.users) ? data.users : [];
        const newUsers = users.filter(u => u.id !== userId);
        return { ...data, users: newUsers };
    });
  },`
);

// saveWeeklySchedule
content = content.replace(
`  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
    const data = await this._fetchFullData();
    await this._saveFullData({ ...data, weeklySchedule: schedule });
  },`,
`  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
    await this._runTransaction((data) => ({ ...data, weeklySchedule: schedule }));
  },`
);

// saveAdminPin
content = content.replace(
`  async saveAdminPin(newPin: string): Promise<void> {
      const data = await this._fetchFullData();
      await this._saveFullData({ ...data, adminPin: newPin });
  },`,
`  async saveAdminPin(newPin: string): Promise<void> {
      await this._runTransaction((data) => ({ ...data, adminPin: newPin }));
  },`
);

fs.writeFileSync('services/storage.ts', content);
console.log('Fixed storage.ts');
