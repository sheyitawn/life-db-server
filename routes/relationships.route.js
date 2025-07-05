const express = require('express');
const fs = require('fs');
const router = express.Router();

const relationshipsData = './data/relationships.json';

// Utility functions
const loadRelationships = () => JSON.parse(fs.readFileSync(relationshipsData, 'utf8'));
const saveRelationships = (relationships) =>
    fs.writeFileSync(relationshipsData, JSON.stringify(relationships, null, 2));

const parseDate = (dateString) => new Date(dateString);

// Calculate progress for each relationship
const calculateProgress = (lastCheckin, frequency) => {
    const now = new Date();
    const lastCheckinDate = new Date(lastCheckin);
    const daysSinceCheckin = Math.ceil((now - lastCheckinDate) / (1000 * 60 * 60 * 24));
    const frequencyDays = 
        frequency === 'weekly' ? 7 
        :frequency === 'bi-weekly' ? 14 
        :frequency === 'monthly' ? 30
        :frequency === 'bi-monthly' ? 60 
        :frequency === 'half-yearly' ? 182 
        :frequency === 'yearly' ? 365
        : 1;

    const progress = Math.min(daysSinceCheckin / frequencyDays, 1); // Cap at 100%
    const daysLeft = Math.max(frequencyDays - daysSinceCheckin, 0);
    const overdueDays = daysSinceCheckin > frequencyDays ? daysSinceCheckin - frequencyDays : 0;

    return { progress, daysLeft, overdue: daysSinceCheckin >= frequencyDays, overdueDays };
};


// Get relationships with progress data (only if they have a check-in date)
router.get('/relationships', (req, res) => {
    const relationships = loadRelationships();

    const relationshipsWithProgress = relationships
        .filter((relationship) => relationship.last_checkin) // Only include those with a check-in date
        .map((relationship) => {
            const { progress, daysLeft, overdue } = calculateProgress(
                relationship.last_checkin,
                relationship.checkin_freq
            );
            return { ...relationship, progress, daysLeft, overdue };
        });

    res.json(relationshipsWithProgress);
});


// Update a relationship (e.g., mark check-in as complete or skip)
router.post('/relationships/:id', (req, res) => {
    const relationships = loadRelationships();
    const { id } = req.params;
    const { action } = req.body;

    const relationshipIndex = relationships.findIndex(rel => rel.id === parseInt(id, 10));
    if (relationshipIndex === -1) {
        return res.status(404).json({ error: 'Relationship not found' });
    }

    const rel = relationships[relationshipIndex];

    if (action === 'check-in') {
        rel.last_checkin = new Date().toISOString();
    } else if (action === 'skip') {
        const baseDate = new Date(rel.last_checkin || Date.now());
        if (isNaN(baseDate.getTime())) {
            return res.status(400).json({ error: 'Invalid last_checkin date' });
        }
        const newCheckinDate = new Date(baseDate);
        newCheckinDate.setDate(newCheckinDate.getDate() + 1);
        rel.last_checkin = newCheckinDate.toISOString();
    } else {
        return res.status(400).json({ error: 'Invalid action' });
    }

    saveRelationships(relationships);
    res.json({ message: 'Relationship updated successfully', relationship: rel });
});


// Get the 3 most due relationships
router.get('/most-due', (req, res) => {
    const relationships = loadRelationships();

    // Calculate progress and overdue status
    const relationshipsWithProgress = relationships.map((relationship) => {
        const { progress, daysLeft, overdue, overdueDays } = calculateProgress(
            relationship.last_checkin,
            relationship.checkin_freq
        );
        return { ...relationship, progress, daysLeft, overdue, overdueDays };
    });

    // Sort by daysLeft (ascending) and slice top 3
    const mostDueRelationships = relationshipsWithProgress
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 3);

    res.json(mostDueRelationships);
});

// Utility to get next birthday date
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

// GET /birthdays/upcoming – birthdays within 14 days
router.get('/birthdays/upcoming', (req, res) => {
    const relationships = loadRelationships();
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
});

// POST /birthdays/:id/present – mark got_present true/false
router.post('/birthdays/:id/present', (req, res) => {
    const { id } = req.params;
    const { got_present } = req.body;
    const relationships = loadRelationships();

    const index = relationships.findIndex(rel => rel.id === parseInt(id, 10));
    if (index === -1) {
        return res.status(404).json({ error: 'Relationship not found' });
    }

    const relationship = relationships[index];

    if (!relationship.present) {
        return res.status(400).json({ error: `${relationship.name} is not expecting a present.` });
    }

    relationship.got_present = Boolean(got_present);
    saveRelationships(relationships);

    res.json({ message: `'got_present' updated for ${relationship.name}`, got_present: relationship.got_present });
});


module.exports = router;
