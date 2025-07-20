const express = require('express');
const router = express.Router();
const db = require('../firebase');

// Utility
const parseDate = (dateString) => new Date(dateString);

const calculateProgress = (lastCheckin, frequency) => {
    const now = new Date();
    const lastCheckinDate = new Date(lastCheckin);
    const daysSinceCheckin = Math.ceil((now - lastCheckinDate) / (1000 * 60 * 60 * 24));
    const frequencyDays =
        frequency === 'weekly' ? 7
            : frequency === 'bi-weekly' ? 14
                : frequency === 'monthly' ? 30
                    : frequency === 'bi-monthly' ? 60
                        : frequency === 'half-yearly' ? 182
                            : frequency === 'yearly' ? 365
                                : 1;

    const progress = Math.min(daysSinceCheckin / frequencyDays, 1);
    const daysLeft = Math.max(frequencyDays - daysSinceCheckin, 0);
    const overdueDays = daysSinceCheckin > frequencyDays ? daysSinceCheckin - frequencyDays : 0;

    return { progress, daysLeft, overdue: daysSinceCheckin >= frequencyDays, overdueDays };
};

// GET /relationships
router.get('/relationships', async (req, res) => {
    try {
        const snapshot = await db.ref('relationships').once('value');
        const data = snapshot.val() || [];
        const relationships = Object.values(data);

        const withProgress = relationships
            .filter(r => r.last_checkin)
            .map(r => {
                const { progress, daysLeft, overdue } = calculateProgress(r.last_checkin, r.checkin_freq);
                return { ...r, progress, daysLeft, overdue };
            });

        res.json(withProgress);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error loading relationships' });
    }
});

// POST /relationships/:id
router.post('/relationships/:id', async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    try {
        const ref = db.ref(`relationships/${id}`);
        const snapshot = await ref.once('value');
        const rel = snapshot.val();

        if (!rel) return res.status(404).json({ error: 'Relationship not found' });

        if (action === 'check-in') {
            rel.last_checkin = new Date().toISOString();
        } else if (action === 'skip') {
            const baseDate = new Date(rel.last_checkin || Date.now());
            if (isNaN(baseDate.getTime())) return res.status(400).json({ error: 'Invalid last_checkin date' });
            baseDate.setDate(baseDate.getDate() + 1);
            rel.last_checkin = baseDate.toISOString();
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        await ref.update(rel);
        res.json({ message: 'Relationship updated successfully', relationship: rel });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update relationship' });
    }
});

// GET /most-due
router.get('/most-due', async (req, res) => {
    try {
        const snapshot = await db.ref('relationships').once('value');
        const data = snapshot.val() || [];
        const relationships = Object.values(data);

        const withProgress = relationships.map(r => {
            const { progress, daysLeft, overdue, overdueDays } = calculateProgress(r.last_checkin, r.checkin_freq);
            return { ...r, progress, daysLeft, overdue, overdueDays };
        });

        const mostDue = withProgress.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 3);
        res.json(mostDue);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error loading due relationships' });
    }
});

// Utility: getNextBirthday
const getNextBirthday = (birthdayStr) => {
    const [day, month] = birthdayStr.split('-').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    let nextBirthday = new Date(currentYear, month - 1, day);

    if (nextBirthday < now) {
        nextBirthday.setFullYear(currentYear + 1);
    }

    return nextBirthday;
};

// GET /birthdays/upcoming
router.get('/birthdays/upcoming', async (req, res) => {
    try {
        const snapshot = await db.ref('relationships').once('value');
        const data = snapshot.val() || [];
        const relationships = Object.values(data);

        const today = new Date();
        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(today.getDate() + 14);

        const upcoming = relationships
            .filter(rel => rel.birthday)
            .map(rel => {
                const nextBirthday = getNextBirthday(rel.birthday);
                const daysAway = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

                return {
                    id: rel.id,
                    name: rel.name,
                    birthday: rel.birthday,
                    daysAway,
                    present: rel.present ?? false,
                    got_present: rel.got_present ?? false,
                };
            })
            .filter(rel => rel.daysAway <= 14)
            .sort((a, b) => a.daysAway - b.daysAway);

        res.json(upcoming);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch upcoming birthdays' });
    }
});

// POST /birthdays/:id/present
router.post('/birthdays/:id/present', async (req, res) => {
    const { id } = req.params;
    const { got_present } = req.body;

    try {
        const ref = db.ref(`relationships/${id}`);
        const snapshot = await ref.once('value');
        const rel = snapshot.val();

        if (!rel) return res.status(404).json({ error: 'Relationship not found' });

        if (!rel.present) return res.status(400).json({ error: `${rel.name} is not expecting a present.` });

        rel.got_present = Boolean(got_present);
        await ref.update(rel);

        res.json({ message: `'got_present' updated for ${rel.name}`, got_present: rel.got_present });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update present status' });
    }
});

// POST /relationships/add
router.post('/add', async (req, res) => {
    const { name, birthday, checkin_freq, present } = req.body;

    if (!name || !birthday || !checkin_freq) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const ref = db.ref('relationships');
        const newRef = ref.push(); // Auto-generates a unique key
        const id = newRef.key;

        const newRelationship = {
            id,
            name,
            birthday,
            checkin_freq,
            present: !!present,
            // got_present: !!got_present,
            last_checkin: new Date().toISOString(),
        };

        await newRef.set(newRelationship);

        res.status(201).json({ message: 'Relationship added successfully', relationship: newRelationship });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add relationship' });
    }
});


module.exports = router;
