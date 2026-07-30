import React, { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SEO from '@/components/SEO';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
// NOTE: @simplewebauthn/browser is imported dynamically below because it uses
// browser-only APIs (window, navigator) that crash Next.js SSR if imported statically.

const PASSKEY_STORAGE_KEY = 'hh-admin-passkey-registered';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const cardRef = useRef<HTMLDivElement>(null);

  // Passkey state
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);
  const [loginSucceeded, setLoginSucceeded] = useState(false); // show save-passkey prompt
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeyStatus, setPasskeyStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [passkeyError, setPasskeyError] = useState('');

  // Cached options & browser module ref to preserve user activation gesture
  const [registerOptionsCache, setRegisterOptionsCache] = useState<any>(null);
  const [authOptionsCache, setAuthOptionsCache] = useState<any>(null);
  const webAuthnRef = useRef<typeof import('@simplewebauthn/browser') | null>(null);

  // Check browser support and pre-load module + check passkeys in DB
  useEffect(() => {
    import('@simplewebauthn/browser').then(async (mod) => {
      webAuthnRef.current = mod;
      const supported = mod.browserSupportsWebAuthn();
      setPasskeySupported(supported);
      if (!supported) return;

      try {
        const res = await fetch('/api/auth/passkey/has-passkeys');
        if (res.ok) {
          const data = await res.json();
          setPasskeyRegistered(data.hasPasskeys === true);
        } else {
          setPasskeyRegistered(localStorage.getItem(PASSKEY_STORAGE_KEY) === 'true');
        }
      } catch {
        setPasskeyRegistered(localStorage.getItem(PASSKEY_STORAGE_KEY) === 'true');
      }

      // Pre-fetch authentication options so passkey login button is instant
      try {
        const authRes = await fetch('/api/auth/passkey/authenticate-options', { method: 'POST' });
        if (authRes.ok) {
          const authData = await authRes.json();
          setAuthOptionsCache(authData);
        }
      } catch {}
    }).catch(() => {
      setPasskeySupported(false);
    });
  }, []);

  // Pre-fetch registration options as soon as login succeeds (before user clicks "Save as Passkey")
  useEffect(() => {
    if (loginSucceeded && passkeySupported) {
      fetch('/api/auth/passkey/register-options', { method: 'POST' })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error) {
            setRegisterOptionsCache(data);
          }
        })
        .catch(() => {});
    }
  }, [loginSucceeded, passkeySupported]);

  // Subtle 3D card tilt on mouse move
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

  // ─── Password login ──────────────────────────────────────────────────────────
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
        // Login succeeded — show save-passkey prompt if supported and not yet registered
        if (passkeySupported && !passkeyRegistered) {
          setLoginSucceeded(true);
          // Pre-fetch registration options immediately upon login success
          fetch('/api/auth/passkey/register-options', { method: 'POST' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data && !data.error) setRegisterOptionsCache(data);
            })
            .catch(() => {});
        } else {
          const callbackUrl = (router.query.callbackUrl as string) || '/admin';
          window.location.href = callbackUrl;
        }
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Save passkey after password login ──────────────────────────────────────
  const handleSavePasskey = async () => {
    setPasskeyStatus('saving');
    setPasskeyError('');
    try {
      // 1. Use pre-fetched registration options or fetch fallback
      let optionsJSON = registerOptionsCache;
      if (!optionsJSON) {
        const optionsRes = await fetch('/api/auth/passkey/register-options', {
          method: 'POST',
        });
        if (!optionsRes.ok) {
          const err = await optionsRes.json();
          throw new Error(err.error || 'Failed to get registration options');
        }
        optionsJSON = await optionsRes.json();
      }

      // 2. Trigger browser passkey prompt (uses pre-loaded module to preserve user activation gesture)
      const webAuthn = webAuthnRef.current || (await import('@simplewebauthn/browser'));
      const registrationResponse = await webAuthn.startRegistration({ optionsJSON });

      // 3. Send credential to server for verification and storage
      const verifyRes = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationResponse),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Failed to save passkey');
      }

      // 4. Mark in localStorage so we show the "Sign in with Passkey" button next time
      localStorage.setItem(PASSKEY_STORAGE_KEY, 'true');
      setPasskeyStatus('saved');

      // 5. Redirect to admin after short delay
      setTimeout(() => {
        const callbackUrl = (router.query.callbackUrl as string) || '/admin';
        window.location.href = callbackUrl;
      }, 1500);
    } catch (err: any) {
      console.error('[save-passkey] Full Error object:', err);
      const errMsg = err?.message ? `${err.name || 'Error'}: ${err.message}` : (err?.name || 'Failed to save passkey');
      setPasskeyStatus('error');
      setPasskeyError(errMsg);
    }
  };

  const handleSkipPasskey = () => {
    const callbackUrl = (router.query.callbackUrl as string) || '/admin';
    window.location.href = callbackUrl;
  };

  // ─── Passkey login (skip password entirely) ──────────────────────────────────
  const handlePasskeyLogin = async () => {
    setIsPasskeyLoading(true);
    setError('');
    try {
      // 1. Use pre-fetched authentication options or fetch fallback
      let optionsJSON = authOptionsCache;
      if (!optionsJSON) {
        const optionsRes = await fetch('/api/auth/passkey/authenticate-options', {
          method: 'POST',
        });
        if (!optionsRes.ok) {
          const err = await optionsRes.json();
          throw new Error(err.error || 'No passkeys found. Please log in with password first.');
        }
        optionsJSON = await optionsRes.json();
      }

      // 2. Trigger browser passkey prompt
      const webAuthn = webAuthnRef.current || (await import('@simplewebauthn/browser'));
      const authResponse = await webAuthn.startAuthentication({ optionsJSON });

      // 3. Verify on server
      const verifyRes = await fetch('/api/auth/passkey/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResponse),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.error || 'Passkey authentication failed');
      }
      const { passkeyToken } = await verifyRes.json();

      // 4. Exchange token for a real NextAuth session
      const result = await signIn('passkey', {
        redirect: false,
        passkeyToken,
      });

      if (result?.error) {
        throw new Error('Session creation failed. Please log in with password.');
      }

      window.location.href = (router.query.callbackUrl as string) || '/admin';
    } catch (err: any) {
      console.error('[passkey-login]', err);
      if (err.name === 'NotAllowedError') {
        setError('Biometric prompt was dismissed or canceled. Please try again.');
      } else {
        setError(err.message || 'Passkey login failed. Please use your password.');
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
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
          {/* ── Post-login: Save Passkey Prompt ── */}
          {loginSucceeded ? (
            <div className="text-center space-y-6">
              <div className="flex flex-col items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
                </div>
                <h1 className="font-headline-md text-xl font-bold text-on-surface">Signed in!</h1>
                <p className="text-on-surface-variant text-sm">Login successful. Set up faster access for next time?</p>
              </div>

              <div className="bg-[#1a1a1a] border border-white/10 rounded-lg p-5 text-left">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-primary-container text-xl">fingerprint</span>
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface text-sm mb-1">Save this device as a Passkey</p>
                    <p className="text-on-surface-variant text-xs leading-relaxed">
                      Next time, sign in instantly with Face ID, fingerprint, or Windows Hello — no password needed.
                    </p>
                  </div>
                </div>

                {passkeyStatus === 'saved' && (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-3 bg-green-500/10 border border-green-500/20 rounded p-2">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Passkey saved! Redirecting…
                  </div>
                )}
                {passkeyStatus === 'error' && (
                  <div className="flex items-start gap-2 text-red-400 text-sm mb-3 bg-red-500/10 border border-red-500/20 rounded p-3">
                    <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                    <span>{passkeyError || 'Could not save passkey. You can try again from the admin dashboard.'}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    id="btn-save-passkey"
                    onClick={handleSavePasskey}
                    disabled={passkeyStatus === 'saving' || passkeyStatus === 'saved'}
                    className="flex-1 bg-primary-container text-[#0A0A0A] font-bold text-sm py-3 rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passkeyStatus === 'saving' ? (
                      <>
                        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">fingerprint</span>
                        Save as Passkey
                      </>
                    )}
                  </button>
                  <button
                    id="btn-skip-passkey"
                    onClick={handleSkipPasskey}
                    disabled={passkeyStatus === 'saving' || passkeyStatus === 'saved'}
                    className="px-4 py-3 border border-white/10 text-on-surface-variant text-sm rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1 disabled:opacity-40"
                  >
                    Skip
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
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

                <div className="flex gap-3">
                  {/* Primary: password sign-in */}
                  <button
                    type="submit"
                    id="btn-password-login"
                    disabled={isLoading}
                    className="flex-1 bg-primary-container text-[#0A0A0A] font-headline-sm text-headline-sm font-bold py-4 active:scale-[0.98] hover:brightness-110 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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

                  {/* Passkey quick-login — always shown when browser supports WebAuthn */}
                  {passkeySupported && (
                    <button
                      type="button"
                      id="btn-passkey-login"
                      onClick={handlePasskeyLogin}
                      disabled={isPasskeyLoading}
                      title="Sign in with passkey (Face ID / Fingerprint / Windows Hello)"
                      className="group relative w-[58px] shrink-0 flex items-center justify-center bg-[#1a1a1a] border border-primary-container/40 hover:border-primary-container hover:bg-primary-container/10 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      {isPasskeyLoading ? (
                        <svg className="animate-spin w-5 h-5 text-primary-container" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <span
                          className="material-symbols-outlined text-2xl text-primary-container group-hover:scale-110 transition-transform duration-150"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          fingerprint
                        </span>
                      )}
                      {/* Tooltip */}
                      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#2a2a2a] border border-white/10 text-on-surface text-xs px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg">
                        Sign in with Passkey
                      </span>
                    </button>
                  )}
                </div>


                {/* Admin only notice */}
                <div className="pt-6 text-center border-t border-white/5">
                  <p className="font-body-md text-body-md text-on-surface-variant text-xs">
                    Restricted area. Only authorized personnel may access the admin portal.
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
