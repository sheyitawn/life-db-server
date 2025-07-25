const express = require('express');
const router = express.Router();
const db = require('../firebase');

const HABITS_PATH = 'habits';
const ACTIVITIES_PATH = 'activities';
const WEEKLY_PATH = 'weeklyActivities';
const EXERCISE_PLAN_PATH = 'exercisePlan';
const LOG_PATH = 'exerciseLog';

const defaultHabits = {
  water_1l: false,
  outdoor_walk: false,
  treadmill_30m: false,
  workout: false,
  weigh_in: false,
};

// === Helpers ===
const getToday = () => new Date().toISOString().split('T')[0];
const getDayName = () => new Date().toLocaleString('en-GB', { weekday: 'long' });
const getWeekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
};

// === GET /activities/weekly ===
router.get('/weekly', async (req, res) => {
  try {
    const weekStart = getWeekStart();

    const [weekSnap, allActsSnap] = await Promise.all([
      db.ref(`${WEEKLY_PATH}/${weekStart}`).once('value'),
      db.ref(ACTIVITIES_PATH).once('value'),
    ]);

    const activities = Object.values(allActsSnap.val() || []);
    let selected = weekSnap.val();

    if (!selected) {
      const random = activities[Math.floor(Math.random() * activities.length)];
      selected = {
        activityId: random.id,
        done: false,
        selectedAt: new Date().toISOString(),
      };
      await db.ref(`${WEEKLY_PATH}/${weekStart}`).set(selected);
    }

    const activity = activities.find((a) => a.id === selected.activityId);
    res.json({ activity: { ...activity, done: selected.done } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load weekly activity' });
  }
});

// === POST /activities/weekly/refresh ===
router.post('/weekly/refresh', async (req, res) => {
  const weekStart = getWeekStart();
  const actSnap = await db.ref(ACTIVITIES_PATH).once('value');
  const activities = Object.values(actSnap.val() || []);
  const random = activities[Math.floor(Math.random() * activities.length)];

  const newActivity = {
    activityId: random.id,
    done: false,
    selectedAt: new Date().toISOString(),
  };

  await db.ref(`${WEEKLY_PATH}/${weekStart}`).set(newActivity);
  res.json({ message: 'Refreshed!', activity: random });
});

// === POST /activities/weekly/complete ===
router.post('/weekly/complete', async (req, res) => {
  const weekStart = getWeekStart();
  const ref = db.ref(`${WEEKLY_PATH}/${weekStart}`);
  const data = (await ref.once('value')).val();

  if (!data) return res.status(404).json({ error: 'No weekly activity' });

  data.done = true;
  await ref.set(data);
  res.json({ message: 'Weekly activity completed!' });
});

// === GET /activities/exercise/today ===
router.get('/exercise/today', async (req, res) => {
  const day = getDayName();
  const today = getToday();

  const planSnap = await db.ref(`${EXERCISE_PLAN_PATH}/${day}`).once('value');
  const exercises = planSnap.val() || [];

  const logSnap = await db.ref(`${LOG_PATH}/${today}`).once('value');
  const doneNames = (logSnap.val() || []).map((e) => e.name);

  // Attach done status
  const fullList = exercises.map((e) => ({
    ...e,
    done: doneNames.includes(e.name),
  }));

  res.json({ day, exercises: fullList });
});

// === POST /activities/exercise/complete ===
router.post('/exercise/complete', async (req, res) => {
  const { name } = req.body;
  const day = getDayName();
  const date = getToday();

  const ref = db.ref(`${LOG_PATH}/${date}`);
  const existing = (await ref.once('value')).val() || [];

  if (!existing.find((e) => e.name === name)) {
    existing.push({ name, completedAt: new Date().toISOString() });
    await ref.set(existing);
  }

  // Update workout habit
  const planSnap = await db.ref(`${EXERCISE_PLAN_PATH}/${day}`).once('value');
  const fullPlan = planSnap.val() || [];

  const log = await ref.once('value').then(s => s.val()) || [];
  if (fullPlan.length && fullPlan.every(e => log.some(l => l.name === e.name))) {
    const habitsRef = db.ref(`${HABITS_PATH}/${date}`);
    const entry = (await habitsRef.once('value')).val() || { date, habits: { ...defaultHabits } };
    entry.habits.workout = true;
    await habitsRef.set(entry);
  }

  res.json({ message: `'${name}' marked complete` });
});

// === POST /activities/exercise/reset ===
router.post('/exercise/reset', async (req, res) => {
  const logSnap = await db.ref(LOG_PATH).once('value');
  const logs = logSnap.val() || {};
  const today = getToday();

  logs[today] = [];
  await db.ref(LOG_PATH).set(logs);

  res.json({ message: 'Reset completed exercises for today' });
});

// === GET /activities/exercise/log ===
router.get('/exercise/log', async (req, res) => {
  const logs = await db.ref(LOG_PATH).once('value');
  res.json(logs.val() || {});
});

module.exports = router;
