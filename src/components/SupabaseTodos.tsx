import React, { useEffect, useState } from 'react';
import { createClient } from '../utils/supabase/client';

export default function SupabaseTodos() {
  const [todos, setTodos] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('todos').select();
        
        if (error) throw error;
        setTodos(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, []);

  if (loading) return <div className="p-4 text-white/60">Loading todos...</div>;
  if (error) return <div className="p-4 text-red-400">Error: {error}</div>;

  return (
    <div className="p-4 glass-card rounded-2xl border border-white/10">
      <h2 className="text-xl font-bold text-white mb-4">Supabase Todos</h2>
      <ul className="space-y-2">
        {todos?.map((todo) => (
          <li key={todo.id} className="text-white/80 bg-white/5 p-2 rounded-lg border border-white/5">
            {todo.name}
          </li>
        ))}
        {todos?.length === 0 && <li className="text-white/40 italic">No todos found.</li>}
      </ul>
    </div>
  );
}
