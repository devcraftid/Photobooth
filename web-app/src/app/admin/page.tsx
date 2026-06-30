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

    </div>
  );
}
