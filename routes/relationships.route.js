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


// Get relationships with progress data
router.get('/relationships', (req, res) => {
    const relationships = loadRelationships();
    const relationshipsWithProgress = relationships.map((relationship) => {
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
    const { action } = req.body; // Action can be "checked-in" or "skip"

    const relationshipIndex = relationships.findIndex((rel) => rel.id === parseInt(id));
    if (relationshipIndex === -1) {
        return res.status(404).json({ error: 'Relationship not found' });
    }

    if (action === 'checked-in') {
        relationships[relationshipIndex].last_checkin = new Date().toISOString();
    } else if (action === 'skip') {
        const currentCheckinDate = new Date(relationships[relationshipIndex].last_checkin || new Date());
        const newCheckinDate = new Date(currentCheckinDate);
        newCheckinDate.setDate(newCheckinDate.getDate() + 1); // Add 1 day
        relationships[relationshipIndex].last_checkin = newCheckinDate.toISOString();
    }

    saveRelationships(relationships);
    res.json({ message: 'Relationship updated successfully' });
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



module.exports = router;
