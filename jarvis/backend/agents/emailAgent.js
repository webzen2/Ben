import { google } from 'googleapis';

function getAuth() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

function getGmail() {
  return google.gmail({ version: 'v1', auth: getAuth() });
}

export const emailAgent = {
  async checkInbox({ query = '', maxResults = 5 } = {}) {
    const gmail = getGmail();
    const q = query || 'is:unread';
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q,
      maxResults,
    });

    if (!data.messages?.length) {
      return { count: 0, emails: [], summary: 'No new emails.' };
    }

    const emails = await Promise.all(
      data.messages.map(async (msg) => {
        const { data: full } = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });
        const headers = full.payload?.headers || [];
        return {
          id: msg.id,
          from: headers.find(h => h.name === 'From')?.value || '',
          subject: headers.find(h => h.name === 'Subject')?.value || '',
          date: headers.find(h => h.name === 'Date')?.value || '',
          snippet: full.snippet || '',
        };
      })
    );

    return { count: emails.length, emails };
  },

  async searchEmails(query) {
    return this.checkInbox({ query, maxResults: 10 });
  },

  async sendEmail({ to, subject, body }) {
    const gmail = getGmail();
    const raw = Buffer.from(
      `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`
    ).toString('base64url');

    const { data } = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return { sent: true, messageId: data.id };
  },
};
