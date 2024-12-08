const express = require('express');
const fs = require('fs');
const router = express.Router();

const activitiesData = './data/activities.json';

// Utility Functions
const loadActivities = () => JSON.parse(fs.readFileSync(activitiesData, 'utf8'));
const saveActivities = (activities) =>
    fs.writeFileSync(activitiesData, JSON.stringify(activities, null, 2));

const getSortedActivities = (activities) => {
    const now = new Date();
    return activities
        .map((activity) => ({
            ...activity,
            nextDue: new Date(
                new Date(activity.lastDone).getTime() + activity.intervalInDays * 24 * 60 * 60 * 1000
            ),
        }))
        .filter((activity) => activity.nextDue <= now)
        .sort((a, b) => a.nextDue - b.nextDue);
};

// Get recommendations
router.get('/recommendations', (req, res) => {
    const activities = loadActivities();
    const dueActivities = getSortedActivities(activities);
    const mainRecommendation = dueActivities[0] || null;
    const otherRecommendations = dueActivities.slice(1, 4);
    res.json({ main: mainRecommendation, others: otherRecommendations });
});

// Update activity
router.post('/update-activity', (req, res) => {
    const { id, updatedActivity } = req.body;
    const activities = loadActivities();
    const activityIndex = activities.findIndex((activity) => activity.id === id);

    if (activityIndex === -1) {
        return res.status(404).json({ error: 'Activity not found' });
    }

    activities[activityIndex] = { ...activities[activityIndex], ...updatedActivity };
    saveActivities(activities);
    res.json({ message: 'Activity updated successfully' });
});

// Add a new activity
router.post('/add-activity', (req, res) => {
    const newActivity = req.body;

    if (!newActivity.title || !newActivity.intervalInDays) {
        return res.status(400).json({ error: 'Title and interval are required.' });
    }

    const activities = loadActivities();
    const newExercise = {
        id: String(activities.length + 1),
        title: newActivity.title,
        intervalInDays: newActivity.intervalInDays,
        lastDone: new Date().toISOString(),
        status: 'pending',
    };

    activities.push(newExercise);
    saveActivities(activities);
    res.json({ message: 'New activity added successfully', activity: newExercise });
});

module.exports = router;
