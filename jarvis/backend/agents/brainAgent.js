import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are Jarvis, Ben Curry's private AI operating system for BCAutomations (Fayetteville, AR).
You are voice-first, decisive, and brief. Ben is the founder — you address him by name occasionally.
Route commands to the right agent. When composing briefings, be warm but concise.
Always respond in JSON: { agent, action, response, data?, url? }`;

const AGENT_KEYWORDS = {
  client: ['client', 'pipeline', 'onboard', 'contract', 'ghl', 'lead', 'follow.?up', 'dm'],
  files: ['note', 'pdf', 'upload', 'document', 'summarize', 'save', 'find.*note', 'notes about'],
  research: ['search', 'research', 'competitor', 'look up', 'find out', 'intel', 'news'],
  social: ['post', 'instagram', 'facebook', 'schedule.*post', 'analytics', 'engagement', 'reply'],
  calendar: ['calendar', 'schedule', 'event', 'meeting', 'appointment', 'today', 'tomorrow'],
  browser: ['open', 'show me', 'go to', 'navigate', 'website', 'url'],
};

export const brainAgent = {
  async dispatch(command, context = []) {
    const lc = command.toLowerCase();
    let detectedAgent = 'general';

    for (const [agent, patterns] of Object.entries(AGENT_KEYWORDS)) {
      if (patterns.some(p => new RegExp(p).test(lc))) {
        detectedAgent = agent;
        break;
      }
    }

    const messages = [
      ...context,
      { role: 'user', content: `[Agent hint: ${detectedAgent}] Command: ${command}` },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    let parsed;
    try {
      const text = response.content[0].text;
      parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    } catch {
      parsed = { agent: detectedAgent, action: 'respond', response: response.content[0].text };
    }

    return { ...parsed, detectedAgent };
  },

  async composeBriefing({ schedule, intel, pipeline }) {
    const prompt = `Compose a concise morning briefing for Ben. Include:
- Today's schedule: ${JSON.stringify(schedule)}
- Top competitor intel: ${JSON.stringify(intel?.slice?.(0, 3))}
- Pipeline snapshot: ${JSON.stringify(pipeline)}
Keep it under 120 words, conversational, start with "Good morning, Ben."`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    return { briefing: response.content[0].text };
  },
};
