const express = require('express');
const router = express.Router();
const db = require('../firebase'); // adjust as needed

// Helper Functions
const getMinutesOfDay = (time) => {
    if (typeof time !== 'string') {
        console.error(`Invalid time format: ${time}`);
        return 0;
    }
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// === GET: /timeline ===
router.get('/', async (req, res) => {
    try {
        const timelineSnap = await db.ref('timeline').once('value');
        const dailySnap = await db.ref('daily').once('value');

        const timeline = timelineSnap.val() || [];
        const dailyGoals = dailySnap.val() || [];

        const today = new Date().toISOString().split('T')[0];
        const todayGoal = dailyGoals.find(goal => goal.date === today);

        if (todayGoal && todayGoal["late-day"]) {
            const lateStartMinutes = getMinutesOfDay(todayGoal["late-day"]);
            let adjustedMinutes = lateStartMinutes;

            const adjustedTimeline = timeline.map((task, index) => {
                const originalTaskMinutes = getMinutesOfDay(task.time);
                const firstTaskMinutes = getMinutesOfDay(timeline[0].time);
                const duration = originalTaskMinutes - firstTaskMinutes;

                if (index === 0) {
                    adjustedMinutes = lateStartMinutes;
                } else {
                    adjustedMinutes += duration;
                }

                const normalizedHours = Math.floor(adjustedMinutes / 60) % 24;
                const normalizedMinutes = adjustedMinutes % 60;

                return {
                    ...task,
                    time: `${normalizedHours.toString().padStart(2, '0')}:${normalizedMinutes.toString().padStart(2, '0')}`,
                };
            });

            return res.json(adjustedTimeline);
        }

        // Return the original timeline
        res.json(timeline);
    } catch (err) {
        console.error('Firebase error:', err);
        res.status(500).json({ error: 'Failed to load timeline data' });
    }
});

module.exports = router;
