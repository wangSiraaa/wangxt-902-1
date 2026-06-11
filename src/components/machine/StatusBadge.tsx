import type { MachineStatus } from '../../types';

const MAP: Record<MachineStatus, { label: string; cls: string; dot: string }> = {
  IDLE: { label: '空闲可用', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30', dot: 'bg-emerald-400' },
  IN_USE: { label: '使用中', cls: 'bg-amber-500/15 text-amber-300 border-amber-400/30', dot: 'bg-amber-400' },
  FAULT: { label: '故障维修', cls: 'bg-red-500/15 text-red-300 border-red-400/30', dot: 'bg-red-400' },
};

export default function StatusBadge({ status }: { status: MachineStatus }) {
  const cfg = MAP[status];
  return (
    <span className={`chip ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${status === 'IN_USE' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}
