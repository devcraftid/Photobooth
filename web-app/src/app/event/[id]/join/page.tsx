'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camera, Loader2, Sparkles, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JoinEvent() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();
  const [eventName, setEventName] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState(1); // 1 = Name, 2 = Payment QR
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('name, status')
        .eq('id', eventId)
        .single();

      if (error || !data) {
        setError('Event not found or invalid QR code.');
      } else {
        setEventName(data.name);
        
        // Fetch QRIS image URL
        const { data: qrisData } = supabase.storage
          .from('photobooth-templates')
          .getPublicUrl('settings/qris.png');
          
        setQrisUrl(qrisData.publicUrl);
      }
      setLoading(false);
    };

    fetchEvent();
  }, [eventId, supabase]);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setStep(2);
    }
  };

  const handleJoinQueue = async () => {
    setSubmitting(true);
    setError('');

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        event_id: eventId,
        client_name: name,
        status: 'waiting',
      })
      .select('id')
      .single();

    if (error) {
      setError(error.message);
      setSubmitting(false);
    } else if (data) {
      // Redirect to waiting room
      router.push(`/event/${eventId}/waiting/${data.id}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
  }

  if (error && !eventName) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center max-w-sm w-full">
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-2xl max-h-2xl bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-8 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-sm font-medium text-indigo-400 tracking-wider uppercase mb-1">Welcome to</h2>
          <h1 className="text-2xl font-bold text-white">{eventName}</h1>
          <p className="text-zinc-400 mt-2 text-sm">Enter your name to join the photobooth queue.</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-6">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={30}
                className="w-full px-5 py-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-white transition-all text-center text-lg"
                placeholder="Your Name"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <QrCode className="w-5 h-5" /> Proceed to Payment
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl">
              {qrisUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={qrisUrl} alt="QRIS" className="w-full aspect-square object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div className="w-full aspect-square bg-zinc-100 flex items-center justify-center rounded-xl">
                  <p className="text-zinc-400 text-sm">QRIS Not Set</p>
                </div>
              )}
            </div>
            
            <p className="text-zinc-400 text-center text-sm">
              Please scan the QRIS above and pay <strong className="text-white">Rp 20.000</strong>.
              After payment, tap the button below.
            </p>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              onClick={handleJoinQueue}
              disabled={submitting}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 text-lg shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            >
              {submitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" /> I Have Paid
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
