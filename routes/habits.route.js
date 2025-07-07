const express = require('express');
const router = express.Router();
const db = require('../firebase');

const defaultHabits = {
  read: false,
  meditate: false,
  workout: false,
  journal: false
};

// === GET habits for today ===
router.get('/', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const habitsRef = db.ref(`habits/${today}`);

  try {
    const snapshot = await habitsRef.once('value');
    let data = snapshot.val();

    if (!data) {
      // If not found, create new entry with defaultHabits
      await habitsRef.set({ date: today, habits: defaultHabits });
      data = { date: today, habits: defaultHabits };
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching today\'s habits:', err);
    res.status(500).json({ error: 'Error fetching habits' });
  }
});

// === POST /toggle habit ===
router.post('/toggle', async (req, res) => {
  const { date, habitKey } = req.body;

  if (!date || !habitKey) {
    return res.status(400).json({ error: 'Date and habitKey are required.' });
  }

  const habitRef = db.ref(`habits/${date}`);

  try {
    const snapshot = await habitRef.once('value');
    const data = snapshot.val();

    if (!data || !data.habits) {
      return res.status(404).json({ error: `No entry found for ${date}.` });
    }

    const updatedHabits = {
      ...data.habits,
      [habitKey]: !data.habits[habitKey]
    };

    await habitRef.update({ habits: updatedHabits });

    res.json({ message: `Toggled ${habitKey}`, habits: updatedHabits });
  } catch (err) {
    console.error('Toggle error:', err);
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
    const results = await Promise.all(
      pastWeekDates.map(async (date) => {
        const snapshot = await db.ref(`habits/${date}`).once('value');
        const entry = snapshot.val();
        return entry || { date, habits: { ...defaultHabits } };
      })
    );

    res.json(results);
  } catch (err) {
    console.error('Weekly fetch error:', err);
    res.status(500).json({ error: 'Error loading weekly habits' });
  }
});

module.exports = router;
