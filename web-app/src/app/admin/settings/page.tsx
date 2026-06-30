'use client';

import { useState } from 'react';
import { Save, User, Lock, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement actual save logic
    setTimeout(() => {
      setLoading(false);
      alert('Settings saved successfully!');
    }, 1000);
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
              <h2 className="text-xl font-bold mb-1">Payment Integration</h2>
              <p className="text-sm text-zinc-400 mb-6">Configure your payment gateway (e.g. Midtrans, Xendit).</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Gateway Name</label>
                <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition-colors">
                  <option value="none">None (Free Mode)</option>
                  <option value="midtrans">Midtrans</option>
                  <option value="xendit">Xendit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Server Key / API Key</label>
                <input 
                  type="password" 
                  placeholder="Enter your API key here"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white outline-none focus:border-indigo-500 transition-colors"
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
