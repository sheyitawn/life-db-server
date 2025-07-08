const express = require('express');
const router = express.Router();
const { getData, updateData } = require('../utils/firebaseUtils');

// === GET /daily-goal?date=YYYY-MM-DD ===
router.get('/daily-goal', async (req, res) => {
  const { date } = req.query;
  const today = date || new Date().toISOString().split('T')[0];
  const path = `dailyGoals/${today}`;

  try {
    const goal = await getData(path);

    if (!goal) {
      return res.status(404).json({ message: `No goal set for ${today}.` });
    }

    res.json({ goal });
  } catch (err) {
    console.error('Error getting daily goal:', err);
    res.status(500).json({ error: 'Failed to load daily goal' });
  }
});

// === POST /daily-goal ===
router.post('/daily-goal', async (req, res) => {
  const { date, goal } = req.body;

  if (!date || !goal) {
    return res.status(400).json({ error: 'Date and goal are required.' });
  }

  try {
    await updateData(`dailyGoals/${date}`, { date, goal });
    res.json({ message: `Goal for ${date} has been set.`, goal: { date, goal } });
  } catch (err) {
    console.error('Error saving goal:', err);
    res.status(500).json({ error: 'Failed to save goal' });
  }
});

// === POST /toggle-late-day ===
router.post('/toggle-late-day', async (req, res) => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }

  const path = `dailyGoals/${date}`;

  try {
    const current = await getData(path);

    if (!current) {
      return res.status(404).json({ error: `No goal found for ${date}.` });
    }

    const isLateDay = current['late-day'] !== null && current['late-day'] !== undefined;
    const newLateDay = isLateDay ? null : getCurrentTimeFormatted();

    await updateData(path, { 'late-day': newLateDay });

    const updatedGoal = await getData(path);

    res.json({
      message: `Late-day status for ${date} has been updated.`,
      goal: updatedGoal
    });
  } catch (err) {
    console.error('Error toggling late-day:', err);
    res.status(500).json({ error: 'Failed to toggle late-day' });
  }
});

const getCurrentTimeFormatted = () => {
  const currentTime = new Date();
  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

module.exports = router;
