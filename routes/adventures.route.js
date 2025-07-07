const express = require('express');
const router = express.Router();
const db = require('../firebase'); // Adjust path if needed

const ADVENTURES_PATH = 'adventures';

// === Utility Functions ===
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

// === GET /recommendations ===
router.get('/recommendations', async (req, res) => {
  try {
    const snapshot = await db.ref(ADVENTURES_PATH).once('value');
    const data = snapshot.val() || {};
    const tasks = Object.values(data);
    const dueTasks = getSortedTasks(tasks);

    const mainRecommendation = dueTasks[0] || null;
    const otherRecommendations = dueTasks.slice(1, 4);
    res.json({ main: mainRecommendation, others: otherRecommendations });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to load recommendations' });
  }
});

// === POST /update-task ===
router.post('/update-task', async (req, res) => {
  const { id, updatedTask } = req.body;
  if (!id || !updatedTask) {
    return res.status(400).json({ error: 'ID and updated task data are required.' });
  }

  try {
    const taskRef = db.ref(`${ADVENTURES_PATH}/${id}`);
    const snapshot = await taskRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await taskRef.update(updatedTask);
    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// === POST /add-task ===
router.post('/add-task', async (req, res) => {
  const newTask = req.body;

  if (!newTask.title || !newTask.intervalInWeeks) {
    return res.status(400).json({ error: 'Title and interval are required.' });
  }

  try {
    const ref = db.ref(ADVENTURES_PATH);
    const snapshot = await ref.once('value');
    const data = snapshot.val() || {};

    const newId = String(Object.keys(data).length + 1);
    const newAdventure = {
      id: newId,
      title: newTask.title,
      intervalInWeeks: newTask.intervalInWeeks,
      lastDone: new Date().toISOString(),
      status: 'pending',
    };

    await ref.child(newId).set(newAdventure);
    res.json({ message: 'New adventure added successfully', task: newAdventure });
  } catch (error) {
    console.error('Error adding new task:', error);
    res.status(500).json({ error: 'Failed to add new task' });
  }
});

module.exports = router;
