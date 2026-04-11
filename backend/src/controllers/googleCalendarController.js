import { google  } from 'googleapis';
import User from '../models/User.js';
import Schedule from '../models/Schedule.js';

// ── Day name to RRule BYDAY code ─────────────────────────────────────────────
const DAY_TO_RRULE = {
    Monday:    'MO',
    Tuesday:   'TU',
    Wednesday: 'WE',
    Thursday:  'TH',
    Friday:    'FR',
    Saturday:  'SA',
    Sunday:    'SU',
};

// ── ISO date string for the NEXT occurrence of a given weekday ────────────────
// Google Calendar needs a concrete start date for a recurring event.
// We find the upcoming date (or today if it matches) for `dayName`.
function nextWeekdayDate(dayName) {
    const target = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
        .indexOf(dayName);
    const d = new Date();
    const diff = (target - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d;
}

// ── Build an OAuth2 client using env vars ─────────────────────────────────────
function buildOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI,
    );
}

// ── GET /api/google/auth-url ──────────────────────────────────────────────────
// Returns the consent screen URL. The frontend opens this in a new tab.
const getAuthUrl = (req, res) => {
    const oauth2Client = buildOAuth2Client();
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',   // gets refresh_token
        prompt: 'consent',        // always show consent screen so refresh_token is returned
        scope: [
            'https://www.googleapis.com/auth/calendar.events',
        ],
        state: req.user._id.toString(), // pass userId so callback can save tokens to the right user
    });
    res.json({ url });
};

// ── GET /api/google/callback?code=... ────────────────────────────────────────
// Google redirects here after the user approves.
// We exchange the one-time `code` for tokens and persist them.
const handleCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: 'Missing code parameter' });

    try {
        const oauth2Client = buildOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        // Persist tokens to the currently logged-in user.
        // Note: the callback URL is visited by the browser, so we cannot rely on
        // the Authorization header here; we use a short-lived `state` param instead.
        // For simplicity we store userId in the state query param (set during auth-url).
        const { state: userId } = req.query;
        if (!userId) return res.status(400).json({ message: 'Missing state (userId)' });

        await User.findByIdAndUpdate(userId, { googleTokens: tokens });

        // Close the popup / redirect back to the app
        res.send(`
            <html>
              <body style="background:#0f0f14;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center;">
                  <h2>✅ Google Calendar Connected!</h2>
                  <p style="color:#aaa">You can close this tab now.</p>
                  <script>
                    window.opener && window.opener.postMessage('google-auth-success', '*');
                    setTimeout(() => window.close(), 1500);
                  </script>
                </div>
              </body>
            </html>
        `);
    } catch (err) {
        console.error('Google OAuth callback error:', err.message);
        res.status(500).json({ message: 'OAuth callback failed', error: err.message });
    }
};

// ── GET /api/google/status ────────────────────────────────────────────────────
// Tells the frontend whether the current user has connected Google Calendar.
const getStatus = async (req, res) => {
    const user = await User.findById(req.user._id).select('googleTokens');
    const connected = !!(user?.googleTokens?.refresh_token);
    res.json({ connected });
};

// ── DELETE /api/google/disconnect ────────────────────────────────────────────
// Removes stored tokens so the user can re-connect or revoke access.
const disconnect = async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { googleTokens: {} });
    res.json({ message: 'Google Calendar disconnected' });
};

// ── POST /api/google/sync ─────────────────────────────────────────────────────
// Reads the user's 8-Track schedule and creates/replaces recurring events
// in their Google Calendar for each class slot.
const syncSchedule = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('googleTokens');
        if (!user?.googleTokens?.refresh_token) {
            return res.status(400).json({ message: 'Google Calendar not connected. Please connect first.' });
        }

        const oauth2Client = buildOAuth2Client();
        oauth2Client.setCredentials(user.googleTokens);

        // Auto-refresh tokens when they expire
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.refresh_token) {
                await User.findByIdAndUpdate(req.user._id, { googleTokens: tokens });
            }
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Fetch schedule from DB
        const scheduleDocs = await Schedule.find({ userId: req.user._id });

        let created = 0;
        let skipped = 0;

        for (const dayDoc of scheduleDocs) {
            if (dayDoc.isHoliday || !dayDoc.slots || dayDoc.slots.length === 0) {
                skipped++;
                continue;
            }

            const rruleDay = DAY_TO_RRULE[dayDoc.day];
            const baseDate = nextWeekdayDate(dayDoc.day); // e.g., next Monday's date

            for (const slot of dayDoc.slots) {
                const [startHour, startMin] = slot.startTime.split(':').map(Number);
                const [endHour, endMin]     = slot.endTime.split(':').map(Number);

                // Build Date objects for the event's start/end on the target day
                const startDate = new Date(baseDate);
                startDate.setHours(startHour, startMin, 0, 0);

                const endDate = new Date(baseDate);
                endDate.setHours(endHour, endMin, 0, 0);

                const event = {
                    summary: slot.subjectName,
                    location: slot.room || '',
                    description: `Class synced from 8-Track on ${new Date().toLocaleDateString()}`,
                    start: {
                        dateTime: startDate.toISOString(),
                        timeZone: process.env.TIMEZONE || 'Asia/Kolkata',
                    },
                    end: {
                        dateTime: endDate.toISOString(),
                        timeZone: process.env.TIMEZONE || 'Asia/Kolkata',
                    },
                    recurrence: [
                        // Recurs every week on this day, ending at the end of the year
                        `RRULE:FREQ=WEEKLY;BYDAY=${rruleDay};COUNT=52`,
                    ],
                    colorId: '5', // banana yellow – closest to 8-Track's theme
                };

                await calendar.events.insert({
                    calendarId: 'primary',
                    resource: event,
                });

                created++;
            }
        }

        res.json({
            message: `Sync complete! Created ${created} recurring event(s). Skipped ${skipped} holiday/empty day(s).`,
            created,
            skipped,
        });
    } catch (err) {
        console.error('Google Calendar sync error:', err.message);
        res.status(500).json({ message: 'Sync failed', error: err.message });
    }
};

export {  getAuthUrl, handleCallback, getStatus, disconnect, syncSchedule  };
