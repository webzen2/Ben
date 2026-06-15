import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export const taskAgent = {
  async addTask({ title, body }) {
    const { data, error } = await supabase.from('jarvis_tasks').insert({
      title,
      body: body || null,
      status: 'open',
    }).select().single();
    if (error) throw error;
    return { id: data.id, saved: true, title };
  },

  async getTasks(status = 'open') {
    const { data, error } = await supabase
      .from('jarvis_tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) throw error;
    return data;
  },

  async closeTask(id) {
    const { error } = await supabase.from('jarvis_tasks').update({ status: 'done' }).eq('id', id);
    if (error) throw error;
    return { closed: true, id };
  },
};
