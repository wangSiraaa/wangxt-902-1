import type { Machine } from '../../types';
import { useAppStore } from '../../store';
import StatusBadge from './StatusBadge';
import { formatTimeRemaining, getTimeRemainingMs } from '../../utils/time';
import { Users, Clock, MapPin, AlertTriangle, Zap, ListChecks } from 'lucide-react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  machine: Machine;
  onClick: () => void;
}

export default function MachineCard({ machine, onClick }: Props) {
  const { users, floors, buildings, queues, currentUserId, printList } = useAppStore(
    useShallow(s => ({
      users: s.users,
      floors: s.floors,
      buildings: s.buildings,
      queues: s.queues,
      currentUserId: s.currentUserId,
      printList: s.ui.printList,
    }))
  );
  const togglePrintListItem = useAppStore(s => s.togglePrintListItem);

  const floor = useMemo(
    () => floors.find(f => f.id === machine.floorId),
    [floors, machine.floorId]
  );
  const building = useMemo(
    () => (floor ? buildings.find(b => b.id === floor.buildingId) : undefined),
    [buildings, floor]
  );
  const queue = useMemo(
    () => queues[machine.id] ?? [],
    [queues, machine.id]
  );
  const currentUserObj = useMemo(
    () => (machine.currentUserId ? users.find(u => u.id === machine.currentUserId) : undefined),
    [users, machine.currentUserId]
  );

  const reservationInfo = useMemo(() => {
    if (!currentUserId) return null;
    for (const [mid, q] of Object.entries(queues)) {
      const pos = q.findIndex(e => e.userId === currentUserId);
      if (pos >= 0) {
        const mc = (useAppStore.getState().machines.find(m => m.id === mid));
        return {
          machineId: mid,
          machineCode: mc?.code ?? mid,
          position: pos + 1,
          totalInQueue: q.length,
        };
      }
    }
    return null;
  }, [queues, currentUserId]);

  const isInPrintList = printList.some(p => p.machineId === machine.id);
  const isFault = machine.status === 'FAULT';

  const remainMs = getTimeRemainingMs(machine.startTime, machine.durationMinutes);
  const totalMs = machine.durationMinutes * 60 * 1000;
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, (1 - remainMs / totalMs) * 100)) : 0;

  const glow = machine.status === 'IDLE' ? 'status-glow-idle'
    : machine.status === 'IN_USE' ? 'status-glow-inuse'
    : 'status-glow-fault';

  const myPos = reservationInfo && reservationInfo.machineId === machine.id ? reservationInfo.position : 0;

  return (
    <div
      className={`fade-in glass-card ${glow} relative p-5 w-full transition-all duration-300
        hover:-translate-y-1 hover:shadow-2xl ${isInPrintList ? 'ring-2 ring-teal-400/60' : ''}`}
    >
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isFault) togglePrintListItem(machine.id);
          }}
          disabled={isFault}
          title={isFault ? '故障机器不能加入打印清单' : isInPrintList ? '移出打印清单' : '加入打印清单'}
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all
            ${isFault
              ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
              : isInPrintList
                ? 'bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'}`}
        >
          <ListChecks size={15} />
        </button>
      </div>

      <button
        onClick={onClick}
        className="text-left w-full focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 mb-4 pr-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-display font-bold text-lg tracking-wide">{machine.code}</span>
              {myPos > 0 && (
                <span className="chip bg-amber-500/15 border-amber-400/30 text-amber-300">
                  我的位置 #{myPos}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin size={12} />
              <span>{building?.name ?? ''} · {floor ? floor.floorNumber + '楼' : ''}</span>
            </div>
          </div>
          <StatusBadge status={machine.status} />
        </div>

        {machine.status === 'IN_USE' && (
          <div className="mb-4">
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock size={12} />
                剩余时间
              </span>
              <span className="font-display font-bold text-2xl text-amber-300 pulse-num tabular-nums">
                {formatTimeRemaining(remainMs)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-800/70 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000"
                style={{ width: `${100 - pct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <div className="h-6 w-6 shrink-0 rounded-md bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 text-[11px] font-bold">
                {currentUserObj?.avatar ?? '?'}
              </div>
              <span className="text-slate-300">
                <span className="font-medium">{currentUserObj?.name ?? '未知'}</span>
                <span className="text-slate-500"> · </span>
                <span className="text-slate-400">{currentUserObj?.roomNumber ?? ''}</span>
              </span>
            </div>
          </div>
        )}

        {machine.status === 'IDLE' && (
          <div className="mb-4 py-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Zap size={22} className="text-emerald-300" />
            </div>
            <div>
              <div className="font-medium text-emerald-200">立即可用</div>
              <div className="text-xs text-slate-400">点击查看详情并开始使用</div>
            </div>
          </div>
        )}

        {machine.status === 'FAULT' && (
          <div className="mb-4 py-3 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-red-500/15 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-300" />
            </div>
            <div>
              <div className="font-medium text-red-200">故障维修中</div>
              <div className="text-xs text-slate-400">暂时不可使用 · 可报修 · 不可加入打印</div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users size={13} />
            排队
            <span className={`font-semibold ${queue.length > 0 ? 'text-slate-200' : ''}`}>
              {queue.length}
            </span>
            人
          </div>
          <span className="text-xs text-teal-300 font-medium opacity-80 group-hover:opacity-100">查看详情 →</span>
        </div>
      </button>
    </div>
  );
}

