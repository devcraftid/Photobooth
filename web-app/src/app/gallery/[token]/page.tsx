'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Download, Loader2, Share2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import * as htmlToImage from 'html-to-image';
import { useRef } from 'react';

type Gallery = {
  final_image_url: string;
  created_at: string;
  sessions: { event_id: string } | null;
};

type Template = {
  id: string;
  name: string;
  background_url: string;
};

export default function GalleryView() {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();
  const compositeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from('galleries')
        .select(`
          final_image_url, 
          created_at,
          sessions ( event_id )
        `)
        .eq('token', token)
        .single();
      
      if (error || !data) {
        setError('Photo not found or invalid link.');
      } else {
        setGallery(data as any);
        
        // Fetch templates
        if ((data as any).sessions?.event_id) {
          const { data: templateData } = await supabase
            .from('templates')
            .select('id, name, background_url')
            .eq('event_id', (data as any).sessions.event_id)
            .order('created_at', { ascending: false });
            
          if (templateData && templateData.length > 0) {
            setTemplates(templateData);
            setSelectedTemplate(templateData[0]); // default
          }
        }

        // Increment views
        try {
          await supabase.rpc('increment_gallery_views', { p_token: token });
        } catch (e) {}
      }
      setLoading(false);
    };

    fetchGallery();
  }, [token, supabase]);

  const handleDownload = async () => {
    if (!gallery || !compositeRef.current) return;
    setDownloading(true);
    try {
      // Temporarily hide the "Select Template" UI text if we had any inside it,
      // but since it's just the image, we can just snapshot it.
      const dataUrl = await htmlToImage.toPng(compositeRef.current, {
        pixelRatio: 2, // High quality
        cacheBust: true,
      });
      
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `photobooth-${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to process image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Photobooth Memory',
          text: 'Check out my awesome photo!',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Link copied to clipboard!');
      } catch (err) {
        prompt('Please copy this link manually:', window.location.href);
      }
      document.body.removeChild(textArea);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>;
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center max-w-sm w-full">
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Your Memory</h1>
          <p className="text-zinc-400 mt-2">Captured on {new Date(gallery.created_at).toLocaleDateString()}</p>
        </div>

        <div className="bg-zinc-900/50 p-2 rounded-3xl border border-zinc-800 shadow-2xl relative group overflow-hidden">
           {/* Composite wrapper for html-to-image */}
           <div 
             ref={compositeRef} 
             className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-zinc-950 mx-auto"
             style={{ width: '100%', maxWidth: '400px' }}
           >
             {/* Raw Image */}
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img 
               src={gallery.final_image_url} 
               alt="Raw Photo" 
               className="absolute inset-0 w-full h-full object-cover"
               crossOrigin="anonymous"
             />
             
             {/* Selected Template Overlay */}
             {selectedTemplate && (
               /* eslint-disable-next-line @next/next/no-img-element */
               <img 
                 src={selectedTemplate.background_url} 
                 alt="Template" 
                 className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none"
                 crossOrigin="anonymous"
               />
             )}
           </div>
        </div>

        {/* Template Selector */}
        {templates.length > 0 && (
          <div className="mt-8">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Pilih Frame Kerenmu:
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-hide">
              {/* Option for No Frame */}
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`flex-shrink-0 w-24 h-24 rounded-2xl border-2 flex items-center justify-center text-sm font-medium transition-all snap-center ${
                  selectedTemplate === null 
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400' 
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                No Frame
              </button>
              
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`flex-shrink-0 w-24 aspect-[2/3] rounded-2xl border-2 relative overflow-hidden transition-all snap-center ${
                    selectedTemplate?.id === template.id 
                      ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] scale-105' 
                      : 'border-zinc-800 opacity-70 hover:opacity-100 hover:border-zinc-600'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={template.background_url} alt={template.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />} 
            {downloading ? 'Processing...' : 'Download'}
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 rounded-2xl transition-all"
          >
            <Share2 className="w-5 h-5" /> Share
          </button>
        </div>
      </motion.div>
    </div>
  );
}
