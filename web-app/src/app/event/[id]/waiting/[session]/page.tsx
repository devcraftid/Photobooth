'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle2, Clock, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WaitingRoom() {
  const { id: eventId, session: sessionId } = useParams<{ id: string, session: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<string>('waiting');
  const [token, setToken] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase
        .from('sessions')
        .select('status, token')
        .eq('id', sessionId)
        .single();
      
      if (data) {
        setStatus(data.status);
        if (data.token) setToken(data.token);
      }
    };

    fetchSession();

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setStatus(payload.new.status);
          if (payload.new.token) setToken(payload.new.token);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    if (status === 'finished' && token) {
      router.push(`/gallery/${token}`);
    }
  }, [status, token, router]);

  const renderContent = () => {
    switch (status) {
      case 'waiting':
        return (
          <>
            <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping" />
              <Clock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You are in the queue</h2>
            <p className="text-zinc-400">Please wait for the admin to call you to the photobooth.</p>
          </>
        );
      case 'approved':
      case 'active':
        return (
          <>
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">It's your turn!</h2>
            <p className="text-zinc-400">Please step into the photobooth now.</p>
          </>
        );
      case 'processing':
        return (
          <>
            <div className="w-20 h-20 bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Processing your photo...</h2>
            <p className="text-zinc-400">Creating your awesome memories.</p>
          </>
        );
      case 'expired':
        return (
          <>
             <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Session Cancelled</h2>
            <p className="text-zinc-400">Your session was skipped or expired.</p>
          </>
        )
      default:
        return (
          <div className="flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl text-center shadow-2xl"
      >
        {renderContent()}
      </motion.div>
    </div>
  );
}
