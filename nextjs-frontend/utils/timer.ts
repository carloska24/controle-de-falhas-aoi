/**
 * Utilitários para formatação e cálculo de tempo
 */

export function formatTimer(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimerFromMs(ms: number): string {
  return formatTimer(Math.floor(ms / 1000));
}

export function calculateElapsed(startTime: number, pausedTime: number = 0, pausedAt: number | null = null): number {
  if (!startTime) return 0;
  const now = Date.now();
  const totalPaused = pausedTime + (pausedAt ? now - pausedAt : 0);
  return Math.max(0, Math.floor((now - startTime - totalPaused) / 1000));
}

