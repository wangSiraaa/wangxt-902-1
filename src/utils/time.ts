export const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatDateTime = (isoString: string): string => {
  const d = new Date(isoString);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hour = d.getHours().toString().padStart(2, '0');
  const minute = d.getMinutes().toString().padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day} ${hour}:${minute}`;
};

export const formatTimeOnly = (isoString: string): string => {
  const d = new Date(isoString);
  const hour = d.getHours().toString().padStart(2, '0');
  const minute = d.getMinutes().toString().padStart(2, '0');
  return `${hour}:${minute}`;
};

export const getTimeRemainingMs = (startTime: string | null, durationMinutes: number): number => {
  if (!startTime) return 0;
  const end = new Date(startTime).getTime() + durationMinutes * 60 * 1000;
  return Math.max(0, end - Date.now());
};

export const getConfirmRemainingMs = (joinTime: string, timeoutSeconds: number): number => {
  const end = new Date(joinTime).getTime() + timeoutSeconds * 1000;
  return Math.max(0, end - Date.now());
};

export const genId = (): string => {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
};

export const isToday = (isoString: string): boolean => {
  const d = new Date(isoString);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
};
