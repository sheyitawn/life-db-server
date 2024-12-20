const express = require('express');
const fs = require('fs');
const router = express.Router();

const timelineData = './data/timeline.json';
const dailyData = './data/daily.json';

// Helper Functions
const getMinutesOfDay = (time) => {
    if (typeof time !== 'string') {
        console.error(`Invalid time format: ${time}`);
        return 0; // Default to 0 minutes if time is invalid
    }
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60) % 24; // Keep hours within 24-hour range
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const loadDailyGoals = () => JSON.parse(fs.readFileSync(dailyData, 'utf8'));

// Endpoint to Get the Full Timeline Data (adjusted for late day)
router.get('/', (req, res) => {
    fs.readFile(timelineData, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading timeline data:', err);
            return res.status(500).json({ error: 'Failed to read timeline data' });
        }

        const timeline = JSON.parse(data);
        const today = new Date().toISOString().split('T')[0];
        const dailyGoals = loadDailyGoals();
        const todayGoal = dailyGoals.find((goal) => goal.date === today);

        // Adjust timeline if "late-day" is set
        if (todayGoal && todayGoal["late-day"] !== null) {
            const lateStartMinutes = getMinutesOfDay(todayGoal["late-day"]);
            let adjustedMinutes = lateStartMinutes;

            const adjustedTimeline = timeline.map((task, index) => {
                // Calculate the duration from the first task
                const originalTaskMinutes = getMinutesOfDay(task.time);
                const firstTaskMinutes = getMinutesOfDay(timeline[0].time);
                const duration = originalTaskMinutes - firstTaskMinutes;

                // Adjust time
                if (index === 0) {
                    adjustedMinutes = lateStartMinutes; // Start from the late-day time
                } else {
                    adjustedMinutes += duration; // Add the duration to the adjusted time
                }

                // Normalize to a 24-hour clock
                const normalizedHours = Math.floor(adjustedMinutes / 60) % 24;
                const normalizedMinutes = adjustedMinutes % 60;

                return {
                    ...task,
                    time: `${normalizedHours.toString().padStart(2, '0')}:${normalizedMinutes.toString().padStart(2, '0')}`,
                };
            });

            return res.json(adjustedTimeline);
        }

        // console.log(`Task: ${task.task}, Adjusted Time: ${normalizedHours}:${normalizedMinutes}`);


        // Return the original timeline if no "late-day" is set
        res.json(timeline);
    });
});


module.exports = router;
