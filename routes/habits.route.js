const express = require('express');
const router = express.Router();
const { getData, setData, updateData } = require('../utils/firebaseUtils');

const defaultHabits = {
  water_1l: false,
  outdoor_walk: false,
  workout: false,
  weigh_in: false
};

// === GET habits for today ===
router.get('/', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const path = `habits/${today}`;

  try {
    let data = await getData(path);

    if (!data) {
      data = { date: today, habits: defaultHabits };
      await setData(path, data);
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

  const path = `habits/${date}`;

  try {
    const data = await getData(path);

    if (!data || !data.habits) {
      return res.status(404).json({ error: `No entry found for ${date}.` });
    }

    const updatedHabits = {
      ...data.habits,
      [habitKey]: !data.habits[habitKey]
    };

    await updateData(path, { habits: updatedHabits });

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
        const data = await getData(`habits/${date}`);
        return data || { date, habits: { ...defaultHabits } };
      })
    );

    res.json(results);
  } catch (err) {
    console.error('Weekly fetch error:', err);
    res.status(500).json({ error: 'Error loading weekly habits' });
  }
});

module.exports = router;
