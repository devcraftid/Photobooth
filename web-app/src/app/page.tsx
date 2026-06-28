import { redirect } from 'next/navigation';

export default function Home() {
  // Sementara kita arahkan halaman utama (/) langsung ke halaman Admin Login
  redirect('/admin/login');
}
