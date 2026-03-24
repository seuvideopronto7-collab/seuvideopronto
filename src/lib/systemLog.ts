export type SystemLogLevel = "info" | "warning" | "error";

export type SystemLogEntry = {
  id: string;
  timestamp: number;
  level: SystemLogLevel;
  etapa: string;
  status: string;
  motivo?: string;
  meta?: Record<string, unknown>;
};

const STORAGE_KEY = "svz_system_logs";
const MAX_LOGS = 200;
const listeners = new Set<(entry: SystemLogEntry) => void>();

const readLogs = (): SystemLogEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SystemLogEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLogs = (logs: SystemLogEntry[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
};

export const addSystemLog = (entry: Omit<SystemLogEntry, "id" | "timestamp">) => {
  const next: SystemLogEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...entry,
  };
  const logs = readLogs();
  logs.push(next);
  writeLogs(logs);
  listeners.forEach((listener) => listener(next));
  return next;
};

export const getSystemLogs = () => readLogs();

export const subscribeSystemLogs = (listener: (entry: SystemLogEntry) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
