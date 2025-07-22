const express = require('express');
const router = express.Router();
const { getData, setData, updateData } = require('../utils/firebaseUtils');

// Default habits structure
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
  const path = `habits/${today}`;

  try {
    let data = await getData(path);

    if (!data) {
      const newData = { date: today, habits: { ...defaultHabits } };
      await setData(path, newData);
      data = newData;
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching today\'s habits:', err);
    res.status(500).json({ error: 'Error fetching habits' });
  }
});

// === POST /toggle habit (for any date) ===
router.post('/toggle', async (req, res) => {
  const { date, habitKey } = req.body;

  if (!date || !habitKey) {
    return res.status(400).json({ error: 'Both "date" and "habitKey" are required.' });
  }

  const path = `habits/${date}`;

  try {
    let data = await getData(path);

    if (!data) {
      // Create new day if it doesn't exist
      data = {
        date,
        habits: { ...defaultHabits, [habitKey]: true } // toggle to true
      };
      await setData(path, data);
    } else {
      const currentValue = !!data.habits?.[habitKey];
      const updatedHabits = {
        ...defaultHabits,
        ...data.habits,
        [habitKey]: !currentValue
      };

      await updateData(path, { habits: updatedHabits });
      data.habits = updatedHabits;
    }

    res.json({ message: `Toggled "${habitKey}" on ${date}`, habits: data.habits });
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
    const results = await Promise.all(
      pastWeekDates.map(async (date) => {
        const path = `habits/${date}`;
        const data = await getData(path);
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
