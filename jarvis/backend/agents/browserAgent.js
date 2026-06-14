const URL_MAP = {
  'my website': 'https://bcautomations.vercel.app',
  'bcautomations': 'https://bcautomations.vercel.app',
  'ghl': 'https://app.gohighlevel.com',
  'gohighlevel': 'https://app.gohighlevel.com',
  'go high level': 'https://app.gohighlevel.com',
  'supabase': 'https://app.supabase.com',
  'vercel': 'https://vercel.com/dashboard',
  'make': 'https://make.com',
  'instagram': 'https://instagram.com',
  'facebook': 'https://facebook.com',
  'youtube': 'https://youtube.com',
  'twitter': 'https://x.com',
  'x': 'https://x.com',
  'linkedin': 'https://linkedin.com',
  'github': 'https://github.com',
  'gmail': 'https://mail.google.com',
  'email': 'https://mail.google.com',
  'google drive': 'https://drive.google.com',
  'drive': 'https://drive.google.com',
  'google docs': 'https://docs.google.com',
  'google sheets': 'https://sheets.google.com',
  'google calendar': 'https://calendar.google.com',
  'calendar': 'https://calendar.google.com',
  'chatgpt': 'https://chat.openai.com',
  'claude': 'https://claude.ai',
  'canva': 'https://canva.com',
  'stripe': 'https://dashboard.stripe.com',
  'railway': 'https://railway.app/dashboard',
  'slack': 'https://slack.com',
  'notion': 'https://notion.so',
  'tiktok': 'https://tiktok.com',
  'amazon': 'https://amazon.com',
  'netflix': 'https://netflix.com',
  'spotify': 'https://open.spotify.com',
  'reddit': 'https://reddit.com',
  'google': 'https://google.com',
};

export const browserAgent = {
  resolveUrl(command) {
    const lc = command.toLowerCase().replace(/^(open|launch|start|show me|go to|navigate)\s+/i, '').trim();

    for (const [key, url] of Object.entries(URL_MAP)) {
      if (lc.includes(key)) {
        return { url, action: 'open', resolved: true };
      }
    }

    const urlMatch = lc.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return { url: urlMatch[0], action: 'open', resolved: true };
    }

    const domainMatch = lc.match(/([a-z0-9-]+\.[a-z]{2,})/);
    if (domainMatch) {
      return { url: `https://${domainMatch[1]}`, action: 'open', resolved: true };
    }

    // Fall back to Google search
    return { url: `https://www.google.com/search?q=${encodeURIComponent(lc)}`, action: 'search', resolved: true };
  },
};
