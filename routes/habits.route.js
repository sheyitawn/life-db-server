const express = require('express');
const router = express.Router();
const { getData, setData, updateData } = require('../utils/firebaseUtils');
const db = require('../firebase');

const defaultHabits = {
  water_1l: false,
  outdoor_walk: false,
  treadmill_30m: false,
  workout: false,
  weigh_in: false
};

// === GET habits for today ===
router.get('/', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  try {
    let habits = await getData('habits') || [];

    // Convert to array if it's an object (like from Firebase)
    if (!Array.isArray(habits)) {
      habits = Object.values(habits);
    }

    // Check if there's already an entry for today
    const existing = habits.find((entry) => entry.date === today);
    if (existing) return res.json(existing);

    // Create a new habit entry
    const newEntry = { date: today, habits: { ...defaultHabits } };

    // Save using the next numeric index
    const newIndex = habits.length;
    await db.ref(`habits/${newIndex}`).set(newEntry);

    res.json(newEntry);
  } catch (err) {
    console.error("Error fetching or creating today's habits:", err);
    res.status(500).json({ error: "Error fetching today's habits" });
  }
});





// === POST /toggle habit (for any date) ===
router.post('/toggle', async (req, res) => {
  let { date, habitKey } = req.body;

  if (!date || !habitKey) {
    return res.status(400).json({ error: 'Both "date" and "habitKey" are required.' });
  }

  try {
    date = new Date(date).toISOString().split('T')[0];
  } catch {
    return res.status(400).json({ error: 'Invalid date format.' });
  }

  try {
    let habits = await getData('habits') || [];

    // Ensure habits is an array
    if (!Array.isArray(habits)) {
      habits = Object.values(habits);
    }

    // Find entry index by date
    const index = habits.findIndex(h => h.date === date);

    if (index === -1) {
      // No entry found – create new
      const newEntry = {
        date,
        habits: { ...defaultHabits, [habitKey]: true }
      };
      const newIndex = habits.length;
      await setData(`habits/${newIndex}`, newEntry);
      return res.json({ message: `Created and toggled "${habitKey}" on ${date}`, habits: newEntry.habits });
    } else {
      // Entry exists – toggle habit
      const entry = habits[index];
      const currentValue = !!entry.habits?.[habitKey];
      const updatedHabits = {
        ...defaultHabits,
        ...entry.habits,
        [habitKey]: !currentValue
      };

      await updateData(`habits/${index}`, { habits: updatedHabits });
      return res.json({ message: `Toggled "${habitKey}" on ${date}`, habits: updatedHabits });
    }
  } catch (err) {
    console.error('Error toggling habit:', err);
    res.status(500).json({ error: 'Error toggling habit' });
  }
});



// === GET last 7 days of habits ===
router.get('/weekly', async (req, res) => {
  const today = new Date();
  const pastWeekDates = [...Array(7)].map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  try {
    let habits = await getData('habits') || [];

    // Convert to array if it's an object (like from Firebase)
    if (!Array.isArray(habits)) {
      habits = Object.values(habits);
    }

    // Filter only entries from the past 7 days
    const results = pastWeekDates.map(date => {
      const entry = habits.find(h => h.date === date);
      return entry || { date, habits: { ...defaultHabits } };
    });

    res.json(results);
  } catch (err) {
    console.error('Weekly fetch error:', err);
    res.status(500).json({ error: 'Error loading weekly habits' });
  }
});


module.exports = router;
