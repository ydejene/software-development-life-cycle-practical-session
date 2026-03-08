'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/services/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'member',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.register(formData);
      router.push('/login?message=Registration successful! Please sign in.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'member', title: 'Member', desc: 'Join the gym & track progress' },
    { id: 'staff',  title: 'Staff',  desc: 'Manage members & classes' },
    { id: 'owner',  title: 'Owner',  desc: 'Full gym administration' },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-6 selection:bg-blue-500/30">
      <div className="w-full max-w-lg">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl overflow-hidden">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
              <span className="text-2xl font-black italic">FS</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
            <p className="text-slate-400 mt-2">Join the FitSync community today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-shake">
                {error}
              </div>
            )}

            


