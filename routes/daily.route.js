const express = require('express');
const fs = require('fs');
const router = express.Router();

const goalsData = './data/daily.json';

// Utility Functions
const loadGoals = () => JSON.parse(fs.readFileSync(goalsData, 'utf8'));
const saveGoals = (goals) => fs.writeFileSync(goalsData, JSON.stringify(goals, null, 2));

// Get the goal for a specific day (defaults to today)
router.get('/daily-goal', (req, res) => {
    const goals = loadGoals();
    const { date } = req.query;
    const today = date || new Date().toISOString().split('T')[0];
    const todayGoal = goals.find((goal) => goal.date === today);

    if (!todayGoal) {
        return res.status(404).json({ message: `No goal set for ${today}.` });
    }

    res.json({ goal: todayGoal });
});

// Add or update a goal for a specific day
router.post('/daily-goal', (req, res) => {
    const { date, goal } = req.body;

    if (!date || !goal) {
        return res.status(400).json({ error: 'Date and goal are required.' });
    }

    const goals = loadGoals();
    const goalIndex = goals.findIndex((g) => g.date === date);

    if (goalIndex !== -1) {
        // Update the existing goal
        goals[goalIndex].goal = goal;
    } else {
        // Add a new goal
        goals.push({ date, goal });
    }

    saveGoals(goals);
    res.json({ message: `Goal for ${date} has been set.`, goal: { date, goal } });
});

module.exports = router;
