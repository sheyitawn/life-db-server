const express = require('express');
const router = express.Router();
const db = require('../firebase'); // Adjust the path if needed

// === Firebase paths ===
const HABITS_PATH = 'habits';
const ACTIVITIES_PATH = 'activities';
const WEEKLY_ACTIVITY_PATH = 'weeklyActivity';
const EXERCISE_PLAN_PATH = 'exercisePlan';
const WORKOUT_LOG_PATH = 'workoutLog';

const defaultHabits = { water_1l: false, outdoor_walk: false, treadmill_30m: false, workout: false, weigh_in: false };

const getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Sunday
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

const isThisWeek = (date) => {
  const now = new Date();
  const selectedDate = new Date(date);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  return selectedDate >= startOfWeek && selectedDate <= endOfWeek;
};

// === Load all activities and select a new one randomly ===
const selectRandomWeeklyActivity = async () => {
  const snapshot = await db.ref(ACTIVITIES_PATH).once('value');
  const activities = Object.values(snapshot.val() || []);
  const random = activities[Math.floor(Math.random() * activities.length)];
  const newWeekly = {
    activityId: random.id,
    selectedAt: new Date().toISOString(),
    done: false,
  };
  await db.ref(WEEKLY_ACTIVITY_PATH).set(newWeekly);
  return { ...random, done: false };
};

// === GET /weekly ===
router.get('/weekly', async (req, res) => {
  try {
    const [weeklySnap, activitiesSnap] = await Promise.all([
      db.ref(WEEKLY_ACTIVITY_PATH).once('value'),
      db.ref(ACTIVITIES_PATH).once('value'),
    ]);

    let weekly = weeklySnap.val();
    const activities = Object.values(activitiesSnap.val() || []);

    if (!weekly || !isThisWeek(weekly.selectedAt)) {
      const newActivity = await selectRandomWeeklyActivity();
      return res.json({ message: 'New activity selected for the week!', activity: newActivity });
    }

    const current = activities.find((a) => a.id === weekly.activityId);
    if (!current) {
      return res.status(404).json({ error: 'Activity not found.' });
    }

    res.json({ activity: { ...current, done: weekly.done } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load weekly activity.' });
  }
});

// === POST /weekly/refresh ===
router.post('/weekly/refresh', async (req, res) => {
  const newActivity = await selectRandomWeeklyActivity();
  res.json({ message: 'Weekly activity manually refreshed!', activity: newActivity });
});

// === POST /weekly/complete ===
router.post('/weekly/complete', async (req, res) => {
  const weeklySnap = await db.ref(WEEKLY_ACTIVITY_PATH).once('value');
  const weekly = weeklySnap.val();

  if (!weekly) return res.status(400).json({ error: 'No weekly activity found.' });

  weekly.done = true;
  weekly.completedAt = new Date().toISOString();
  await db.ref(WEEKLY_ACTIVITY_PATH).set(weekly);

  // Update activity
  const activitiesSnap = await db.ref(ACTIVITIES_PATH).once('value');
  const activities = activitiesSnap.val() || {};
  const id = weekly.activityId;

  if (activities[id]) {
    activities[id].lastDone = new Date().toISOString();
    activities[id].status = 'done';
    await db.ref(`${ACTIVITIES_PATH}/${id}`).set(activities[id]);
  }

  res.json({ message: 'Weekly activity marked as done!', activityId: weekly.activityId });
});

// === GET /exercise/today ===
router.get('/exercise/today', async (req, res) => {
  const planSnap = await db.ref(EXERCISE_PLAN_PATH).once('value');
  const plan = planSnap.val() || {};
  const today = new Date().toLocaleString('en-GB', { weekday: 'long' });
  const todayExercises = plan[today] || [];
  res.json({ day: today, exercises: todayExercises });
});

// === POST /exercise/complete ===
router.post('/exercise/complete', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Exercise name required' });

  const planSnap = await db.ref(EXERCISE_PLAN_PATH).once('value');
  const plan = planSnap.val() || {};

  const today = new Date();
  const dayName = today.toLocaleString('en-GB', { weekday: 'long' });
  const todayDate = today.toISOString().split('T')[0];
  const exercises = plan[dayName] || [];

  const exercise = exercises.find((e) => e.name === name);
  if (!exercise) return res.status(404).json({ error: 'Exercise not found for today' });

  exercise.done = true;
  await db.ref(`${EXERCISE_PLAN_PATH}/${dayName}`).set(exercises);

  // ✅ Check if all exercises for today are done
  const allDone = exercises.every((e) => e.done);

  if (allDone) {
    const habitsRef = db.ref(`${HABITS_PATH}/${todayDate}`);
    const todaySnap = await habitsRef.once('value');
    const todayEntry = todaySnap.val() || { date: todayDate, habits: { ...defaultHabits } };

    todayEntry.habits.workout = true;
    await habitsRef.set(todayEntry);
  }

  // ✅ Log in workoutLog
  const weekStart = getStartOfWeek(today);
  const logSnap = await db.ref(WORKOUT_LOG_PATH).once('value');
  const log = logSnap.val() || [];

  let thisWeek = log.find((w) => w.weekStart === weekStart);
  if (!thisWeek) {
    thisWeek = {
      weekStart,
      days: {
        Monday: [], Tuesday: [], Wednesday: [],
        Thursday: [], Friday: [], Saturday: [], Sunday: []
      }
    };
    log.push(thisWeek);
  }

  if (!thisWeek.days[dayName].includes(name)) {
    thisWeek.days[dayName].push(name);
  }

  await db.ref(WORKOUT_LOG_PATH).set(log);
  res.json({ message: `'${name}' marked as done`, allDone });
});


// === POST /exercise/reset ===
router.post('/exercise/reset', async (req, res) => {
  const planSnap = await db.ref(EXERCISE_PLAN_PATH).once('value');
  const plan = planSnap.val() || {};

  for (let day in plan) {
    plan[day] = plan[day].map((e) => ({ ...e, done: false }));
  }

  await db.ref(EXERCISE_PLAN_PATH).set(plan);
  res.json({ message: 'All exercises reset for the week' });
});

// === GET /exercise/log ===
router.get('/exercise/log', async (req, res) => {
  const logSnap = await db.ref(WORKOUT_LOG_PATH).once('value');
  res.json(logSnap.val() || []);
});

module.exports = router;
