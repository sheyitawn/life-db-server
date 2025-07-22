const express = require('express');
const router = express.Router();
const db = require('../firebase');
const { fetchAsArray } = require('../utils/firebaseUtils');

const defaultHabits = { water_1l: false, outdoor_walk: false, treadmill_30m: false, workout: false, weigh_in: false };


// === POST /weighin ===
router.post('/', async (req, res) => {
  const { weight } = req.body;

  if (typeof weight !== 'number' || weight <= 0) {
    return res.status(400).json({ error: 'Weight must be a positive number' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const weightsRef = db.ref('weights');
    const habitsRef = db.ref('habits');

    // Use utility to safely get weights array
    const weights = await fetchAsArray('weights');

    // Update or add weight entry
    const existingIndex = weights.findIndex((w) => w.date === today);
    if (existingIndex !== -1) {
      weights[existingIndex].weight = weight;
    } else {
      weights.push({ date: today, weight });
    }
    await weightsRef.set(weights);

    // Get habits safely
    const habits = await fetchAsArray('habits');

    let todayEntry = habits.find((h) => h.date === today);
    if (!todayEntry) {
      todayEntry = { date: today, habits: { ...defaultHabits } };
      habits.push(todayEntry);
    }

    todayEntry.habits["weigh_in"] = true;

    const habitIndex = habits.findIndex((h) => h.date === today);
    if (habitIndex !== -1) {
      habits[habitIndex] = todayEntry;
    } else {
      habits.push(todayEntry);
    }

    await habitsRef.set(habits);

    res.json({ message: `Weighed in at ${weight}kg`, date: today });
  } catch (err) {
    console.error('Firebase Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// === GET /weighin ===
router.get('/', async (req, res) => {
  try {
    const weights = await fetchAsArray('weights');
    res.json(weights);
  } catch (err) {
    console.error('Firebase Error:', err);
    res.status(500).json({ error: 'Failed to load weight data' });
  }
});

// === GET /weighin/latest ===
router.get('/latest', async (req, res) => {
  try {
    const weights = await fetchAsArray('weights'); // ✅ reads from correct key

    if (!weights || weights.length === 0) {
      return res.status(404).json({ error: 'No weigh-in data found' });
    }

    // Sort and get latest
    const latest = weights
      .map(entry => ({
        ...entry,
        timestamp: new Date(entry.date).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    const now = Date.now();
    const diffMs = now - latest.timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    let timeAgo = '';
    if (diffMinutes < 1) {
      timeAgo = 'just now';
    } else if (diffMinutes < 60) {
      timeAgo = `${diffMinutes} min ago`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      timeAgo = `${hours}h ${mins}m ago`;
    }

    res.json({
      weight: latest.weight,
      date: latest.date,
      timeAgo,
    });
  } catch (err) {
    console.error('Firebase Error:', err);
    res.status(500).json({ error: 'Failed to fetch latest weigh-in' });
  }
});



module.exports = router;
