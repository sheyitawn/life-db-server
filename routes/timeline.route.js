const express = require('express');
const fs = require('fs');
const router = express.Router();

const timelineData = './data/timeline.json';

// Helper Function to Get Minutes of the Day
const getMinutesOfDay = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Endpoint to Get the Full Timeline Data
router.get('/', (req, res) => {
    fs.readFile(timelineData, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading timeline data:', err);
            return res.status(500).json({ error: 'Failed to read timeline data' });
        }
        res.json(JSON.parse(data));
    });
});

// Endpoint to Get the Current Task Index
router.get('/current', (req, res) => {
    fs.readFile(timelineData, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading timeline data:', err);
            return res.status(500).json({ error: 'Failed to read timeline data' });
        }

        const timeline = JSON.parse(data);
        const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

        // Find the Current Task Index
        const currentTaskIndex = timeline.findIndex((task, index) => {
            const taskMinutes = getMinutesOfDay(task.time);
            const nextTaskMinutes =
                index + 1 < timeline.length ? getMinutesOfDay(timeline[index + 1].time) : Infinity;

            return currentMinutes >= taskMinutes && currentMinutes < nextTaskMinutes;
        });

        res.json({ currentTaskIndex });
    });
});

module.exports = router;
