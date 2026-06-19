import Anthropic from '@anthropic-ai/sdk';
import { memoryAgent } from './memoryAgent.js';
import { automationAgent } from './automationAgent.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_PROMPT = `You are Jarvis, Ben Curry's private AI operating system.

About Ben:
- Founder of BCAutomations, an AI-powered business automation agency in Fayetteville, AR
- Website: bcautomations.vercel.app
- Uses GoHighLevel (GHL), Supabase, Vercel, Railway, Make.com
- You address him as Ben, keep responses short and conversational (voice-first)

You handle commands by routing to the right agent. When the user says "remember this", "add a memory", "learn that", or similar — save it as a memory. When they say "forget" something, remove it.

If the user says "open [something]", respond with a URL in the url field.

When the user asks to "make", "create", "generate", "build", or "draft" something (spreadsheet, agenda, report, plan, list, template, invoice, proposal, etc.), generate it as structured data in the "data" field. Use objects, arrays, and tables. The response field should be a short spoken summary. The data field should contain the full generated content.

Always respond in JSON: { agent, action, response, data?, url? }
Keep responses brief — they are spoken aloud.`;

const TASK_PLANNER_PROMPT = `You are Jarvis's task planner. Given a user command, decide which agent(s) to invoke and in what order.

Available agents and their capabilities:
- memory: save/recall/delete memories and learned facts
- email: check inbox, search emails, send emails
- client: CRM pipeline, onboarding, follow-ups, contracts (GoHighLevel)
- files: upload files, save/search notes
- research: web search, competitor intel
- social: schedule posts, analytics, draft DM replies (Instagram/Facebook)
- calendar: today's schedule, create events
- browser: open URLs/websites
- tasks: todo list, ideas, reminders
- automation: build or brainstorm automations/workflows/webhooks for Make.com or n8n
- general: conversation, questions, advice

Rules:
- For simple single-agent commands, return one step
- For complex commands that need multiple agents, return ordered steps
- If an action is destructive (sending email, deleting data, posting to social), set needsConfirmation: true
- Keep it minimal — don't over-plan

