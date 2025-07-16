const express = require('express');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const db = require('../firebase'); // Adjust path if needed

dotenv.config();

const router = express.Router();

const TOKEN_PATH = 'google/tokens';

console.log('🍅CLIENT_ID:', process.env.CLIENT_ID);
console.log('🍅CLIENT_SECRET:', process.env.CLIENT_SECRET);
console.log('🍅TEST:', process.env.CUM);


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

    // Save tokens to Firebase
    await db.ref(TOKEN_PATH).set(tokens);

    res.send('Login successful! You can now close this tab.');
  } catch (err) {
    console.error('Error during OAuth callback:', err);
    res.status(500).send('OAuth callback failed.');
  }
});

router.get('/today', async (req, res) => {
  try {
    const tokenSnapshot = await db.ref(TOKEN_PATH).once('value');
    const tokens = tokenSnapshot.val();

    if (!tokens) {
      return res.status(401).json({ error: 'not_authenticated' });
    }

    oAuth2Client.setCredentials(tokens);

    // Try to refresh the token
    try {
      await oAuth2Client.getAccessToken();
    } catch (err) {
      if (err.response?.data?.error === 'invalid_grant') {
        return res.status(401).json({ error: 'expired_token' });
      } else {
        throw err;
      }
    }

    // Proceed as normal
    await db.ref(TOKEN_PATH).set(oAuth2Client.credentials);

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const now = new Date();
    const start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const end = new Date(now.setHours(23, 59, 59, 999)).toISOString();

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
    console.error('Calendar fetch failed:', err.message);
    res.status(500).json({ error: 'calendar_fetch_error' });
  }
});


module.exports = router;
