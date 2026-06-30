'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, UserCheck, Clock, CheckCircle2, DollarSign, Image as ImageIcon } from 'lucide-react';

type Session = {
  id: string;
  client_name: string;
  status: string;
  created_at: string;
  events: { name: string } | null;
};

export default function LiveQueue() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchQueue = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id,
        client_name,
        status,
        created_at,
        events ( name )
      `)
      .in('status', ['waiting', 'approved'])
      .order('created_at', { ascending: true });

    if (!error && data) {
      setSessions(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel('live-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        fetchQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (id: string) => {
    // Approve means payment received, moving them to Kiosk
    const { error } = await supabase
      .from('sessions')
      .update({ status: 'approved' })
      .eq('id', id);

    if (error) {
      alert(error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
  }

  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const approvedSessions = sessions.filter(s => s.status === 'approved');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Live Queue (Kasir)</h1>
        <p className="text-zinc-400">Manage manual payments and approve guests into the photobooth.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Waiting List */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Waiting for Payment
            </h2>
            <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-sm font-medium">
              {waitingSessions.length} in queue
            </span>
          </div>

          <div className="space-y-4">
            {waitingSessions.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No one is waiting.</p>
            ) : (
              waitingSessions.map(session => (
                <div key={session.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between group">
                  <div>
                    <h3 className="font-bold text-lg text-white">{session.client_name}</h3>
                    <p className="text-sm text-zinc-500">Event: {session.events?.name || 'Unknown'}</p>
                    <p className="text-xs text-zinc-600 mt-1">{new Date(session.created_at).toLocaleTimeString()}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const url = supabase.storage.from('photobooth-templates').getPublicUrl(`proofs/${session.id}.png`).data.publicUrl;
                        window.open(url, '_blank');
                      }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                      title="Lihat Bukti Pembayaran"
                    >
                      <ImageIcon className="w-4 h-4" /> Bukti
                    </button>
                    <button 
                      onClick={() => handleApprove(session.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <DollarSign className="w-4 h-4" /> Paid & Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Approved List */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" /> Next in Kiosk
            </h2>
            <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-sm font-medium">
              {approvedSessions.length} ready
            </span>
          </div>

          <div className="space-y-4">
            {approvedSessions.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">Kiosk queue is empty.</p>
            ) : (
              approvedSessions.map(session => (
                <div key={session.id} className="bg-zinc-950 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-white">{session.client_name}</h3>
                    <p className="text-sm text-zinc-500">Event: {session.events?.name || 'Unknown'}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Paid
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
