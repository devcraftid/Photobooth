import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import Webcam from 'react-webcam';
import * as htmlToImage from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import { Camera, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

type Session = {
  id: string;
  client_name: string;
  status: string;
  event_id: string;
};

type AppState = 'IDLE' | 'GET_READY' | 'COUNTDOWN' | 'PROCESSING' | 'FINISHED';

const EVENT_ID = '11111111-1111-1111-1111-111111111111'; // Replace with actual Event ID

function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [galleryToken, setGalleryToken] = useState<string>('');
  
  const webcamRef = useRef<Webcam>(null);
  const compositeRef = useRef<HTMLDivElement>(null);

  // 1. Listen for Approved Sessions
  useEffect(() => {
    const fetchWaiting = async () => {
      // Find if there's already an active session
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .in('status', ['approved', 'active'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (data && appState === 'IDLE') {
        startSession(data);
      }
    };

    fetchWaiting();

    const channel = supabase
      .channel('kiosk-sessions')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, (payload) => {
        if (payload.new.status === 'approved' && appState === 'IDLE') {
          startSession(payload.new as Session);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appState]);

  const startSession = async (session: Session) => {
    setActiveSession(session);
    setAppState('GET_READY');
    
    // Fetch template for this event
    const { data: templateData } = await supabase
      .from('templates')
      .select('background_url')
      .eq('event_id', session.event_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (templateData) {
      setActiveTemplate(templateData.background_url);
    } else {
      setActiveTemplate(null);
    }
    
    // Update status to active
    await supabase.from('sessions').update({ status: 'active' }).eq('id', session.id);

    // Give them 3 seconds to get ready, then start countdown
    setTimeout(() => {
      setAppState('COUNTDOWN');
      setCountdown(3);
    }, 3000);
  };

  // 2. Countdown Timer
  useEffect(() => {
    if (appState === 'COUNTDOWN' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (appState === 'COUNTDOWN' && countdown === 0) {
      capturePhoto();
    }
  }, [appState, countdown]);

  // 3. Capture & Process
  const capturePhoto = async () => {
    setAppState('PROCESSING');
    
    // 3.1 Get Image from Webcam
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      alert("Camera error!");
      resetKiosk();
      return;
    }

    setCapturedImage(imageSrc);

    // 3.2 Wait for render, then composite using html2canvas
    setTimeout(async () => {
      if (compositeRef.current && activeSession) {
        try {
          const finalBase64 = await htmlToImage.toPng(compositeRef.current, {
            pixelRatio: 2
          });
          const blob = await (await fetch(finalBase64)).blob();

          // 3.3 Upload to Supabase Storage
          const fileName = `final-${activeSession.id}.png`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('photobooth-events')
            .upload(`${activeSession.event_id}/${activeSession.id}/${fileName}`, blob, {
              contentType: 'image/png'
            });

          if (uploadError) throw uploadError;

          // 3.4 Get Public URL
          const { data: publicUrlData } = supabase.storage
            .from('photobooth-events')
            .getPublicUrl(`${activeSession.event_id}/${activeSession.id}/${fileName}`);

          // 3.5 Create Gallery Entry
          const token = Math.random().toString(36).substring(2, 15);
          await supabase.from('galleries').insert({
            session_id: activeSession.id,
            final_image_url: publicUrlData.publicUrl,
            token: token
          });

          // 3.6 Update Session Status
          await supabase.from('sessions').update({ 
            status: 'finished',
            token: token
          }).eq('id', activeSession.id);

          setGalleryToken(token);
          setAppState('FINISHED');

          // 3.7 Auto reset after 15 seconds
          setTimeout(() => {
            resetKiosk();
          }, 15000);

        } catch (err: any) {
          console.error("Processing failed", err);
          alert("Processing failed: " + (err.message || JSON.stringify(err)));
          if (activeSession) {
            await supabase.from('sessions').update({ status: 'failed' }).eq('id', activeSession.id);
          }
          resetKiosk();
        }
      }
    }, 500); // Wait 500ms for DOM to update with capturedImage
  };

  const resetKiosk = () => {
    setAppState('IDLE');
    setActiveSession(null);
    setCapturedImage(null);
    setGalleryToken('');
    setCountdown(3);
    setActiveTemplate(null);
  };

  return (
    <div className="w-screen h-screen bg-zinc-950 text-white overflow-hidden flex flex-col items-center justify-center font-sans relative">
      
      {/* Background Ornaments */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-indigo-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-emerald-500/10 blur-[150px] rounded-full" />
      </div>

      {appState === 'IDLE' && (
        <div className="text-center z-10 animate-fade-in">
          <div className="w-32 h-32 mx-auto mb-8 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.05)]">
            <Camera className="w-16 h-16 text-zinc-400" />
          </div>
          <h1 className="text-6xl font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
            Photobooth Waringin
          </h1>
          <p className="text-2xl text-zinc-400">Scan QR Code from Web App to start.</p>
        </div>
      )}

      {(appState === 'GET_READY' || appState === 'COUNTDOWN') && (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8 z-10">
           
           <div className="absolute top-8 left-0 right-0 text-center z-20">
             <h2 className="text-3xl font-bold text-white mb-2 shadow-black drop-shadow-md">
               Hi, {activeSession?.client_name || 'Guest'}!
             </h2>
             <p className="text-xl text-zinc-200 shadow-black drop-shadow-md">
               {appState === 'GET_READY' ? 'Get Ready...' : 'Strike a pose!'}
             </p>
           </div>

           <div className="w-full max-w-5xl aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl relative border-4 border-indigo-500/50">
             <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user", width: 1280, height: 960 }}
                className="w-full h-full object-cover transform scale-x-[-1]"
             />
             
             {appState === 'COUNTDOWN' && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                 <span className="text-[200px] font-bold text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-bounce">
                   {countdown}
                 </span>
               </div>
             )}
           </div>
        </div>
      )}

      {appState === 'PROCESSING' && (
        <div className="text-center z-10 flex flex-col items-center">
          <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mb-6" />
          <h2 className="text-4xl font-bold mb-2">Processing Magic...</h2>
          <p className="text-zinc-400 text-xl">Adding effects and saving your memory.</p>
        </div>
      )}

      {/* Hidden Composite Div for html-to-image */}
      {capturedImage && appState === 'PROCESSING' && (
        <div className="absolute top-[-9999px] left-[-9999px]">
          <div ref={compositeRef} className="w-[800px] h-[1200px] bg-zinc-900 relative overflow-hidden shadow-2xl">
            {activeTemplate ? (
              <>
                <div className="absolute inset-0 z-0">
                  <img src={capturedImage} className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img src={activeTemplate} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />
              </>
            ) : (
              // Hardcoded fallback template
              <div className="w-full h-full relative flex flex-col items-center justify-center border-[20px] border-white pb-32 pt-10 px-10 bg-zinc-900">
                 <h2 className="text-4xl font-bold text-white mb-8 z-10 tracking-widest uppercase">My Photobooth</h2>
                 <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border-8 border-white/20 z-10 mb-8 shadow-2xl">
                   <img src={capturedImage} className="w-full h-full object-cover transform scale-x-[-1]" />
                 </div>
                 <div className="absolute bottom-12 text-center text-white z-10 w-full">
                    <p className="text-2xl font-serif italic mb-2">{activeSession?.client_name}</p>
                    <p className="text-sm opacity-50 uppercase tracking-widest">{new Date().toLocaleDateString()}</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}

      {appState === 'FINISHED' && galleryToken && (
        <div className="w-full h-full flex items-center justify-center p-12 z-10 gap-16">
           <div className="flex-1 max-w-xl flex flex-col items-center justify-center text-center">
             <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-8">
               <CheckCircle2 className="w-12 h-12" />
             </div>
             <h2 className="text-6xl font-bold mb-6 text-white">All Done!</h2>
             <p className="text-2xl text-zinc-400 leading-relaxed">
               Scan the QR Code to download and share your photo to your phone instantly.
             </p>
             <button 
               onClick={resetKiosk}
               className="mt-12 px-8 py-4 bg-white text-black text-xl font-bold rounded-2xl hover:bg-zinc-200 transition-colors"
             >
               Finish Session
             </button>
           </div>
           
           <div className="flex-1 max-w-lg bg-white p-12 rounded-[3rem] shadow-[0_0_100px_rgba(255,255,255,0.1)] flex flex-col items-center">
             <QRCodeSVG 
               // Assuming the web app runs on local IP or Vercel
               value={`https://photobooth-xxx.vercel.app/gallery/${galleryToken}`} 
               size={350} 
               level="H"
               includeMargin={false}
             />
             <p className="text-zinc-500 font-medium text-xl mt-8 tracking-widest uppercase text-center">Scan Me</p>
           </div>
        </div>
      )}

    </div>
  );
}

export default App;
