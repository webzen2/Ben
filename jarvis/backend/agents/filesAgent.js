import Anthropic from '@anthropic-ai/sdk';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

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

    const summaryResp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Summarize this document concisely for Ben Curry at BCAutomations. Extract key action items, dates, and decisions.\n\n${textContent.slice(0, 8000)}`,
      }],
    });

    const summary = summaryResp.content[0].text;

    const { data, error } = await supabase.from('jarvis_files').insert({
      filename: file.originalname,
      summary,
      raw_text: textContent.slice(0, 50000),
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    return { id: data.id, filename: file.originalname, summary };
  },

  async saveNote({ content, topic, tags = [] }) {
    const { data, error } = await supabase.from('jarvis_notes').insert({
      content,
      topic: topic || 'general',
      tags,
      created_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    return { id: data.id, saved: true };
  },

  async getNotesByTopic(topic) {
    let query = supabase.from('jarvis_notes').select('*').order('created_at', { ascending: false });
    if (topic) query = query.ilike('topic', `%${topic}%`);
    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data;
  },
};
