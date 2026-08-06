import React from 'react';
import { Mic, Radio, Sliders, Layers, ShieldCheck, User, Server, Globe } from 'lucide-react';
import { UserSession, ProxyStatus } from '../types';

interface NavbarProps {
  activeTab: 'studio' | 'clips' | 'deployment';
  setActiveTab: (tab: 'studio' | 'clips' | 'deployment') => void;
  session: UserSession | null;
  onOpenAuth: () => void;
  proxyStatus: ProxyStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  session,
  onOpenAuth,
  proxyStatus,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#161b22] border-b border-[#30363d] text-[#d1d5db] h-12 flex items-center shrink-0">
      <div className="max-w-7xl w-full mx-auto px-4 flex items-center justify-between gap-4">
        {/* Brand & Logo - Clickable link for Deployment & Proxy */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
            VF
          </div>
          <button
            onClick={() => setActiveTab('deployment')}
            className="flex items-center gap-2 group text-left cursor-pointer transition-all"
            title="Open Deployment & Proxy Settings"
          >
            <h1 className="text-sm font-semibold tracking-tight text-white group-hover:text-blue-400 transition-colors">
              VOCALFLOW
            </h1>
            <span className="text-blue-500 font-mono text-[10px] px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded uppercase font-semibold group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-colors flex items-center gap-1">
              RuinScams Vocal Clone-Turbo v2.4
            </span>
          </button>
        </div>

        {/* Center Tabs Navigation */}
        <nav className="flex items-center gap-1 bg-[#0d1117] p-1 rounded border border-[#30363d]">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === 'studio'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#1c2128]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('clips')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              activeTab === 'clips'
                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-[#1c2128]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Clips</span>
          </button>
        </nav>

        {/* Right Status & Auth */}
        <div className="flex items-center gap-4">
          {/* Proxy Status Pill */}
          <button
            onClick={() => setActiveTab('deployment')}
            className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
            title="Inspect Dokploy, Cloudflare Proxy, & GitHub Pages status"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>
              {proxyStatus?.isCloudflareProxy
                ? 'Proxy: Cloudflare Tunnel'
                : proxyStatus?.isGitHubPagesMode
                ? 'Proxy: GitHub Pages SPA'
                : 'Proxy: Dokploy Container'}
            </span>
          </button>

          {/* User Auth Button */}
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 text-[11px] border-l border-[#30363d] pl-3 py-0.5 hover:opacity-90 transition-opacity"
          >
            <span className="bg-[#1c2128] border border-[#30363d] px-2 py-0.5 rounded text-slate-300 font-mono text-[11px]">
              {session ? session.username : 'admin@local.dokploy'}
            </span>
            <div className="w-6 h-6 rounded-full bg-[#30363d] flex items-center justify-center text-xs text-white font-bold">
              {session ? session.username.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5 text-blue-400" />}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
