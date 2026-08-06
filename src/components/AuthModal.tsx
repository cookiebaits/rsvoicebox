import React, { useState } from 'react';
import { X, ShieldCheck, Lock, User, Key, LogOut, CheckCircle, Server, Globe } from 'lucide-react';
import { UserSession } from '../types';
import { loginUser, logoutUser } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession | null;
  setSession: (session: UserSession | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  session,
  setSession,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username or operator ID.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const newSession = await loginUser(username.trim(), password);
      setSession(newSession);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    setSession(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-full max-w-md p-5 shadow-2xl text-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-white rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4 border-b border-[#30363d] pb-3">
          <div className="w-8 h-8 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Session Authentication</h3>
            <p className="text-[11px] text-slate-400">Secure user sessions for Dokploy, Cloudflare Proxy, & Local Studio</p>
          </div>
        </div>

        {session ? (
          /* Logged In State */
          <div className="space-y-3">
            <div className="bg-[#0d1117] border border-[#30363d] rounded p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Active Operator</span>
                <span className="px-1.5 py-0.5 rounded bg-green-900/50 text-green-400 text-[10px] font-mono border border-green-800">
                  AUTHENTICATED
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  {session.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">{session.username}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">{session.email}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#30363d] space-y-1 font-mono text-[10px]">
                <div className="flex justify-between text-slate-400">
                  <span>Session Token</span>
                  <span className="text-blue-400">{session.token.substring(0, 16)}...</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Session Role</span>
                  <span className="text-slate-200 uppercase">{session.role}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-[11px] text-slate-400 flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>Session encrypted and protected under Cloudflare Proxy & Dokploy CORS security policies.</span>
            </div>

            <button
              onClick={handleLogout}
              className="w-full h-[36px] rounded bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Session
            </button>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-3">
            {error && (
              <div className="p-2.5 rounded bg-red-900/30 border border-red-800 text-red-300 text-xs font-mono">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Operator ID / Username</label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex Studio Engineer"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Session Key / Password (Optional)</label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-[#0d1117] p-2.5 rounded border border-[#30363d] text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Dokploy & Proxy Session Token</span>
              </div>
              <p>Signing in generates a secure session token compatible with Cloudflare Proxy headers.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[36px] bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE SESSION'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
