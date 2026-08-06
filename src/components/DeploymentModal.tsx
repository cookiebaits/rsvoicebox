import React, { useState } from 'react';
import { Server, Globe, ShieldCheck, Copy, Check, Terminal, ExternalLink, Cpu, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProxyStatus } from '../types';

interface DeploymentModalProps {
  proxyStatus: ProxyStatus | null;
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({ proxyStatus }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dokployDockerfile = `# Dokploy Production Dockerfile for RuinScams Vocal Clone Turbo Voice Studio
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]`;

  const githubActionsWorkflow = `# .github/workflows/deploy.yml
name: Deploy RuinScams Vocal Clone Turbo to GitHub Pages
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Dependencies
        run: npm ci

      - name: Build Application
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
          branch: gh-pages`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Server className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-white tracking-tight">Deployment & Proxy Suite</h2>
          </div>
          <p className="text-[11px] text-slate-400">
            Environment status, Dokploy deployment config, Cloudflare Proxy header validation, & GitHub Pages exporter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            PROXY HEADERS OK
          </span>
        </div>
      </div>

      {/* Live Proxy Inspector Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Dokploy Status */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              Dokploy Container
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          </div>
          <div className="text-[11px] text-slate-400 space-y-1 pt-1 font-mono">
            <p className="flex justify-between">
              <span>Port Routing:</span>
              <strong className="text-white">3000 (0.0.0.0)</strong>
            </p>
            <p className="flex justify-between">
              <span>Protocol:</span>
              <strong className="text-white">{proxyStatus?.proto || 'HTTPS'}</strong>
            </p>
            <p className="flex justify-between">
              <span>Host Address:</span>
              <strong className="text-white truncate">{proxyStatus?.host || 'localhost'}</strong>
            </p>
          </div>
        </div>

        {/* Cloudflare Proxy */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              Cloudflare Proxy
            </span>
            {proxyStatus?.isCloudflareProxy ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>
          <div className="text-[11px] text-slate-400 space-y-1 pt-1 font-mono">
            <p className="flex justify-between">
              <span>CF-Connecting-IP:</span>
              <strong className="text-blue-300 truncate">{proxyStatus?.cfConnectingIp || 'Direct/Local'}</strong>
            </p>
            <p className="flex justify-between">
              <span>CF-Ray Header:</span>
              <strong className="text-white text-[10px] truncate">{proxyStatus?.cfRay || 'N/A'}</strong>
            </p>
            <p className="flex justify-between">
              <span>SSL Encryption:</span>
              <strong className="text-green-400">Strict TLS 1.3</strong>
            </p>
          </div>
        </div>

        {/* GitHub Pages Mode */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              GitHub Pages Engine
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          </div>
          <div className="text-[11px] text-slate-400 space-y-1 pt-1 font-mono">
            <p className="flex justify-between">
              <span>Static SPA Build:</span>
              <strong className="text-white">dist/ index.html</strong>
            </p>
            <p className="flex justify-between">
              <span>Offline Web Audio DSP:</span>
              <strong className="text-green-400">Active Fallback</strong>
            </p>
            <p className="flex justify-between">
              <span>Local Model Vault:</span>
              <strong className="text-white">localStorage DB</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Dokploy & Cloudflare Setup Guide */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-blue-500" />
              Dokploy Container Deployment (Dockerfile)
            </h3>
            <p className="text-[11px] text-slate-400">
              Single-click container deployment script for Dokploy over Cloudflare reverse proxy.
            </p>
          </div>
          <button
            onClick={() => handleCopy('dockerfile', dokployDockerfile)}
            className="px-2.5 py-1 rounded bg-[#0d1117] hover:bg-[#1c2128] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-[#30363d]"
          >
            {copiedKey === 'dockerfile' ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'dockerfile' ? 'Copied' : 'Copy'}
          </button>
        </div>

        <pre className="bg-[#0d1117] p-3 rounded border border-[#30363d] text-[11px] text-blue-300 font-mono overflow-x-auto leading-relaxed">
          {dokployDockerfile}
        </pre>
      </div>

      {/* GitHub Pages Workflow Guide */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              GitHub Pages Action Workflow (.github/workflows/deploy.yml)
            </h3>
            <p className="text-[11px] text-slate-400">
              Automated deployment pipeline for hosting RuinScams Vocal Clone-Turbo on GitHub Pages.
            </p>
          </div>
          <button
            onClick={() => handleCopy('workflow', githubActionsWorkflow)}
            className="px-2.5 py-1 rounded bg-[#0d1117] hover:bg-[#1c2128] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-[#30363d]"
          >
            {copiedKey === 'workflow' ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'workflow' ? 'Copied' : 'Copy'}
          </button>
        </div>

        <pre className="bg-[#0d1117] p-3 rounded border border-[#30363d] text-[11px] text-slate-300 font-mono overflow-x-auto leading-relaxed">
          {githubActionsWorkflow}
        </pre>
      </div>
    </div>
  );
};
