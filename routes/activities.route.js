const express = require('express');
const fs = require('fs');
const router = express.Router();

const activitiesData = './data/activities.json';
const weeklyActivityData = './data/weeklyActivity.json';
const habitsFile = './data/habits.json';

const loadHabits = () => JSON.parse(fs.readFileSync(habitsFile, 'utf8'));
const saveHabits = (habits) => fs.writeFileSync(habitsFile, JSON.stringify(habits, null, 2));

const defaultHabits = { read: false, meditate: false, workout: false, journal: false };


// Utility Functions
const loadActivities = () => JSON.parse(fs.readFileSync(activitiesData, 'utf8'));
const saveActivities = (data) => fs.writeFileSync(activitiesData, JSON.stringify(data, null, 2));

const loadWeeklyActivity = () => JSON.parse(fs.readFileSync(weeklyActivityData, 'utf8'));
const saveWeeklyActivity = (data) => fs.writeFileSync(weeklyActivityData, JSON.stringify(data, null, 2));

const isThisWeek = (date) => {
    const now = new Date();
    const selectedDate = new Date(date);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // Saturday
    return selectedDate >= startOfWeek && selectedDate <= endOfWeek;
};

// Select a random weekly activity
const selectRandomWeeklyActivity = () => {
    const activities = loadActivities();
    const random = activities[Math.floor(Math.random() * activities.length)];

    const newWeekly = {
        activityId: random.id,
        selectedAt: new Date().toISOString(),
        done: false
    };

    saveWeeklyActivity(newWeekly);
    return { ...random, done: false };
};

const workoutLogFile = './data/workoutLog.json';

const loadWorkoutLog = () => {
    if (!fs.existsSync(workoutLogFile)) return [];

    const data = fs.readFileSync(workoutLogFile, 'utf8');
    if (!data.trim()) return []; // empty file

    try {
        return JSON.parse(data);
    } catch (err) {
        console.error('❌ Failed to parse workoutLog.json:', err.message);
        return []; // fallback to empty
    }
};


const saveWorkoutLog = (data) => {
    fs.writeFileSync(workoutLogFile, JSON.stringify(data, null, 2));
};

const getStartOfWeek = (date = new Date()) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
};


// GET: Weekly activity (reuses current if it's still this week)
router.get('/weekly', (req, res) => {
    let weekly;
    try {
        weekly = loadWeeklyActivity();
    } catch {
        weekly = null;
    }

    if (!weekly || !isThisWeek(weekly.selectedAt)) {
        const newActivity = selectRandomWeeklyActivity();
        return res.json({ message: 'New activity selected for the week!', activity: newActivity });
    }

    const activities = loadActivities();
    const current = activities.find(a => a.id === weekly.activityId);
    if (!current) {
        return res.status(404).json({ error: 'Activity not found in list.' });
    }

    res.json({ activity: { ...current, done: weekly.done } });
});

// POST: Manually refresh the weekly activity
router.post('/weekly/refresh', (req, res) => {
    const newActivity = selectRandomWeeklyActivity();
    res.json({ message: 'Weekly activity manually refreshed!', activity: newActivity });
});

// POST: Mark weekly activity as done
router.post('/weekly/complete', (req, res) => {
    let weekly = loadWeeklyActivity();
    weekly.done = true;
    weekly.completedAt = new Date().toISOString();
    saveWeeklyActivity(weekly);

    // Optionally update lastDone in activities list too
    const activities = loadActivities();
    const activity = activities.find(a => a.id === weekly.activityId);
    if (activity) {
        activity.lastDone = new Date().toISOString();
        activity.status = 'done';
        saveActivities(activities);
    }

    res.json({ message: 'Weekly activity marked as done!', activityId: weekly.activityId });
});

const exercisePlanFile = './data/exercisePlan.json';
const loadExercisePlan = () => JSON.parse(fs.readFileSync(exercisePlanFile, 'utf8'));
const saveExercisePlan = (data) => fs.writeFileSync(exercisePlanFile, JSON.stringify(data, null, 2));

// GET: today's planned exercises
router.get('/exercise/today', (req, res) => {
    const plan = loadExercisePlan();
    const today = new Date().toLocaleString('en-GB', { weekday: 'long' });
    const todayExercises = plan[today] || [];
    res.json({ day: today, exercises: todayExercises });
});

// POST: mark an exercise as done
router.post('/exercise/complete', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Exercise name required' });

    const plan = loadExercisePlan();
    const today = new Date();
    const dayName = today.toLocaleString('en-GB', { weekday: 'long' });
    const todayDate = today.toISOString().split('T')[0];
    const exercises = plan[dayName] || [];

    const exercise = exercises.find(e => e.name === name);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found for today' });

    exercise.done = true;
    saveExercisePlan(plan);

    // Update habit tracker if all are done
    const allDone = exercises.every(e => e.done);
    if (allDone) {
        const habits = loadHabits();
        let todayEntry = habits.find(h => h.date === todayDate);
        if (!todayEntry) {
            todayEntry = { date: todayDate, habits: { ...defaultHabits } };
            habits.push(todayEntry);
        }
        todayEntry.habits.workout = true;
        saveHabits(habits);
    }

    // Log in workout log
    const weekStart = getStartOfWeek(today);
    const log = loadWorkoutLog();
    let thisWeek = log.find(w => w.weekStart === weekStart);

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
        saveWorkoutLog(log);
    }

    res.json({ message: `'${name}' marked as done`, allDone });
});


// POST: reset all exercises for the new week
router.post('/exercise/reset', (req, res) => {
    const plan = loadExercisePlan();

    for (let day of Object.keys(plan)) {
        plan[day] = plan[day].map(e => ({ ...e, done: false }));
    }

    saveExercisePlan(plan);
    res.json({ message: 'All exercises reset for the week' });
});

router.get('/exercise/log', (req, res) => {
    const log = loadWorkoutLog();
    res.json(log);
});


module.exports = router;
