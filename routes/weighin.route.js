const express = require('express');
const fs = require('fs');
const router = express.Router();

const weightFile = './data/weight.json';
const habitsFile = './data/habits.json';

// === Utility functions ===
const loadWeights = () => {
    if (!fs.existsSync(weightFile)) return [];
    const data = fs.readFileSync(weightFile, 'utf8');
    return data.trim() ? JSON.parse(data) : [];
};

const saveWeights = (weights) => {
    fs.writeFileSync(weightFile, JSON.stringify(weights, null, 2));
};

const loadHabits = () => {
    if (!fs.existsSync(habitsFile)) return [];
    const data = fs.readFileSync(habitsFile, 'utf8');
    return data.trim() ? JSON.parse(data) : [];
};

const saveHabits = (habits) => {
    fs.writeFileSync(habitsFile, JSON.stringify(habits, null, 2));
};

const defaultHabits = {
    read: false,
    meditate: false,
    workout: false,
    journal: false,
    "weigh-in": false
};

// === POST /weighin ===
router.post('/', (req, res) => {
    const { weight } = req.body;

    if (typeof weight !== 'number' || weight <= 0) {
        return res.status(400).json({ error: 'Weight must be a positive number' });
    }

    const today = new Date().toISOString().split('T')[0];
    const weights = loadWeights();

    // Check if today's entry already exists
    const existingIndex = weights.findIndex(w => w.date === today);

    if (existingIndex !== -1) {
        // Overwrite existing weight
        weights[existingIndex].weight = weight;
    } else {
        // Add new entry
        weights.push({ date: today, weight });
    }

    saveWeights(weights);

    // Update habits
    const habits = loadHabits();
    let todayEntry = habits.find(h => h.date === today);

    if (!todayEntry) {
        todayEntry = { date: today, habits: { ...defaultHabits } };
        habits.push(todayEntry);
    }

    todayEntry.habits['weigh-in'] = true;
    saveHabits(habits);

    res.json({ message: `Weighed in at ${weight}kg`, date: today });
});


// === GET /weighin ===
router.get('/', (req, res) => {
    const weights = loadWeights();
    res.json(weights);
});

module.exports = router;
