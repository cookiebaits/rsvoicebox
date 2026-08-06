import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VoiceStudio } from './components/VoiceStudio';
import { ClipLibrary } from './components/ClipLibrary';
import { DeploymentModal } from './components/DeploymentModal';
import { AuthModal } from './components/AuthModal';
import { SystemLogsModal } from './components/SystemLogsModal';
import { VoiceModel, GeneratedClip, ProxyStatus, UserSession, ActiveSynthesisJob } from './types';
import {
  fetchVoiceModels,
  fetchClipHistory,
  fetchProxyStatus,
  getActiveSession,
} from './services/api';
import { logSystemEvent } from './services/logger';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'clips' | 'deployment'>('studio');
  const [session, setSession] = useState<UserSession | null>(null);
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [clips, setClips] = useState<GeneratedClip[]>([]);
  const [proxyStatus, setProxyStatus] = useState<ProxyStatus | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<ActiveSynthesisJob | null>(null);
  const [autoPlayClipId, setAutoPlayClipId] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    // Session
    setSession(getActiveSession());

    // Voice models
    fetchVoiceModels().then(setVoiceModels);

    // Clips
    fetchClipHistory().then(setClips);

    // Proxy Status
    fetchProxyStatus().then(setProxyStatus);
  }, []);

  // Periodic auto-prune timer for items older than 5 minutes
  useEffect(() => {
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      const FIVE_MINS = 5 * 60 * 1000;

      setClips((prev) =>
        prev.filter((c) => {
          if (!c.createdAt) return true;
          return now - new Date(c.createdAt).getTime() <= FIVE_MINS;
        })
      );

      setVoiceModels((prev) =>
        prev.filter((m) => {
          if (!m.isCloned && m.category !== 'custom') return true;
          if (!m.createdAt) return true;
          return now - new Date(m.createdAt).getTime() <= FIVE_MINS;
        })
      );
    }, 5000);

    return () => clearInterval(pruneInterval);
  }, []);

  const refreshClips = async () => {
    const clipList = await fetchClipHistory();
    const now = Date.now();
    const FIVE_MINS = 5 * 60 * 1000;
    setClips(clipList.filter((c) => !c.createdAt || now - new Date(c.createdAt).getTime() <= FIVE_MINS));
  };

  const refreshVoiceModels = async () => {
    const modelList = await fetchVoiceModels();
    setVoiceModels(modelList);
  };

  const handleStartSynthesis = (job: ActiveSynthesisJob) => {
    setActiveJob(job);
    setActiveTab('clips');
    logSystemEvent('info', 'VoiceStudio', `Started speech synthesis job: "${job.title}"`, `Voice Model: ${job.voiceModelName}`);

    // Progress ticker
    let p = 5;
    const isGemini = job.statusText.includes('Gemini');
    
    const interval = setInterval(() => {
      // Gemini takes 15-40 seconds, so slow down the progress bar significantly.
      const increment = isGemini ? (Math.random() * 2 + 1) : (Math.floor(Math.random() * 10) + 5);
      p += increment;
      if (p >= 98) {
        p = 98;
        clearInterval(interval);
      }
      setActiveJob((prev) =>
        prev
          ? {
              ...prev,
              progress: Math.floor(p),
              statusText:
                p < 40
                  ? 'Analyzing speech phonemes & vocal resonance...'
                  : p < 75
                  ? 'Synthesizing neural vocal waveform...'
                  : 'Finalizing 24kHz PCM audio file...',
            }
          : null
      );
    }, isGemini ? 600 : 250);

    // Watchdog safety timeout (max 120 seconds)
    setTimeout(() => {
      clearInterval(interval);
      setActiveJob((prev) => {
        if (prev && prev.id === job.id) {
          logSystemEvent('error', 'VoiceStudio', `Speech synthesis timed out after 120 seconds.`);
          return null; // clear it if it gets completely stuck
        }
        return prev;
      });
    }, 120000);
  };

  const handleClipGenerated = (newClip: GeneratedClip) => {
    setClips((prev) => [newClip, ...prev]);
    setActiveJob(null);
    setAutoPlayClipId(newClip.id);
    refreshClips();
    logSystemEvent('success', 'Synthesis-Engine', `Audio clip generated successfully`, `Duration: ${newClip.durationSeconds}s, Model: ${newClip.voiceModelName}`);
  };

  const handleSynthesisError = (errorMsg: string) => {
    setActiveJob(null);
    logSystemEvent('error', 'VoiceStudio', `Speech synthesis error: ${errorMsg}`);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-[#d1d5db] font-sans antialiased selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onOpenAuth={() => setIsAuthOpen(true)}
        proxyStatus={proxyStatus}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-4 md:py-5">
        <div className={activeTab === 'studio' ? 'block' : 'hidden'}>
          <VoiceStudio
            voiceModels={voiceModels}
            onStartSynthesis={handleStartSynthesis}
            onClipGenerated={handleClipGenerated}
            onSynthesisError={handleSynthesisError}
            onVoiceModelsUpdated={refreshVoiceModels}
          />
        </div>

        <div className={activeTab === 'clips' ? 'block' : 'hidden'}>
          <ClipLibrary
            clips={clips}
            activeJob={activeJob}
            autoPlayClipId={autoPlayClipId}
            onAutoPlayed={() => setAutoPlayClipId(null)}
            onClipsUpdated={refreshClips}
          />
        </div>

        {activeTab === 'deployment' && (
          <DeploymentModal proxyStatus={proxyStatus} />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        session={session}
        setSession={setSession}
      />

      {/* System Status & Diagnostics Log Modal */}
      <SystemLogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />

      {/* High Density Studio Footer */}
      <footer className="border-t border-[#30363d] bg-[#0d1117] h-8 flex items-center justify-between px-4 text-[10px] text-slate-500 font-mono">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLogsOpen(true)}
              className="text-slate-300 font-bold tracking-tight hover:text-blue-400 flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Click to view real-time System Status & Diagnostic Logs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              SYSTEM STATUS: OPTIMAL (LOGS)
            </button>
            <span className="hidden sm:inline">VOCALFLOW Turbo v2.4</span>
          </div>
          <div className="flex items-center gap-4">
            <span>DOKPLOY: READY</span>
            <span>CLOUDFLARE: TUNNEL</span>
            <span className="hidden md:inline">SESSION_TOKEN: AES-256-GCM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
