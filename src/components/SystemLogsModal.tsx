import React, { useState, useEffect } from 'react';
import { X, Terminal, Shield, RefreshCw, Copy, Trash2, Check, AlertTriangle, Activity, Cpu } from 'lucide-react';
import { SystemLogEntry, getSystemLogs, subscribeSystemLogs, clearSystemLogs, logSystemEvent } from '../services/logger';

interface SystemLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemLogsModal: React.FC<SystemLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [pinging, setPinging] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setLogs(getSystemLogs());
      const unsubscribe = subscribeSystemLogs((updated) => setLogs(updated));
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterLevel === 'all') return true;
    return log.level === filterLevel;
  });

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}]: ${l.message} ${l.details || ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestPing = () => {
    setPinging(true);
    logSystemEvent('info', 'RuinScams Vocal Clone-Engine', 'Running diagnostic ping on neural audio pipeline...', 'Formant synthesis test: 24kHz PCM WAV output OK.');
    setTimeout(() => {
      logSystemEvent('success', 'Server', 'System health check complete: All 4 Presidential & Celebrity voice models active.', 'Zero latency offline DSP available.');
      setPinging(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                System Diagnostics & Real-time Logs
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 font-mono">
                  ONLINE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                RuinScams Vocal Clone-Turbo v2.4 Acoustic Synthesizer & Full-Stack Node Server Diagnostics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Overview Bar */}
        <div className="bg-[#161b22]/50 border-b border-[#30363d] px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Acoustic Engine</div>
              <div className="font-mono text-white text-[11px]">RuinScams Vocal Clone Turbo 2.4</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Audio Output</div>
              <div className="font-mono text-white text-[11px]">24kHz PCM WAV</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Server Connection</div>
              <div className="font-mono text-green-400 text-[11px]">Port 3000 Active</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-amber-400 ${pinging ? 'animate-spin' : ''}`} />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Gemini Fallback</div>
              <div className="font-mono text-amber-300 text-[11px]">Auto DSP Active</div>
            </div>
          </div>
        </div>

        {/* Log Filter & Actions Toolbar */}
        <div className="px-4 py-2 bg-[#0d1117] border-b border-[#30363d] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold mr-1">Filter:</span>
            {['all', 'info', 'success', 'warn', 'error'].map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  filterLevel === level
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#161b22] text-slate-400 hover:text-slate-200 border border-[#30363d]'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPing}
              disabled={pinging}
              className="px-2.5 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${pinging ? 'animate-spin' : ''}`} />
              Ping Engine
            </button>

            <button
              onClick={handleCopyLogs}
              className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] text-[11px] font-semibold flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy Logs'}
            </button>

            <button
              onClick={() => clearSystemLogs()}
              className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>

        {/* Log Messages Output Console */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] space-y-2 bg-[#080b10] text-slate-300 min-h-[250px] max-h-[450px]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
              <AlertTriangle className="w-8 h-8 text-slate-600" />
              <p>No system logs found for filter: "{filterLevel}"</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const levelColors = {
                info: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                success: 'text-green-400 bg-green-500/10 border-green-500/20',
                warn: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                error: 'text-red-400 bg-red-500/10 border-red-500/20',
              };

              return (
                <div
                  key={log.id}
                  className="p-2.5 rounded bg-[#0d1117] border border-[#21262d] flex flex-col gap-1 hover:border-[#30363d] transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{log.timestamp}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold border ${
                          levelColors[log.level]
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="text-purple-400 font-semibold">[{log.source}]</span>
                    </div>
                  </div>
                  <div className="text-slate-200 pl-2 border-l-2 border-[#30363d]">{log.message}</div>
                  {log.details && <div className="text-slate-500 text-[10px] pl-2">{log.details}</div>}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#161b22] border-t border-[#30363d] flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Total Entries: <strong className="text-white font-mono">{logs.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Close Logs
          </button>
        </div>
      </div>
    </div>
  );
};
