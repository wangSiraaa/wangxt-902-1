import type { QueueEntry } from '../../types';
import { useAppStore } from '../../store';
import { formatDateTime, formatTimeOnly } from '../../utils/time';
import { Clock, UserCheck, XCircle, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  machineId: string;
}

export default function QueueTimeline({ machineId }: Props) {
  const { queues, users, currentUserId, machines } = useAppStore(
    useShallow(s => ({
      queues: s.queues,
      users: s.users,
      currentUserId: s.currentUserId,
      machines: s.machines,
    }))
  );
  const cancel = useAppStore(s => s.cancelReservation);

  const queue = useMemo(
    () => queues[machineId] ?? [],
    [queues, machineId]
  );
  const machine = useMemo(
    () => machines.find(m => m.id === machineId),
    [machines, machineId]
  );

  if (queue.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400 rounded-xl border border-dashed border-slate-700/40">
        <Clock size={28} className="mx-auto mb-2 opacity-50" />
        暂无排队用户
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queue.map((entry, idx) => {
        const user = users.find(u => u.id === entry.userId);
        const isFirst = idx === 0;
        const isMe = entry.userId === currentUserId;
        const readyForConfirm = isFirst && (machine?.status === 'IDLE' || machine?.currentUserId !== entry.userId);

        return (
          <div
            key={entry.id}
            className={`relative pl-10 py-3 pr-3 rounded-xl transition-all
              ${isFirst ? 'bg-gradient-to-r from-teal-500/10 to-transparent border border-teal-400/20'
                : 'bg-slate-900/30 border border-slate-700/30'}
              ${isMe ? 'ring-1 ring-amber-400/40' : ''}`}
          >
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold
                ${isFirst
                  ? 'bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950'
                  : 'bg-slate-700/70 text-slate-200'}
                ${isMe ? 'ring-2 ring-amber-300' : ''}`}
              >
                {isFirst ? <ChevronRight size={14} /> : `#${entry.position}`}
              </div>
              {idx < queue.length - 1 && (
                <div className="absolute top-full h-6 w-px bg-slate-700/60" />
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold
                ${user?.role === 'ADMIN'
                  ? 'bg-gradient-to-br from-orange-500 to-rose-400 text-slate-950'
                  : 'bg-gradient-to-br from-teal-500 to-cyan-400 text-slate-950'}`}
              >
                {user?.avatar ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {user?.name ?? '未知用户'}
                    {isMe && <span className="text-[11px] text-amber-300 ml-1">（我）</span>}
                  </span>
                  {isFirst && (
                    <span className="chip bg-teal-500/15 border-teal-400/30 text-teal-300">
                      <UserCheck size={11} /> 下一位
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                  <span>{user?.roomNumber ?? ''}</span>
                  <span>·</span>
                  <span>加入 {formatTimeOnly(entry.joinTime)}</span>
                </div>
              </div>

              {isMe && (
                <button
                  onClick={() => cancel(machineId, currentUserId)}
                  className="btn btn-ghost !px-2 !py-1.5 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10"
                  title="取消预约"
                >
                  <XCircle size={14} />
                  取消
                </button>
              )}
            </div>

            {readyForConfirm && (
              <div className="mt-2 ml-12 text-[11px] text-teal-300 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
                机器可用后，可在详情面板点击确认开始使用
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
