const express = require('express');
const fs = require('fs');
const router = express.Router();

const habitsFile = './data/habits.json';

const loadHabits = () => JSON.parse(fs.readFileSync(habitsFile, 'utf8'));
const saveHabits = (habits) => fs.writeFileSync(habitsFile, JSON.stringify(habits, null, 2));

const defaultHabits = {
  read: false,
  meditate: false,
  workout: false,
  journal: false,
};

// GET habits for today
router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const habits = loadHabits();

  let todayEntry = habits.find(h => h.date === today);

  if (!todayEntry) {
    todayEntry = { date: today, habits: { ...defaultHabits } };
    habits.push(todayEntry);
    saveHabits(habits);
  }

  res.json(todayEntry);
});

// Toggle a specific habit
router.post('/toggle', (req, res) => {
  const { date, habitKey } = req.body;

  if (!date || !habitKey) {
    return res.status(400).json({ error: 'Date and habitKey are required.' });
  }

  const habits = loadHabits();
  const entryIndex = habits.findIndex(h => h.date === date);

  if (entryIndex === -1) {
    return res.status(404).json({ error: `No entry found for ${date}.` });
  }

  habits[entryIndex].habits[habitKey] = !habits[entryIndex].habits[habitKey];
  saveHabits(habits);

  res.json({ message: `Toggled ${habitKey}`, habits: habits[entryIndex] });
});


// GET last 7 days of habits
router.get('/weekly', (req, res) => {
  const habits = loadHabits();

  // Get the current date and subtract 6 days to get the past 7-day range
  const today = new Date();
  const pastWeekDates = [...Array(7)].map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const lastWeek = pastWeekDates.map(date => {
    const entry = habits.find(h => h.date === date);
    return entry || { date, habits: { read: false, meditate: false, workout: false, journal: false } };
  });

  res.json(lastWeek);
});


module.exports = router;
