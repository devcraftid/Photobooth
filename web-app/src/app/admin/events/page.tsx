'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, CheckCircle2, XCircle, Clock, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Event = {
  id: string;
  name: string;
  status: string;
  date: string;
};

type Session = {
  id: string;
  client_name: string;
  status: string;
  created_at: string;
  event_id: string;
};

export default function EventsAdmin() {
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!activeEvent) return;

    fetchSessions(activeEvent.id);

    // Setup Realtime Listener
    const channel = supabase
      .channel('sessions-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `event_id=eq.${activeEvent.id}`,
        },
        (payload) => {
          fetchSessions(activeEvent.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeEvent]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setEvents(data);
      if (data.length > 0) setActiveEvent(data[0]);
    }
    setLoading(false);
  };

  const fetchSessions = async (eventId: string) => {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('event_id', eventId)
      .in('status', ['waiting', 'approved', 'active'])
      .order('created_at', { ascending: true });
    
    if (data) setSessions(data);
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    await supabase
      .from('sessions')
      .update({ status })
      .eq('id', sessionId);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Event Operations</h1>
        <p className="text-zinc-400 mt-1">Manage events and approve client sessions in real-time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Events Sidebar */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Select Event
          </h2>
          <div className="space-y-2 overflow-y-auto pr-2">
            {events.map(event => (
              <button
                key={event.id}
                onClick={() => setActiveEvent(event)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  activeEvent?.id === event.id 
                    ? 'bg-white text-zinc-950 border-white shadow-lg' 
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <h3 className="font-bold truncate">{event.name}</h3>
                <div className="flex items-center gap-2 mt-2 text-xs font-medium">
                  <span className={`px-2 py-1 rounded-md ${
                    event.status === 'active' 
                      ? (activeEvent?.id === event.id ? 'bg-zinc-200' : 'bg-emerald-500/10 text-emerald-500')
                      : (activeEvent?.id === event.id ? 'bg-zinc-200' : 'bg-zinc-800 text-zinc-500')
                  }`}>
                    {event.status.toUpperCase()}
                  </span>
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
            {events.length === 0 && (
              <div className="text-center p-8 text-zinc-500">
                No events found. Create one first.
              </div>
            )}
          </div>
        </div>

        {/* Real-time Queue */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-3">
                Live Queue 
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                {activeEvent ? `Showing queue for ${activeEvent.name}` : 'Select an event'}
              </p>
            </div>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search name..." 
                className="bg-transparent outline-none text-sm w-32"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 relative z-10">
            {activeEvent && sessions.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <Clock className="w-12 h-12 mb-4 opacity-20" />
                <p>Waiting for clients to scan QR code...</p>
              </div>
            )}

            <AnimatePresence>
              {sessions.map(session => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-lg text-zinc-300">
                      {session.client_name ? session.client_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">{session.client_name || 'Anonymous'}</h4>
                      <p className="text-zinc-500 text-sm flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {new Date(session.created_at).toLocaleTimeString()}
                        <span className="mx-2">•</span>
                        Status: <span className={
                          session.status === 'waiting' ? 'text-amber-500' :
                          session.status === 'approved' ? 'text-emerald-500' :
                          'text-indigo-500'
                        }>{session.status}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {session.status === 'waiting' && (
                      <>
                        <button 
                          onClick={() => updateSessionStatus(session.id, 'expired')}
                          className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => updateSessionStatus(session.id, 'approved')}
                          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5" /> Approve
                        </button>
                      </>
                    )}
                    {session.status === 'approved' && (
                      <div className="px-4 py-2 bg-zinc-900 rounded-lg text-zinc-400 text-sm font-medium">
                        Waiting for Booth
                      </div>
                    )}
                    {session.status === 'active' && (
                      <div className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-medium flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        In Session
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
