'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Plus, Calendar as CalendarIcon, CheckCircle2, Copy, PlayCircle, StopCircle } from 'lucide-react';
import { motion } from 'framer-motion';

type Event = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEventName, setNewEventName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const supabase = createClient();

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [supabase]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    setIsCreating(true);

    const { error } = await supabase
      .from('events')
      .insert({ name: newEventName, status: 'draft' });

    if (!error) {
      setNewEventName('');
      await fetchEvents();
    } else {
      alert(error.message);
    }
    setIsCreating(false);
  };

  const toggleEventStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    
    // If activating, we might want to deactivate others, but let's keep it simple
    // or we can deactivate all others first
    if (newStatus === 'active') {
      await supabase.from('events').update({ status: 'draft' }).neq('id', id);
    }

    const { error } = await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      await fetchEvents();
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/event/${id}/join`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Event Manager</h1>
          <p className="text-zinc-400">Create and manage your photobooth events.</p>
        </div>
        
        <form onSubmit={handleCreate} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            placeholder="Event Name (e.g. Budi & Ani)"
            className="flex-1 md:w-64 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
            required
          />
          <button
            type="submit"
            disabled={isCreating}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={event.id}
              className={`bg-zinc-900/50 border rounded-2xl p-6 ${
                event.status === 'active' ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-zinc-800'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${event.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white truncate max-w-[150px]">{event.name}</h3>
                    <span className="text-xs text-zinc-500">{new Date(event.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {event.status === 'active' && (
                  <span className="flex items-center gap-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                )}
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => toggleEventStatus(event.id, event.status)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-colors text-sm ${
                    event.status === 'active' 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {event.status === 'active' ? (
                     <><StopCircle className="w-4 h-4" /> Deactivate</>
                  ) : (
                     <><PlayCircle className="w-4 h-4" /> Set Active</>
                  )}
                </button>
                <button
                  onClick={() => copyLink(event.id)}
                  title="Copy Client Join Link"
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">
              No events found. Create one to get started!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
