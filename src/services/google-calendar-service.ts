import { google, calendar_v3 } from 'googleapis';
import { JWT } from 'google-auth-library';

// Scopes required for the Calendar API
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getAuthClient() {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
        throw new Error('Google Service Account credentials missing');
    }

    const client = new google.auth.JWT(
        clientEmail,
        undefined,
        privateKey,
        SCOPES
    );

    return client;
}

const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

export async function listEvents(
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 2500
): Promise<calendar_v3.Schema$Event[]> {
    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
    });

    return res.data.items || [];
}

export async function createEvent(event: calendar_v3.Schema$Event): Promise<calendar_v3.Schema$Event> {
    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.insert({
        calendarId,
        requestBody: event,
    });

    return res.data;
}

export async function updateEvent(eventId: string, event: calendar_v3.Schema$Event): Promise<calendar_v3.Schema$Event> {
    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
    });

    return res.data;
}

export async function deleteEvent(eventId: string): Promise<void> {
    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
        calendarId,
        eventId,
    });
}

export async function getEvent(eventId: string): Promise<calendar_v3.Schema$Event> {
    const auth = getAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.get({
        calendarId,
        eventId,
    });

    return res.data;
}
