import React, { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '@/components/SEO';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const cardRef = useRef<HTMLDivElement>(null);

  // Subtle 3D card tilt on mouse move (from Stitch design)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768 || !cardRef.current) return;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const moveX = (e.clientX - centerX) / 80;
      const moveY = (e.clientY - centerY) / 80;
      cardRef.current.style.transform = `translate(${moveX}px, ${moveY}px) rotateX(${-moveY / 4}deg) rotateY(${moveX / 4}deg)`;
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });
      if (result?.error) {
        setError('Invalid email or password. Please try again.');
      } else {
        window.location.href = '/admin';
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Admin Login | The Humours Hub"
        noIndex={true}
      />

      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')" }}
      />

      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 107, 26, 0.08) 0%, transparent 70%)',
        }}
      />

      <Navbar />

      <main className="relative z-10 min-h-screen pt-32 pb-20 flex items-center justify-center px-5 md:px-16">
        <div
          ref={cardRef}
          className="w-full max-w-md bg-[#141414] border border-white/5 p-8 md:p-10 shadow-2xl relative overflow-hidden group transition-transform duration-75"
          style={{ willChange: 'transform' }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
              Admin Portal
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Sign in to manage shows, tickets, and bookings
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 font-body-sm text-body-sm rounded flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@humours.com"
                className="w-full bg-[#1a1a1a] border border-white/10 text-on-surface p-4 font-body-md text-body-md focus:border-primary-container focus:outline-none transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1a1a] border border-white/10 text-on-surface p-4 font-body-md text-body-md pr-12 focus:border-primary-container focus:outline-none transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors duration-200"
                >
                  <span className="material-symbols-outlined text-lg">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-container text-[#0A0A0A] font-headline-sm text-headline-sm font-bold py-4 active:scale-[0.98] hover:brightness-110 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </>
              )}
            </button>

            {/* Admin only notice */}
            <div className="pt-6 text-center border-t border-white/5">
              <p className="font-body-md text-body-md text-on-surface-variant text-xs">
                Restricted area. Only authorized personnel may access the admin portal.
              </p>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </>
  );
}
