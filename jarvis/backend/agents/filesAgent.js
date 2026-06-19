import Anthropic from '@anthropic-ai/sdk';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { createClient } from '@supabase/supabase-js';

let client, supabase;
function getClient() {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}
function getSupabase() {
  if (!supabase) supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return supabase;
}

export const filesAgent = {
  async uploadAndSummarize(file) {
    if (!file) throw new Error('No file provided');

    let textContent = '';
    if (file.mimetype === 'application/pdf') {
      const parsed = await pdf(file.buffer);
      textContent = parsed.text;
    } else {
      textContent = file.buffer.toString('utf-8');
    }

    const summaryResp = await getClient().messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Summarize this document concisely for Ben Curry at BCAutomations. Extract key action items, dates, and decisions.\n\n${textContent.slice(0, 8000)}`,
      }],
    });

    const summary = summaryResp.content[0].text;

    const { data, error } = await getSupabase().from('jarvis_files').insert({
      filename: file.originalname,
      summary,
      raw_text: textContent.slice(0, 50000),
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    return { id: data.id, filename: file.originalname, summary };
  },

  async saveNote({ content, topic, tags = [] }) {
    const { data, error } = await getSupabase().from('jarvis_notes').insert({
      content,
      topic: topic || 'general',
      tags,
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    return { id: data.id, saved: true };
  },

  async getNotesByTopic(topic) {
    let query = getSupabase().from('jarvis_notes').select('*').order('created_at', { ascending: false });
    if (topic) query = query.ilike('topic', `%${topic}%`);
    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data;
  },
};
