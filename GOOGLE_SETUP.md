# 🗓️ Google Calendar Integration – Setup Guide

Follow these steps **once** to connect your 8-Track app to Google Calendar.

---

## Step 1 – Create a Google Cloud Project

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Name it `8-Track` → **Create**

---

## Step 2 – Enable the Google Calendar API

1. In the left sidebar go to **APIs & Services → Library**
2. Search for **Google Calendar API** and click it
3. Click **Enable**

---

## Step 3 – Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. If prompted, click **Configure Consent Screen** first:
   - Choose **External** user type → **Create**
   - Fill in App Name (`8-Track`), your email, and developer email → **Save and Continue** through all steps
   - Under **Test users**, add your Google email address
4. Back at **Create OAuth client ID**:
   - **Application type**: Web application
   - **Name**: `8-Track Local`
   - **Authorized redirect URIs**: `http://localhost:5000/api/google/callback`
   - Click **Create**

5. Copy the **Client ID** and **Client Secret** shown in the popup

---

## Step 4 – Add Credentials to Your `.env`

Open `backend/.env` and add:

```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/google/callback
TIMEZONE=Asia/Kolkata
```

---

## Step 5 – Connect & Sync in the App

1. Start your backend and frontend (`npm run dev` in both)
2. Navigate to **My Subjects** page in 8-Track
3. Click the **"Connect Google"** button in the Google Calendar Sync panel
4. A popup will open — sign in with the Google account you added as a test user
5. Click **Allow** to grant calendar access
6. The popup closes automatically — status changes to **✓ Connected**
7. Click **"Sync Now"** to push your entire weekly timetable as recurring calendar events

---

## How It Works

| Action | What Happens |
|--------|--------------|
| Connect | Opens Google OAuth popup, saves your `refresh_token` securely in MongoDB |
| Sync Now | Reads your 8-Track schedule, creates a **weekly recurring event** in Google Calendar for each class slot |
| Disconnect | Removes your tokens from the database |

> **Note:** Every time you click "Sync Now", new events are created. If you've edited your schedule and want to re-sync, you may want to clear old 8-Track events from Google Calendar first.
