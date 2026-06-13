const URL_MAP = {
  'my website': 'https://bcautomations.vercel.app',
  'bcautomations': 'https://bcautomations.vercel.app',
  'ghl': 'https://app.gohighlevel.com',
  'gohighlevel': 'https://app.gohighlevel.com',
  'supabase': 'https://app.supabase.com',
  'vercel': 'https://vercel.com/dashboard',
  'make': 'https://make.com',
  'instagram': 'https://instagram.com',
  'facebook': 'https://facebook.com',
};

export const browserAgent = {
  resolveUrl(command) {
    const lc = command.toLowerCase();

    // Check known aliases first
    for (const [key, url] of Object.entries(URL_MAP)) {
      if (lc.includes(key)) {
        return { url, action: 'open', resolved: true };
      }
    }

    // Extract raw URL from command
    const urlMatch = lc.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      return { url: urlMatch[0], action: 'open', resolved: true };
    }

    // Try to build URL from domain-like phrase: "show me vercel.com"
    const domainMatch = lc.match(/([a-z0-9-]+\.[a-z]{2,})/);
    if (domainMatch) {
      return { url: `https://${domainMatch[1]}`, action: 'open', resolved: true };
    }

    return { url: null, action: 'open', resolved: false, message: "Couldn't resolve a URL from that command." };
  },
};
