'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Download, Trash2, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';

type GalleryPhoto = {
  id: string;
  final_image_url: string;
  created_at: string;
  views: number;
  session: {
    client_name: string;
    event: {
      id: string;
      name: string;
    } | null;
  } | null;
};

export default function PhotosManagement() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [events, setEvents] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState('all');
  
  const supabase = createClient();

  const fetchPhotos = async () => {
    setLoading(true);
    let query = supabase
      .from('galleries')
      .select(`
        id, final_image_url, created_at, views,
        session:sessions (
          client_name,
          event:events (id, name)
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    
    if (error) {
      console.error(error);
    } else {
      // Filter client-side if needed since deep filtering in Supabase JS can be tricky without RPC
      let filteredData = data as unknown as GalleryPhoto[];
      if (filterEvent !== 'all') {
        filteredData = filteredData.filter(p => p.session?.event?.id === filterEvent);
      }
      setPhotos(filteredData || []);
    }
    setLoading(false);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('id, name');
    if (data) setEvents(data);
  };

  useEffect(() => {
    fetchEvents();
  }, [supabase]);

  useEffect(() => {
    fetchPhotos();
  }, [filterEvent, supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo? This cannot be undone.')) return;
    
    const { error } = await supabase.from('galleries').delete().eq('id', id);
    if (!error) {
      await fetchPhotos();
    } else {
      alert(`Error deleting: ${error.message}`);
    }
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `photobooth-${name.replace(/\\s+/g, '-')}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed', err);
      // Fallback
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Photo Gallery</h1>
          <p className="text-zinc-400">View and manage all captured photobooth sessions.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select 
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 appearance-none min-w-[200px]"
            >
              <option value="all">All Events</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={photo.id}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden group relative"
            >
              <div className="aspect-[3/4] bg-zinc-950 relative w-full border-b border-zinc-800/50">
                 <Image 
                   src={photo.final_image_url} 
                   alt={photo.session?.client_name || 'Photo'} 
                   fill
                   className="object-contain"
                   unoptimized
                 />
                 
                 {/* Hover Overlay */}
                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      onClick={() => handleDownload(photo.final_image_url, photo.session?.client_name || 'guest')}
                      className="p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition-transform hover:scale-110"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(photo.id)}
                      className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-transform hover:scale-110"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                 </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-white truncate">{photo.session?.client_name || 'Unknown Guest'}</h3>
                <p className="text-xs text-zinc-400 mt-1 truncate">{photo.session?.event?.name || 'Unknown Event'}</p>
                <div className="flex justify-between items-center mt-3 text-xs text-zinc-500">
                   <span>{new Date(photo.created_at).toLocaleDateString()}</span>
                   <span>👁 {photo.views} views</span>
                </div>
              </div>
            </motion.div>
          ))}

          {photos.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
              No photos found for this filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
