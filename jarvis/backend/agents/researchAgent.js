import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
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

const COMPETITOR_QUERIES = [
  'AI automation agency',
  'GoHighLevel agency 2025',
  'AI receptionist small business',
  'Automation Agency news',
];

async function serperSearch(query) {
  const { data } = await axios.post('https://google.serper.dev/news', { q: query, num: 5 }, {
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
  });
  return data.news || [];
}

async function braveSearch(query) {
  const { data } = await axios.get('https://api.search.brave.com/res/v1/web/search', {
    params: { q: query, count: 5 },
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY },
  });
  return data.web?.results || [];
}

export const researchAgent = {
  async search(query) {
    const results = process.env.SERPER_API_KEY
      ? await serperSearch(query)
      : await braveSearch(query);

    const summaryResp = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Summarize these search results for Ben at BCAutomations, focusing on what's relevant to his AI automation agency business:\n\n${JSON.stringify(results.slice(0, 5))}`,
      }],
    });

    return { query, results: results.slice(0, 5), summary: summaryResp.content[0].text };
  },

  async pullCompetitorIntel() {
    const allResults = [];
    for (const q of COMPETITOR_QUERIES) {
      try {
        const results = process.env.SERPER_API_KEY ? await serperSearch(q) : await braveSearch(q);
        allResults.push(...results.slice(0, 3).map(r => ({ ...r, query: q })));
      } catch (e) {
        console.error(`[research] query failed: ${q}`, e.message);
      }
    }

    const top = allResults.slice(0, 10);

    const { error } = await getSupabase().from('jarvis_intel').insert({
      results: top,
      pulled_at: new Date().toISOString(),
    });
    if (error) console.error('[intel] supabase insert error', error);

    return top;
  },

  async getCompetitorIntel() {
    const { data } = await getSupabase()
      .from('jarvis_intel')
      .select('*')
      .order('pulled_at', { ascending: false })
      .limit(1)
      .single();

    if (!data || Date.now() - new Date(data.pulled_at).getTime() > 86_400_000) {
      return this.pullCompetitorIntel();
    }
    return data.results;
  },
};
