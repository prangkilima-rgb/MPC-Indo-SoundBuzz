function getWeeklyHistoryForDate(dateStr) {
    const date = new Date(dateStr);
    const currentDay = date.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    
    const days = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
}

const days = getWeeklyHistoryForDate('2026-08-19T12:00:00');
days.forEach(d => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoString = `${y}-${m}-${day}`;
    console.log(d.toDateString(), isoString);
});
