import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('hsis_token', data.token);
        navigate('/dashboard');
      } else {
        setError(data.msg || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection to backend failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background Micro-animations & Glows */}
      <div className="absolute top-[20%] left-[15%] w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[20%] right-[15%] w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] animate-pulse delay-700"></div>

      {/* Main Login Card */}
      <div className="w-full max-w-md p-8 rounded-2xl relative z-10 glass-panel shadow-2xl shadow-black/50 border border-slate-700/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shadow-inner mb-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors"></div>
            <ShieldCheck className="w-8 h-8 text-blue-400 z-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight text-center">
            SYSINTERNAL
          </h1>
          <p className="text-slate-400 mt-2 text-sm text-center">
            System Dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
              <Activity className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
              Username
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-900/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-600 transition-all sm:text-sm"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-900/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-600 transition-all sm:text-sm"
                placeholder="••••••••••••"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-slate-700 rounded bg-slate-900 cursor-pointer"
              />
              <label htmlFor="remember_me" className="ml-2 block text-sm text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                Remember terminal
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-900 transition-all shadow-lg overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex items-center gap-2">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Authenticate
                </>
              )}
            </span>
          </button>
        </form>
        
        <div className="mt-8 border-t border-slate-700/50 pt-6 flex items-center justify-center space-x-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4" />
          <span>Secured by End-to-End Encryption</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
