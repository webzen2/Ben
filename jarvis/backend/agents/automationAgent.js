import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WORKFLOW_SYSTEM_PROMPT = `You are Jarvis's automation architect. Ben runs BCAutomations and builds automations in n8n and Make.com for himself and clients.

Given a description of what Ben wants automated, design a complete, concrete workflow and respond ONLY with JSON (no markdown fences, no commentary before or after) in this exact shape:

{
  "summary": "one sentence describing what this automation does",
  "platform": "n8n" | "make",
  "trigger": { "type": "webhook|schedule|app_event", "description": "..." },
  "steps": [
    { "step": 1, "app": "e.g. Gmail, GHL, Slack", "action": "what happens", "notes": "config details, field mappings, conditions" }
  ],
  "n8nWorkflow": { "nodes": [...], "connections": {...} },
  "webhookUrl": "/webhook/<slug>"
}

Rules:
- n8nWorkflow must be valid, importable n8n workflow JSON (nodes array with id/name/type/typeVersion/position/parameters, plus a connections object wiring them together).
- If the trigger is a webhook, use the n8n-nodes-base.webhook node as the entry node.
- Use realistic node types (n8n-nodes-base.gmail, n8n-nodes-base.httpRequest, n8n-nodes-base.set, n8n-nodes-base.if, n8n-nodes-base.googleSheets, n8n-nodes-base.slack, etc).
- If platform is "make", still fill n8nWorkflow as the closest n8n equivalent (Ben can reference it), but make "steps" the primary Make.com build guide with concrete module names.
- Keep step notes concrete and actionable — exact field names, conditions, and values, not vague advice.
- Never reply with just an acknowledgement. Always produce the full JSON described above.`;

const BRAINSTORM_SYSTEM_PROMPT = `You are Jarvis's automation strategist for BCAutomations, an AI automation agency. Ben wants to brainstorm automation ideas using Make.com, n8n, GHL, or Zapier.
Respond ONLY with JSON (no markdown fences, no commentary): { "ideas": [ { "title": "...", "pitch": "1-2 sentences", "trigger": "...", "value": "why this saves time or makes money" } ] }
Give 4-6 concrete, specific ideas relevant to what Ben described — not generic advice.`;

function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return JSON');
  return JSON.parse(match[0]);
}

export const automationAgent = {
  async generateWorkflow(description, platform = 'n8n') {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: WORKFLOW_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Platform preference: ${platform}\nWhat Ben wants automated: ${description}` }],
    });
    return extractJSON(response.content[0].text);
  },

  async brainstorm(description) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: BRAINSTORM_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: description }],
    });
    return extractJSON(response.content[0].text);
  },
};
