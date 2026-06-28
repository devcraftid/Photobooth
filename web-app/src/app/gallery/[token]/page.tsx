'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Download, Loader2, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

type Gallery = {
  final_image_url: string;
  created_at: string;
};

export default function GalleryView() {
  const { token } = useParams<{ token: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const fetchGallery = async () => {
      const { data, error } = await supabase
        .from('galleries')
        .select('final_image_url, created_at')
        .eq('token', token)
        .single();
      
      if (error || !data) {
        setError('Photo not found or invalid link.');
      } else {
        setGallery(data);
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
    if (!gallery) return;
    try {
      const response = await fetch(gallery.final_image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photobooth-${new Date().getTime()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed', err);
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
           {/* The actual image */}
           <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-zinc-950">
             <Image 
               src={gallery.final_image_url} 
               alt="Photobooth Memory" 
               fill
               className="object-contain"
               unoptimized
             />
           </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <button 
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
          >
            <Download className="w-5 h-5" /> Download
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