Respond in JSON only:
{
  "steps": [
    { "agent": "agent_name", "action": "what to do", "needsConfirmation": false }
  ],
  "intent": "brief summary of what user wants"
}`;

const AGENT_KEYWORDS = {
  memory: ['remember', 'memorize', 'learn that', 'add.*memory', 'forget', 'what do you know', 'what have i taught'],
  email: ['email', 'inbox', 'mail', 'unread', 'send.*email', 'check.*email', 'any.*emails', 'new.*emails'],
  client: ['client', 'pipeline', 'onboard', 'contract', 'ghl', 'lead', 'follow.?up', 'dm'],
  files: ['note', 'pdf', 'upload', 'document', 'summarize', 'save', 'find.*note', 'notes about'],
  research: ['search', 'research', 'competitor', 'look up', 'find out', 'intel', 'news', 'what.*up to'],
  social: ['post', 'instagram', 'facebook', 'schedule.*post', 'analytics', 'engagement', 'reply', 'draft.*post', 'create.*post', 'write.*post'],
  calendar: ['calendar', 'schedule', 'event', 'meeting', 'appointment', 'today', 'tomorrow'],
  browser: ['open', 'show me', 'go to', 'navigate', 'website', 'url'],
  automation: ['automation', 'automate', 'workflow', 'n8n', 'make\\.com', 'zapier', 'webhook', 'scenario', 'integrate.*with', 'build.*flow'],
  tasks: ['task', 'idea', 'remind me', 'todo', 'to.?do', 'add.*task', 'save.*idea'],
};

function quickDetect(command) {
  const lc = command.toLowerCase();
  for (const [agent, patterns] of Object.entries(AGENT_KEYWORDS)) {
    if (patterns.some(p => new RegExp(p).test(lc))) return agent;
  }
  return 'general';
}

function isComplexCommand(command) {
  const lc = command.toLowerCase();
  const agentHits = Object.entries(AGENT_KEYWORDS).filter(([, patterns]) =>
    patterns.some(p => new RegExp(p).test(lc))
  );
  if (agentHits.length > 1) return true;
  if (/\b(and then|after that|also|plus)\b/.test(lc)) return true;
  return false;
}

export const brainAgent = {
  async dispatch(command, context = []) {
    const lc = command.toLowerCase();
    const detected = quickDetect(command);

    // Memory commands are fast-path — no LLM needed
    if (detected === 'memory') {
      return this.handleMemory(command, lc);
    }

    // Automation/workflow builds always go through the dedicated agent —
    // it guarantees real generated output instead of a conversational no-op.
    if (detected === 'automation') {
      return this.handleAutomation(command, lc);
    }

    // For complex multi-agent commands, use the LLM task planner
    if (isComplexCommand(command)) {
      return this.planAndExecute(command, context);
    }

    // Simple single-agent commands use fast keyword routing
    return this.singleAgentDispatch(command, context, quickDetect(command));
  },

  async planAndExecute(command, context) {
    const planResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: TASK_PLANNER_PROMPT,
      messages: [{ role: 'user', content: command }],
    });

    let plan;
    try {
      const text = planResponse.content[0].text;
      plan = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    } catch {
      return this.singleAgentDispatch(command, context, quickDetect(command));
    }

    const steps = plan.steps || [];
    if (!steps.length) {
      return this.singleAgentDispatch(command, context, quickDetect(command));
    }

    // Check if any step needs confirmation
    const needsConfirm = steps.find(s => s.needsConfirmation);
    if (needsConfirm) {
      return {
        agent: needsConfirm.agent,
        action: 'confirm',
        response: `Just to confirm — you want me to ${needsConfirm.action}?`,
        pendingPlan: plan,
        detectedAgent: needsConfirm.agent,
      };
    }

    // Execute the plan (first step for now, can chain later)
    return this.singleAgentDispatch(command, context, steps[0].agent);
  },

  async singleAgentDispatch(command, context, detectedAgent) {
    let memorySummary = '';
    try {
      memorySummary = await memoryAgent.getMemorySummary();
    } catch {}

    const systemPrompt = memorySummary
      ? `${BASE_PROMPT}\n\nBen's saved memories:\n${memorySummary}`
      : BASE_PROMPT;

    const isGenerateCommand = /\b(make|create|generate|build|draft|write)\b/i.test(command);
    const maxTokens = isGenerateCommand ? 1024 : 256;

    const messages = [
      ...context,
      { role: 'user', content: `[Agent hint: ${detectedAgent}] Command: ${command}` },
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    let parsed;
    try {
      const text = response.content[0].text.replace(/```json|```/g, '');
      parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || text);
    } catch {
      parsed = { agent: detectedAgent, action: 'respond', response: response.content[0].text };
    }

    return { ...parsed, detectedAgent };
  },

  async handleAutomation(command, lc) {
    const isBrainstorm = /brainstorm|suggest|what (automations?|workflows?)|give me.*idea/i.test(lc);

    try {
      if (isBrainstorm) {
        const result = await automationAgent.brainstorm(command);
        return {
          agent: 'automation',
          action: 'brainstorm',
          response: `Got ${result.ideas?.length || 0} automation ideas for you.`,
          data: result,
        };
      }

      const platform = /\bmake(\.com)?\b/i.test(lc) ? 'make' : 'n8n';
      const workflow = await automationAgent.generateWorkflow(command, platform);
      return {
        agent: 'automation',
        action: 'generate',
        response: workflow.summary || `Built a ${platform} workflow for that.`,
        data: workflow,
      };
    } catch (err) {
      return {
        agent: 'automation',
        action: 'error',
        response: `I couldn't build that automation — ${err.message}`,
      };
    }
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

    const content = command
      .replace(/^(remember|memorize|learn|add.*memory|save|remember that|learn that)\s*/i, '')
      .replace(/^(that\s+)?/i, '')
      .trim();

    if (!content) {
      return { agent: 'memory', action: 'error', response: `What should I remember?` };
    }

    let category = 'general';
    if (/client|customer|lead/i.test(content)) category = 'clients';
    else if (/password|key|login|credential/i.test(content)) category = 'credentials';
    else if (/prefer|like|want|always|never/i.test(content)) category = 'preferences';
    else if (/business|company|bcautomation/i.test(content)) category = 'business';

    await memoryAgent.addMemory({ content, category });
    return { agent: 'memory', action: 'save', response: `Got it, I'll remember that.` };
  },

  async composeBriefing({ schedule, intel, pipeline, emails }) {
    let memorySummary = '';
    try {
      memorySummary = await memoryAgent.getMemorySummary();
    } catch {}

    const prompt = `Compose a concise morning briefing for Ben. Include:
- Today's schedule: ${JSON.stringify(schedule)}
- Top competitor intel: ${JSON.stringify(intel?.slice?.(0, 3))}
- Pipeline snapshot: ${JSON.stringify(pipeline)}
- Unread emails: ${JSON.stringify(emails)}
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
