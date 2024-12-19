const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');


const adventureRoutes = require('./routes/adventures.route');
const goalRoutes = require('./routes/daily.route');
const activityRoutes = require('./routes/activities.route');
const relationshipRoutes = require('./routes/relationships.route');
const timelineRoutes = require('./routes/timeline.route');


const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(bodyParser.json());

// Use the routes
app.use('/adventures', adventureRoutes);
app.use('/goals', goalRoutes);
app.use('/activities', activityRoutes);
app.use('/relationships', relationshipRoutes);
app.use('/timeline', timelineRoutes);

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
