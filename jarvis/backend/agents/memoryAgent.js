import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export const memoryAgent = {
  async addMemory({ content, category = 'general' }) {
    const { data, error } = await supabase
      .from('jarvis_memories')
      .insert({ content, category })
      .select()
      .single();
    if (error) throw error;
    return { saved: true, memory: data };
  },

  async getMemories(category) {
    let query = supabase
      .from('jarvis_memories')
      .select('*')
      .order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async deleteMemory(id) {
    const { error } = await supabase
      .from('jarvis_memories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { deleted: true };
  },

  async getMemorySummary() {
    const { data, error } = await supabase
      .from('jarvis_memories')
      .select('content, category')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return '';
    if (!data?.length) return '';
    return data.map(m => `[${m.category}] ${m.content}`).join('\n');
  },
};
