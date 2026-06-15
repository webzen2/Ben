import { google } from 'googleapis';

function getOAuthClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return auth;
}

export const calendarAgent = {
  async getTodaySchedule() {
    const auth = getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59);

    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 10,
    });

    return (data.items || []).map(e => ({
      id: e.id,
      title: e.summary,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location,
      description: e.description,
    }));
  },

  async createEvent({ title, startTime, endTime, description, location }) {
    const auth = getOAuthClient();
    const calendar = google.calendar({ version: 'v3', auth });

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);

    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description,
        location,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });

    return { id: data.id, title: data.summary, link: data.htmlLink };
  },
};
