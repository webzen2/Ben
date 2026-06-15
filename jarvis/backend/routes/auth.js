import { Router } from 'express';
import { google } from 'googleapis';

const router = Router();

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

router.get('/google', (_, res) => {
  const auth = getOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  const auth = getOAuthClient();
  const { tokens } = await auth.getToken(code);
  // In production, store tokens.refresh_token securely
  res.json({ refresh_token: tokens.refresh_token, message: 'Copy this refresh_token to your .env' });
});

export { router as authRouter };
