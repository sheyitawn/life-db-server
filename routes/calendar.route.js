// routes/calendar.route.js
const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

// Setup OAuth2
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  'http://localhost:3001/calendar/oauth2callback'
);

// Step 1: Login Route
router.get('/login', (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// Step 2: Callback Route
router.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync('tokens.json', JSON.stringify(tokens));
    res.send('Login successful! You can now close this tab.');
  } catch (err) {
    console.error('Error during OAuth callback:', err);
    res.status(500).send('OAuth callback failed.');
  }
});

router.get('/today', async (req, res) => {
  try {
    const tokens = JSON.parse(fs.readFileSync('tokens.json'));
    oAuth2Client.setCredentials(tokens);

    // Refresh token if needed
    await oAuth2Client.getAccessToken();

    // Save the refreshed access token
    const newTokens = oAuth2Client.credentials;
    fs.writeFileSync('tokens.json', JSON.stringify(newTokens, null, 2));

    // Optional: Confirm user
    const info = await oAuth2Client.getTokenInfo(newTokens.access_token);
    console.log('✅ Token valid for user:', info.email);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const now = new Date();
    const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    console.log('Fetching events between:', start, 'and', end);

    const result = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start,
      timeMax: end,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = result.data.items.map((event) => ({
      id: event.id,
      summary: event.summary,
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
    }));

    res.json(events);
  } catch (err) {
    console.error('❌ Failed to fetch calendar events:', {
      message: err.message,
      response: err.response?.data,
      stack: err.stack
    });
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});





module.exports = router;
