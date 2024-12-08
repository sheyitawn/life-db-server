const express = require('express');
const fs = require('fs');
const router = express.Router();

const adventuresData = './data/adventures.json';

// Utility Functions
const loadTasks = () => JSON.parse(fs.readFileSync(adventuresData, 'utf8'));
const saveTasks = (tasks) => fs.writeFileSync(adventuresData, JSON.stringify(tasks, null, 2));

const getSortedTasks = (tasks) => {
    const now = new Date();
    return tasks
        .map((task) => ({
            ...task,
            nextDue: new Date(new Date(task.lastDone).getTime() + task.intervalInWeeks * 7 * 24 * 60 * 60 * 1000),
        }))
        .filter((task) => task.nextDue <= now)
        .sort((a, b) => a.nextDue - b.nextDue);
};

// Get recommendations
router.get('/recommendations', (req, res) => {
    const tasks = loadTasks();
    const dueTasks = getSortedTasks(tasks);
    const mainRecommendation = dueTasks[0] || null;
    const otherRecommendations = dueTasks.slice(1, 4);
    res.json({ main: mainRecommendation, others: otherRecommendations });
});

// Update task
router.post('/update-task', (req, res) => {
    const { id, updatedTask } = req.body;
    const tasks = loadTasks();
    const taskIndex = tasks.findIndex((task) => task.id === id);

    if (taskIndex === -1) {
        return res.status(404).json({ error: 'Task not found' });
    }

    tasks[taskIndex] = { ...tasks[taskIndex], ...updatedTask };
    saveTasks(tasks);
    res.json({ message: 'Task updated successfully' });
});

// Add a new adventure
router.post('/add-task', (req, res) => {
    const newTask = req.body;

    if (!newTask.title || !newTask.intervalInWeeks) {
        return res.status(400).json({ error: 'Title and interval are required.' });
    }

    const tasks = loadTasks();
    const newAdventure = {
        id: String(tasks.length + 1),
        title: newTask.title,
        intervalInWeeks: newTask.intervalInWeeks,
        lastDone: new Date().toISOString(),
        status: 'pending',
    };

    tasks.push(newAdventure);
    saveTasks(tasks);
    res.json({ message: 'New adventure added successfully', task: newAdventure });
});

module.exports = router;
