export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const expected = process.env.JARVIS_API_TOKEN;

  if (!expected) return next(); // no token configured = open (dev mode)

  if (!token || token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
