'use client';

import { useState } from 'react';
import { Save, User, Lock, CreditCard, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (qrisFile) {
        const { error: uploadError } = await supabase.storage
          .from('photobooth-templates')
          .upload('settings/qris.png', qrisFile, { upsert: true });
          
        if (uploadError) throw uploadError;
      }
      
      alert('Settings saved successfully!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-zinc-400">Manage your account and application preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-1">
          <button className="w-full text-left px-4 py-2.5 rounded-xl bg-zinc-900 text-white font-medium flex items-center gap-3">
            <User className="w-4 h-4" /> Profile
          </button>
          <button className="w-full text-left px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/50 flex items-center gap-3 transition-colors">
            <Lock className="w-4 h-4" /> Security
          </button>
          <button className="w-full text-left px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900/50 flex items-center gap-3 transition-colors">
            <CreditCard className="w-4 h-4" /> Payment Setup
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="md:col-span-3 bg-zinc-900/50 border border-zinc-800 p-6 sm:p-8 rounded-3xl"
        >
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">Profile Information</h2>
              <p className="text-sm text-zinc-400 mb-6">Update your account details here.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Business Name</label>
                <input 
                  type="text" 
                  defaultValue="Photobooth Waringin"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  defaultValue="admin@photobooth.com"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <hr className="border-zinc-800 my-8" />
            
            <div>
              <h2 className="text-xl font-bold mb-1">Manual Payment QR (QRIS)</h2>
              <p className="text-sm text-zinc-400 mb-6">Upload your store or personal QRIS code. Users will scan this when joining the queue.</p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center bg-zinc-950/50">
                <Upload className="w-8 h-8 text-zinc-500 mb-4" />
                <p className="text-zinc-400 text-sm mb-4">Select a QR code image (PNG, JPG)</p>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setQrisFile(e.target.files?.[0] || null)}
                  className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit"
                disabled={loading}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                {loading ? 'Saving...' : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
