export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  source: 'RuinScams Vocal Clone-Engine' | 'Gemini-TTS' | 'AudioDSP' | 'VoiceStudio' | 'Server';
  message: string;
  details?: string;
}

type LogListener = (logs: SystemLogEntry[]) => void;

let logs: SystemLogEntry[] = [
  {
    id: 'log_init_1',
    timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
    level: 'info',
    source: 'Server',
    message: 'RuinScams Vocal Clone-Turbo v2.4 Neural Synthesis Engine initialized.',
    details: 'Loaded 24kHz PCM WAV audio generator & DSP formant filters.',
  },
  {
    id: 'log_init_2',
    timestamp: new Date(Date.now() - 90000).toLocaleTimeString(),
    level: 'info',
    source: 'VoiceStudio',
    message: 'Presidents & Celebrities dataset loaded successfully.',
    details: 'Barack Obama, Donald Trump, George W. Bush, Joe Biden profiles active.',
  },
  {
    id: 'log_init_3',
    timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
    level: 'success',
    source: 'Gemini-TTS',
    message: 'Gemini AI API proxy ready with automatic RuinScams Vocal Clone DSP fallback.',
    details: 'Full-stack server proxy configured on port 3000.',
  },
];

const listeners: Set<LogListener> = new Set();

export function getSystemLogs(): SystemLogEntry[] {
  return [...logs];
}

export function logSystemEvent(
  level: SystemLogEntry['level'],
  source: SystemLogEntry['source'],
  message: string,
  details?: string
): SystemLogEntry {
  const entry: SystemLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toLocaleTimeString(),
    level,
    source,
    message,
    details,
  };

  logs = [entry, ...logs].slice(0, 100); // keep last 100 logs
  listeners.forEach((listener) => listener(logs));
  return entry;
}

export function subscribeSystemLogs(listener: LogListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clearSystemLogs(): void {
  logs = [];
  listeners.forEach((listener) => listener(logs));
}
