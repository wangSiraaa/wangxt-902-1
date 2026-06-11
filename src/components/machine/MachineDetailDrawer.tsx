import { useAppStore } from '../../store';
import { formatTimeRemaining, getTimeRemainingMs, getConfirmRemainingMs, CONFIRM_TIMEOUT_SECONDS } from '../../utils/time';
import { X, Play, Square, UserPlus, AlertCircle, Wrench, Shield, Clock, MapPin, Timer, AlertTriangle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import QueueTimeline from '../queue/QueueTimeline';
import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function MachineDetailDrawer() {
  const { ui, machines, users, floors, buildings, queues, currentUserId } = useAppStore(
    useShallow(s => ({
      ui: s.ui,
      machines: s.machines,
      users: s.users,
      floors: s.floors,
      buildings: s.buildings,
      queues: s.queues,
      currentUserId: s.currentUserId,
    }))
  );

  const reserve = useAppStore(s => s.reserveMachine);
  const cancel = useAppStore(s => s.cancelReservation);
  const start = useAppStore(s => s.startMachine);
  const end = useAppStore(s => s.endMachine);
  const markFault = useAppStore(s => s.markFault);
  const fixMachine = useAppStore(s => s.fixMachine);
  const openRepair = useAppStore(s => s.openRepairModal);
  const closeMachineDetail = useAppStore(s => s.closeMachineDetail);

  const machine = useMemo(
    () => machines.find(m => m.id === ui.selectedMachineId),
    [machines, ui.selectedMachineId]
  );
  const currentUser = useMemo(
    () => users.find(u => u.id === currentUserId),
    [users, currentUserId]
  );
  const floor = useMemo(
    () => (machine ? floors.find(f => f.id === machine.floorId) : undefined),
    [machine, floors]
  );
  const building = useMemo(
    () => (floor ? buildings.find(b => b.id === floor.buildingId) : undefined),
    [floor, buildings]
  );
  const queue = useMemo(
    () => (machine ? queues[machine.id] ?? [] : []),
    [machine, queues]
  );
  const myReservation = useMemo(() => {
    if (!currentUser || !machine) return null;
    const q = queues[machine.id] ?? [];
    const pos = q.findIndex(e => e.userId === currentUser.id);
    if (pos < 0) return null;
    return {
      machineId: machine.id,
      machineCode: machine.code,
      position: pos + 1,
      totalInQueue: q.length,
    };
  }, [machine, currentUser, queues]);

  const inThisQueue = myReservation && myReservation.machineId === machine?.id;
  const isFirst = useMemo(() => {
    if (!machine || !currentUser) return false;
    const q = queues[machine.id] ?? [];
    return q.length > 0 && q[0].userId === currentUser.id;
  }, [machine, currentUser, queues]);

  const firstConfirmInfo = useMemo(() => {
    if (!machine) return null;
    const q = queues[machine.id] ?? [];
    if (q.length === 0) return null;
    const first = q[0];
    if (!first.confirmStartAt || first.confirmTimeoutSeconds <= 0) return null;
    const remainMs = getConfirmRemainingMs(first.confirmStartAt, first.confirmTimeoutSeconds);
    return {
      userId: first.userId,
      remainMs,
      active: remainMs > 0,
      totalSeconds: first.confirmTimeoutSeconds,
      firstUser: users.find(u => u.id === first.userId),
    };
  }, [machine, queues, users]);

  const [duration, setDuration] = useState(45);
  const isAdmin = currentUser?.role === 'ADMIN';

  if (!machine || !ui.showDetailDrawer || !currentUser) return null;

  const curUser = machine.currentUserId ? users.find(u => u.id === machine.currentUserId) : undefined;
  const remainMs = getTimeRemainingMs(machine.startTime, machine.durationMinutes);
  const totalMs = machine.durationMinutes * 60 * 1000;
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, (1 - remainMs / totalMs) * 100)) : 0;

  const canStart = machine.status === 'IDLE'
    && (queue.length === 0 || (isFirst));
  const canEnd = machine.status === 'IN_USE'
    && (machine.currentUserId === currentUser.id || isAdmin);
  const canReserve = machine.status !== 'FAULT' && !inThisQueue;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={closeMachineDetail}
      />
      <aside className="fixed right-0 top-0 h-full z-50 w-full max-w-xl bg-slate-950/95 backdrop-blur-2xl border-l border-slate-700/40 shadow-2xl flex flex-col drawer-enter">
        <header className="p-5 border-b border-slate-700/40 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h2 className="font-display font-bold text-xl tracking-wide">{machine.code}</h2>
              <StatusBadge status={machine.status} />
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span className="flex items-center gap-1"><MapPin size={12} />{building?.name} · {floor?.floorNumber}楼</span>
            </div>
          </div>
          <button onClick={closeMachineDetail} className="btn btn-ghost !px-2 !py-2">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-5">
          {machine.status === 'IN_USE' && (
            <section className="glass-card p-5 status-glow-inuse">
              <div className="text-xs text-slate-400 mb-1.5">使用中 · 剩余时间</div>
              <div className="flex items-end gap-3 mb-3">
                <div className="font-display text-5xl font-bold text-amber-300 tabular-nums pulse-num">
                  {formatTimeRemaining(remainMs)}
                </div>
                <div className="text-xs text-slate-400 pb-2">预计 {machine.durationMinutes} 分钟</div>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800/80 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-1000"
                  style={{ width: `${100 - pct}%` }}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-slate-950
                  ${curUser?.role === 'ADMIN' ? 'bg-gradient-to-br from-orange-500 to-rose-400' : 'bg-gradient-to-br from-teal-500 to-cyan-400'}`}
                >
                  {curUser?.avatar ?? '?'}
                </div>
                <div>
                  <div className="text-sm font-medium">{curUser?.name ?? '未知'}</div>
                  <div className="text-[11px] text-slate-400">{curUser?.roomNumber ?? ''}</div>
                </div>
              </div>
            </section>
          )}

          {machine.status === 'IDLE' && (
            <section className="glass-card p-5 status-glow-idle">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Clock size={22} className="text-emerald-300" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-200">空闲可用</div>
                  <div className="text-xs text-slate-400">
                    {queue.length > 0
                      ? `已有 ${queue.length} 人排队，请排队第一人确认使用`
                      : '无需排队，点击下方开始使用即可'}
                  </div>
                </div>
              </div>
            </section>
          )}

          {firstConfirmInfo && firstConfirmInfo.active && machine.status === 'IDLE' && (
            <section className={`glass-card p-5 ${isFirst ? 'status-glow-inuse ring-2 ring-amber-400/60' : 'border-2 border-amber-500/40'}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-amber-500/15 flex items-center justify-center animate-pulse">
                  <Timer size={22} className="text-amber-300" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-amber-200 mb-1 flex items-center gap-2">
                    {isFirst ? '轮到您使用！请尽快确认' : '排队第一人正在确认'}
                    {!isFirst && firstConfirmInfo.firstUser && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {firstConfirmInfo.firstUser.name} · {firstConfirmInfo.firstUser.roomNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    需在 {CONFIRM_TIMEOUT_SECONDS} 秒内点击"确认开始使用"，超时将顺延下一位
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-3 mb-2">
                <div className={`font-display text-4xl font-bold tabular-nums ${isFirst ? 'text-amber-300 pulse-num' : 'text-amber-400/80'}`}>
                  {formatTimeRemaining(firstConfirmInfo.remainMs)}
                </div>
                <div className="text-[11px] text-slate-500 pb-1">剩余确认时间</div>
              </div>
              <div className="h-2 rounded-full bg-slate-800/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-1000"
                  style={{
                    width: `${firstConfirmInfo.totalSeconds > 0
                      ? Math.max(0, Math.min(100, (firstConfirmInfo.remainMs / (firstConfirmInfo.totalSeconds * 1000)) * 100))
                      : 0}%`,
                  }}
                />
              </div>
              {!isFirst && (
                <div className="mt-3 flex items-start gap-2 text-[11px] text-rose-300/80">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>若第一人超时未确认，系统将自动移除并顺延至下一位用户（含您）</span>
                </div>
              )}
            </section>
          )}

          {machine.status === 'FAULT' && (
            <section className="glass-card p-5 status-glow-fault">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <AlertCircle size={22} className="text-red-300" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-red-200 mb-1">故障维修中</div>
                  <div className="text-xs text-slate-400 mb-3">
                    管理员已标记故障，操作区已锁定（队列信息保留供参考）
                  </div>
                  {!isAdmin && (
                    <button onClick={openRepair} className="btn btn-secondary !py-2 text-xs">
                      <Wrench size={14} /> 补充报修说明
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {machine.status !== 'FAULT' && (
            <section className="glass-card p-5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Play size={15} className="text-teal-300" /> 操作区
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {canStart && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1.5">预计使用时长（分钟）</label>
                      <select
                        value={duration}
                        onChange={e => setDuration(Number(e.target.value))}
                        className="input !py-2"
                      >
                        {[30, 45, 60, 75, 90].map(n => (
                          <option key={n} value={n}>{n} 分钟</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => start(machine.id, currentUser.id, duration)}
                      className="btn btn-primary sm:col-span-2"
                    >
                      <Play size={16} />
                      确认开始使用 {isFirst ? '（队列第1位）' : ''}
                    </button>
                  </>
                )}
                {canEnd && (
                  <button
                    onClick={() => end(machine.id, currentUser.id)}
                    className="btn btn-danger sm:col-span-2"
                  >
                    <Square size={16} />
                    {machine.currentUserId === currentUser.id ? '结束使用' : '（管理员）强制结束'}
                  </button>
                )}
                {canReserve && machine.status !== 'IDLE' && (
                  <button
                    onClick={() => reserve(machine.id, currentUser.id)}
                    className="btn btn-primary sm:col-span-2"
                  >
                    <UserPlus size={16} />
                    加入预约队列
                  </button>
                )}
                {machine.status === 'IDLE' && queue.length > 0 && !isFirst && !inThisQueue && (
                  <button
                    onClick={() => reserve(machine.id, currentUser.id)}
                    className="btn btn-secondary sm:col-span-2"
                  >
                    <UserPlus size={16} />
                    机器空但有人排队 · 加入队列
                  </button>
                )}
                {inThisQueue && !canStart && (
                  <button
                    onClick={() => cancel(machine.id, currentUser.id)}
                    className="btn btn-secondary sm:col-span-2"
                  >
                    取消我的预约（当前位置 #{myReservation?.position}）
                  </button>
                )}
                {!canStart && !canEnd && !canReserve && !inThisQueue && (
                  <div className="sm:col-span-2 text-xs text-slate-400 text-center py-3 rounded-xl border border-dashed border-slate-700/40">
                    暂无可执行操作
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">预约队列（{queue.length} 人）</h3>
              {!isAdmin && machine.status !== 'FAULT' && !inThisQueue && queue.length > 0 && (
                <button
                  onClick={() => reserve(machine.id, currentUser.id)}
                  className="text-xs text-teal-300 hover:text-teal-200 font-medium"
                >
                  + 加入
                </button>
              )}
            </div>
            <QueueTimeline machineId={machine.id} />
          </section>

          {isAdmin && (
            <section className="glass-card p-5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Shield size={15} className="text-amber-300" /> 管理员操作
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {machine.status !== 'FAULT' ? (
                  <button
                    onClick={() => {
                      if (confirm(`确认将 ${machine.code} 标记为故障？将清空当前占用。`)) {
                        markFault(machine.id, currentUser.id);
                      }
                    }}
                    className="btn btn-danger"
                  >
                    <AlertCircle size={15} /> 标记故障
                  </button>
                ) : (
                  <button
                    onClick={() => fixMachine(machine.id, currentUser.id)}
                    className="btn btn-primary"
                  >
                    <Wrench size={15} /> 解除故障
                  </button>
                )}
                <button onClick={openRepair} className="btn btn-secondary">
                  查看 / 新增报修记录
                </button>
              </div>
            </section>
          )}

          {!isAdmin && machine.status !== 'FAULT' && (
            <section className="glass-card p-5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Wrench size={15} className="text-slate-300" /> 故障报修
              </h3>
              <button onClick={openRepair} className="btn btn-secondary w-full">
                提交报修申请
              </button>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
