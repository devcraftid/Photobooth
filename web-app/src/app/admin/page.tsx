'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Calendar as CalendarIcon, Image as ImageIcon, Download, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalSessions: 0,
    totalPhotos: 0,
    totalDownloads: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      // In a real app, this should be an RPC or optimized query.
      // For now we will fetch counts.
      
      const [eventsData, sessionsData, photosData, galleriesData] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('sessions').select('id', { count: 'exact', head: true }),
        supabase.from('photos').select('id', { count: 'exact', head: true }),
        supabase.from('galleries').select('views', { count: 'exact' }),
      ]);

      const totalViews = galleriesData.data?.reduce((acc, curr) => acc + (curr.views || 0), 0) || 0;

      setStats({
        totalEvents: eventsData.count || 0,
        totalSessions: sessionsData.count || 0,
        totalPhotos: photosData.count || 0,
        totalDownloads: totalViews,
      });
      
      setLoading(false);
    };

    fetchStats();
  }, [supabase]);

  const statCards = [
    { title: 'Total Events', value: stats.totalEvents, icon: CalendarIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Total Sessions', value: stats.totalSessions, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Total Photos', value: stats.totalPhotos, icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { title: 'Total Downloads', value: stats.totalDownloads, icon: Download, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-zinc-400 mt-1">Welcome back. Here is what's happening with your photobooths today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 font-medium text-sm">{stat.title}</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {loading ? '-' : stat.value}
                  </p>
                </div>
                <div className={`p-4 rounded-2xl ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl h-96 flex flex-col"
        >
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Recent Activity</h3>
              <Activity className="text-zinc-500 w-5 h-5" />
           </div>
           <div className="flex-1 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl">
              <p className="text-zinc-500">No recent activity to show.</p>
           </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl h-96 flex flex-col"
        >
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Booth Status</h3>
           </div>
           <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/50">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-medium">Booth 1 (Jakarta)</span>
                 </div>
                 <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg">Online</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/50">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-zinc-600" />
                    <span className="font-medium text-zinc-400">Booth 2 (Bali)</span>
                 </div>
                 <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-lg">Offline</span>
              </div>
           </div>
        </motion.div>
      </div>
    </div>
  );
}
