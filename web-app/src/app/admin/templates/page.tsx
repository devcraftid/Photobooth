'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Upload, Trash2, Image as ImageIcon, Edit2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

type Template = {
  id: string;
  name: string;
  background_url: string;
  event_id: string;
};

export default function TemplatesManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [events, setEvents] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');

  const supabase = createClient();

  const fetchData = async () => {
    const { data: tData } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
    const { data: eData } = await supabase.from('events').select('id, name');
    
    if (tData) setTemplates(tData);
    if (eData) {
      setEvents(eData);
      if (eData.length > 0) setSelectedEvent(eData[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !templateName || !selectedEvent) return;
    
    setUploading(true);
    
    // 1. Upload to Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${selectedEvent}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('photobooth-templates')
      .upload(filePath, file);
      
    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }
    
    // 2. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from('photobooth-templates')
      .getPublicUrl(filePath);
      
    // 3. Save to DB
    const { error: dbError } = await supabase.from('templates').insert({
      name: templateName,
      background_url: publicUrlData.publicUrl,
      event_id: selectedEvent
    });

    if (dbError) {
      alert(`Database error: ${dbError.message}`);
    } else {
      setTemplateName('');
      setFile(null);
      await fetchData();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    // In a real app, you should also delete the file from storage
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (!error) {
      await fetchData();
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingTemplateName.trim()) return;
    
    const { error } = await supabase
      .from('templates')
      .update({ name: editingTemplateName })
      .eq('id', id);
      
    if (!error) {
      setEditingTemplateId(null);
      await fetchData();
    } else {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Templates</h1>
        <p className="text-zinc-400">Upload transparent PNG overlays for your photobooth.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleUpload} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-xl font-bold mb-4">Upload New Template</h2>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Target Event</label>
              <select 
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white outline-none focus:border-indigo-500"
              >
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Template Name</label>
              <input 
                type="text" 
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Wedding Frame 1"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white outline-none focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Image File (PNG)</label>
              <input 
                type="file" 
                accept="image/png"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-white outline-none focus:border-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 cursor-pointer"
              />
            </div>
            
            <button 
              type="submit"
              disabled={uploading || events.length === 0}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
            >
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {uploading ? 'Uploading...' : 'Upload Template'}
            </button>
            {events.length === 0 && <p className="text-xs text-amber-500 text-center mt-2">Create an event first!</p>}
          </form>
        </div>

        {/* Template Grid */}
        <div className="lg:col-span-2">
          {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map(template => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={template.id} 
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col group relative overflow-hidden"
                >
                  <div className="aspect-[4/3] w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-zinc-950 rounded-xl flex items-center justify-center mb-4 relative overflow-hidden border border-zinc-800/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={template.background_url} alt={template.name} className="w-full h-full object-contain" />
                  </div>
                  
                  {editingTemplateId === template.id ? (
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={editingTemplateName}
                        onChange={(e) => setEditingTemplateName(e.target.value)}
                        className="px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-sm text-white w-full outline-none"
                        autoFocus
                      />
                      <button onClick={() => handleUpdate(template.id)} className="text-emerald-500 hover:text-emerald-400 p-1"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingTemplateId(null)} className="text-zinc-500 hover:text-zinc-400 p-1"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <h3 className="font-bold text-lg">{template.name}</h3>
                  )}
                  <p className="text-sm text-zinc-500 truncate">Event ID: {template.event_id}</p>
                  
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingTemplateId(template.id); setEditingTemplateName(template.name); }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(template.id)}
                      className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
              
              {templates.length === 0 && (
                <div className="col-span-full h-64 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                  <p>No templates found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
