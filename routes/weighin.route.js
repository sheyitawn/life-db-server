const express = require('express');
const router = express.Router();
const db = require('../firebase'); // path to your firebase.js file

const defaultHabits = {
    read: false,
    meditate: false,
    workout: false,
    journal: false,
    "weigh-in": false
};

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

        // Get existing weights
        const snapshot = await weightsRef.once('value');
        const weights = snapshot.val() || [];

        // Check if today's entry exists
        const existingIndex = weights.findIndex(w => w.date === today);
        if (existingIndex !== -1) {
            weights[existingIndex].weight = weight;
        } else {
            weights.push({ date: today, weight });
        }

        await weightsRef.set(weights);

        // Get/update habits
        const habitsSnap = await habitsRef.once('value');
        const habits = habitsSnap.val() || [];

        let todayEntry = habits.find(h => h.date === today);
        if (!todayEntry) {
            todayEntry = { date: today, habits: { ...defaultHabits } };
            habits.push(todayEntry);
        }

        todayEntry.habits['weigh-in'] = true;

        // Replace or insert
        const index = habits.findIndex(h => h.date === today);
        if (index !== -1) {
            habits[index] = todayEntry;
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
        const snapshot = await db.ref('weights').once('value');
        const weights = snapshot.val() || [];
        res.json(weights);
    } catch (err) {
        console.error('Firebase Error:', err);
        res.status(500).json({ error: 'Failed to load weight data' });
    }
});

module.exports = router;
