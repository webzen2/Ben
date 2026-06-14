import Anthropic from '@anthropic-ai/sdk';
import { memoryAgent } from './memoryAgent.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_PROMPT = `You are Jarvis, Ben Curry's private AI operating system.

About Ben:
- Founder of BCAutomations, an AI-powered business automation agency in Fayetteville, AR
- Website: bcautomations.vercel.app
- Uses GoHighLevel (GHL), Supabase, Vercel, Railway, Make.com
- You address him as Ben, keep responses short and conversational (voice-first)

You handle commands by routing to the right agent. When the user says "remember this", "add a memory", "learn that", or similar — save it as a memory. When they say "forget" something, remove it.

If the user says "open [something]", respond with a URL in the url field.

Always respond in JSON: { agent, action, response, data?, url? }
Keep responses brief — they are spoken aloud.`;

const AGENT_KEYWORDS = {
  memory: ['remember', 'memorize', 'learn that', 'add.*memory', 'forget', 'what do you know', 'what have i taught'],
  client: ['client', 'pipeline', 'onboard', 'contract', 'ghl', 'lead', 'follow.?up', 'dm'],
  files: ['note', 'pdf', 'upload', 'document', 'summarize', 'save', 'find.*note', 'notes about'],
  research: ['search', 'research', 'competitor', 'look up', 'find out', 'intel', 'news'],
  social: ['post', 'instagram', 'facebook', 'schedule.*post', 'analytics', 'engagement', 'reply'],
  calendar: ['calendar', 'schedule', 'event', 'meeting', 'appointment', 'today', 'tomorrow'],
  browser: ['open', 'show me', 'go to', 'navigate', 'website', 'url'],
  tasks: ['task', 'idea', 'remind me', 'todo', 'to.?do', 'add.*task', 'save.*idea'],
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

    // Handle memory commands directly
    if (detectedAgent === 'memory') {
      return this.handleMemory(command, lc);
    }

    let memorySummary = '';
    try {
      memorySummary = await memoryAgent.getMemorySummary();
    } catch {}

    const systemPrompt = memorySummary
      ? `${BASE_PROMPT}\n\nBen's saved memories:\n${memorySummary}`
      : BASE_PROMPT;

    const messages = [
      ...context,
      { role: 'user', content: `[Agent hint: ${detectedAgent}] Command: ${command}` },
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
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

  async handleMemory(command, lc) {
    if (/forget|remove.*memory|delete.*memory/i.test(lc)) {
      const memories = await memoryAgent.getMemories();
      const match = memories.find(m => lc.includes(m.content.toLowerCase().slice(0, 20)));
      if (match) {
        await memoryAgent.deleteMemory(match.id);
        return { agent: 'memory', action: 'delete', response: `Done, I forgot that.` };
      }
      return { agent: 'memory', action: 'list', response: `I couldn't find that memory. Ask me "what do you know" to see all memories.` };
    }

    if (/what do you know|what have i taught|list.*memor|show.*memor/i.test(lc)) {
      const memories = await memoryAgent.getMemories();
      if (!memories.length) {
        return { agent: 'memory', action: 'list', response: `I don't have any saved memories yet. Tell me to remember something.` };
      }
      const list = memories.map(m => m.content).join('. ');
      return { agent: 'memory', action: 'list', response: `Here's what I know: ${list}` };
    }

    // Save new memory
    const content = command
      .replace(/^(remember|memorize|learn|add.*memory|save|remember that|learn that)\s*/i, '')
      .replace(/^(that\s+)?/i, '')
      .trim();

    if (!content) {
      return { agent: 'memory', action: 'error', response: `What should I remember?` };
    }

    // Detect category from content
    let category = 'general';
    if (/client|customer|lead/i.test(content)) category = 'clients';
    else if (/password|key|login|credential/i.test(content)) category = 'credentials';
    else if (/prefer|like|want|always|never/i.test(content)) category = 'preferences';
    else if (/business|company|bcautomation/i.test(content)) category = 'business';

    await memoryAgent.addMemory({ content, category });
    return { agent: 'memory', action: 'save', response: `Got it, I'll remember that.` };
  },

  async composeBriefing({ schedule, intel, pipeline }) {
    let memorySummary = '';
    try {
      memorySummary = await memoryAgent.getMemorySummary();
    } catch {}

    const prompt = `Compose a concise morning briefing for Ben. Include:
- Today's schedule: ${JSON.stringify(schedule)}
- Top competitor intel: ${JSON.stringify(intel?.slice?.(0, 3))}
- Pipeline snapshot: ${JSON.stringify(pipeline)}
${memorySummary ? `\nBen's saved context:\n${memorySummary}` : ''}
Keep it under 120 words, conversational, start with "Good morning, Ben."`;

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    return { briefing: response.content[0].text };
  },
};
