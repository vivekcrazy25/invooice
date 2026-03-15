import React, { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo / branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white font-black text-xl">AP</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Error banner */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300
                           bg-gray-50 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl
                             focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-300
                             bg-gray-50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white
                         py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors
                         shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <LogIn size={15}/>
              )}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact your administrator if you don't have access.
        </p>
      </div>
    </div>
  );
}
