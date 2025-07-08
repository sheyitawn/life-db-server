const express = require('express');
const router = express.Router();
const db = require('../firebase');

const FASTING_PATH = 'fasting/current';
const FASTING_LOG_PATH = 'fasting/log';

router.get('/', async (req, res) => {
  const snapshot = await db.ref(FASTING_PATH).once('value');
  res.json(snapshot.val() || {});
});

router.post('/start', async (req, res) => {
  const { start, duration } = req.body;
  if (!start || !duration) return res.status(400).json({ error: 'Start time and duration are required' });

  const startTime = new Date(start);
  const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

  const fast = {
    start: startTime.toISOString(),
    end: endTime.toISOString(),
    duration,
    active: true,
  };

  await db.ref(FASTING_PATH).set(fast);
  res.json({ message: 'Fast started', fast });
});

router.post('/stop', async (req, res) => {
  const snap = await db.ref(FASTING_PATH).once('value');
  const current = snap.val();

  if (!current || !current.active) {
    return res.status(400).json({ error: 'No active fast to stop' });
  }

  current.active = false;
  current.stoppedAt = new Date().toISOString();

  // Save to log
  const logSnap = await db.ref(FASTING_LOG_PATH).once('value');
  const log = logSnap.val() || [];
  log.push(current);
  await db.ref(FASTING_LOG_PATH).set(log);

  // Clear current
  await db.ref(FASTING_PATH).set({});

  res.json({ message: 'Fast stopped', fast: current });
});

module.exports = router;
