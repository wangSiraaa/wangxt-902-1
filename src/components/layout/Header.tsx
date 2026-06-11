import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import {
  Building2, Bell, Shield, UserRound, RefreshCw, ChevronDown
} from 'lucide-react';

export default function Header() {
  const { queues, machines, currentUserId, users } = useAppStore(
    useShallow(s => ({
      queues: s.queues,
      machines: s.machines,
      currentUserId: s.currentUserId,
      users: s.users,
    }))
  );
  const switchUser = useAppStore(s => s.switchCurrentUser);
  const openReminder = useAppStore(s => s.openReminderModal);
  const reset = useAppStore(s => s.resetAll);
  const [uMenu, setUMenu] = useState(false);

  const currentUser = useMemo(
    () => users.find(u => u.id === currentUserId),
    [users, currentUserId]
  );

  const reservationInfo = useMemo(() => {
    if (!currentUser) return null;
    for (const [mid, entries] of Object.entries(queues)) {
      const idx = entries.findIndex(e => e.userId === currentUser.id);
      if (idx >= 0) {
        const m = machines.find(x => x.id === mid);
        return {
          machineId: mid,
          machineCode: m?.code ?? mid,
          position: idx + 1,
          totalInQueue: entries.length,
        };
      }
    }
    return null;
  }, [currentUser, queues, machines]);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/60 border-b border-slate-700/30">
      <div className="max-w-[1600px] mx-auto px-5 md:px-8 h-16 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <Building2 size={18} className="text-slate-950" />
          </div>
          <div>
            <div className="font-display text-base font-bold tracking-tight">自助洗衣机占用看板</div>
            <div className="text-[11px] text-slate-400">Laundry Occupancy Board</div>
          </div>
        </div>

        <div className="flex-1" />

        {reservationInfo && currentUser && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/25 text-amber-300 text-xs font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            排队中 · #{reservationInfo.position} · {reservationInfo.machineCode}
          </div>
        )}

        <button
          onClick={openReminder}
          className="btn btn-secondary !px-3 !py-2"
          aria-label="设置提醒"
          title="提醒设置"
        >
          <Bell size={17} />
        </button>

        <div className="relative">
          <button
            onClick={() => setUMenu(v => !v)}
            className="flex items-center gap-2 btn btn-secondary !px-2 !py-1.5"
          >
            <div className={`h-7 w-7 rounded-lg bg-gradient-to-br
              ${currentUser?.role === 'ADMIN'
                ? 'from-orange-500 to-rose-400'
                : 'from-teal-500 to-cyan-400'}
              flex items-center justify-center text-slate-950 text-xs font-bold`}
            >
              {currentUser?.avatar ?? 'U'}
            </div>
            <span className="hidden sm:block text-sm font-medium">
              {currentUser?.name}
            </span>
            {currentUser?.role === 'ADMIN' && (
              <Shield size={13} className="text-amber-300" />
            )}
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {uMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUMenu(false)} />
              <div className="absolute right-0 mt-2 w-72 glass-card shadow-2xl p-2 z-50 overflow-hidden">
                <div className="px-3 py-2 text-[11px] text-slate-400 font-medium">切换用户</div>
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { switchUser(u.id); setUMenu(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                        ${u.id === currentUser?.id ? 'bg-teal-500/10' : 'hover:bg-slate-700/30'}`}
                    >
                      <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-slate-950 text-sm
                        ${u.role === 'ADMIN' ? 'bg-gradient-to-br from-orange-500 to-rose-400' : 'bg-gradient-to-br from-teal-500 to-cyan-400'}`}>
                        {u.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{u.name}</span>
                          {u.role === 'ADMIN' && <Shield size={11} className="text-amber-300" />}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.roomNumber} · {u.role === 'ADMIN' ? '管理员' : '住户'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-700/40 mt-1 pt-1">
                  <button
                    onClick={() => { if (confirm('确认重置所有本地数据？')) { reset(); setUMenu(false); }}}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-red-500/10 text-red-300 text-sm"
                  >
                    <RefreshCw size={15} />
                    重置所有数据
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
