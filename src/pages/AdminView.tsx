import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import Header from '../components/layout/Header';
import { formatDateTime, isToday } from '../utils/time';
import type { OperationAction, OperationResult, RepairStatus, User } from '../types';
import {
  BarChart3, Wrench, ScrollText, AlertTriangle, CircleDot,
  Users, Zap, ClipboardList, Shield, Clock
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

type Tab = 'overview' | 'repairs' | 'logs';

export default function AdminView() {
  const [tab, setTab] = useState<Tab>('overview');

  const { machines, floors, buildings, queues, repairs, usageLogs, operationLogs, currentUserId, users } = useAppStore(
    useShallow(s => ({
      machines: s.machines,
      floors: s.floors,
      buildings: s.buildings,
      queues: s.queues,
      repairs: s.repairs,
      usageLogs: s.usageLogs,
      operationLogs: s.operationLogs,
      currentUserId: s.currentUserId,
      users: s.users,
    }))
  );

  const fixMachine = useAppStore(s => s.fixMachine);
  const markFault = useAppStore(s => s.markFault);
  const getUserById = useAppStore(s => s.getUserById);

  const currentUser = useMemo<User | undefined>(
    () => users.find(u => u.id === currentUserId),
    [users, currentUserId]
  );

  const stats = useMemo(() => {
    const todayLogs = usageLogs.filter(l => isToday(l.endTime || l.startTime));
    const totalUsage = todayLogs.length;
    const inUseCount = machines.filter(m => m.status === 'IN_USE').length;
    const idleCount = machines.filter(m => m.status === 'IDLE').length;
    const faultCount = machines.filter(m => m.status === 'FAULT').length;

    const floorUsage: Record<string, number> = {};
    const waitMinutes: number[] = [];

    for (const m of machines) {
      const floor = floors.find(f => f.id === m.floorId);
      const key = floor ? `${floor.floorNumber}楼` : m.floorId;
      const count = todayLogs.filter(l => l.machineId === m.id).length;
      if (count > 0) {
        floorUsage[key] = (floorUsage[key] || 0) + count;
      }
    }

    for (const [mid, q] of Object.entries(queues)) {
      if (q.length >= 2) {
        const first = q[0];
        const second = q[1];
        if (first.joinTime && second.joinTime) {
          const diff = (new Date(first.joinTime).getTime() - new Date(second.joinTime).getTime()) / 60000;
          if (diff > 0) waitMinutes.push(diff);
        }
      }
    }
    const avgWaitMinutes = waitMinutes.length > 0
      ? Math.round(waitMinutes.reduce((a, b) => a + b, 0) / waitMinutes.length)
      : 0;

    return {
      totalUsage,
      faultCount,
      avgWaitMinutes,
      floorUsage,
      inUseCount,
      idleCount,
      totalMachines: machines.length,
    };
  }, [machines, floors, usageLogs, queues]);

  const getMachine = (id: string) => machines.find(m => m.id === id);
  const getUser = (id: string) => users.find(u => u.id === id) || getUserById(id);

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode; count?: number }> = [
    { key: 'overview', label: '今日概览', icon: <BarChart3 size={15} /> },
    { key: 'repairs', label: '报修记录', icon: <Wrench size={15} />, count: repairs.filter(r => r.status !== 'FIXED').length },
    { key: 'logs', label: '操作日志', icon: <ScrollText size={15} /> },
  ];

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-16 pt-6">
        <div className="glass-card p-2 mb-6 inline-flex gap-1 rounded-2xl bg-slate-900/50 border border-slate-700/40">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2
                ${tab === t.key
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-slate-950 shadow-lg shadow-teal-500/20'
                  : 'text-slate-300 hover:bg-slate-800/50'}`}
            >
              {t.icon}
              {t.label}
              {typeof t.count === 'number' && t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-md text-[11px]
                  ${tab === t.key ? 'bg-slate-950/20 text-slate-950' : 'bg-amber-500/20 text-amber-300'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && <Overview stats={stats} getUser={getUser} />}
        {tab === 'repairs' && (
          <RepairsTab
            repairs={repairs}
            getUser={getUser}
            getMachine={getMachine}
            onFix={(id) => currentUser && fixMachine(id, currentUser.id)}
            onMarkFault={(id) => currentUser && markFault(id, currentUser.id)}
          />
        )}
        {tab === 'logs' && <LogsTab logs={operationLogs} getUser={getUser} />}
      </main>
    </div>
  );
}

function Overview({ stats, getUser }: any) {
  const floorEntries = Object.entries(stats.floorUsage || {});
  const maxFloor = Math.max(1, ...floorEntries.map(([, v]) => v as number));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <BigCard icon={<Zap size={20} />} label="今日使用" value={stats.totalUsage} color="teal" sub="累计次数" />
          <BigCard icon={<CircleDot size={20} />} label="当前使用中" value={stats.inUseCount} color="amber" sub={`空闲 ${stats.idleCount} 台`} />
          <BigCard icon={<AlertTriangle size={20} />} label="故障中" value={stats.faultCount} color="red" sub={`共 ${stats.totalMachines} 台机器`} />
          <BigCard icon={<Clock size={20} />} label="平均等待" value={stats.avgWaitMinutes ?? 0} color="slate" sub="分钟 / 次" />
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-teal-300" />
            楼层使用分布（今日）
          </h3>
          {floorEntries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">暂无数据</div>
          ) : (
            <div className="space-y-3">
              {floorEntries.map(([floorId, v]) => {
                const pct = ((v as number) / maxFloor) * 100;
                return (
                  <div key={floorId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{floorId}</span>
                      <span className="text-slate-400 tabular-nums">{v as number} 次使用</span>
                    </div>
                    <div className="h-7 rounded-lg bg-slate-900/60 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500/80 via-cyan-400/70 to-emerald-400/60 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="absolute inset-0 flex items-end p-1.5 pointer-events-none">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className="w-0.5 flex-1 h-full bg-slate-950/20" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <ClipboardList size={15} className="text-amber-300" />
            待处理报修
          </h3>
          <PendingRepairsList />
        </div>

        <div className="glass-card p-5">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Users size={15} className="text-teal-300" />
            在线用户
          </h3>
          <OnlineUsers getUser={getUser} />
        </div>
      </div>
    </div>
  );
}

function BigCard({ icon, label, value, color, sub }: any) {
  const cfg: Record<string, { grad: string; num: string; icBg: string; ic: string; glow: string }> = {
    teal: { grad: 'from-teal-500/30 to-cyan-500/10', num: 'text-teal-200', icBg: 'bg-teal-500/20', ic: 'text-teal-300', glow: 'shadow-[0_0_30px_-10px_rgba(20,184,166,0.4)]' },
    amber: { grad: 'from-amber-500/30 to-orange-500/10', num: 'text-amber-200', icBg: 'bg-amber-500/20', ic: 'text-amber-300', glow: 'shadow-[0_0_30px_-10px_rgba(251,191,36,0.4)]' },
    red: { grad: 'from-red-500/30 to-rose-500/10', num: 'text-red-200', icBg: 'bg-red-500/20', ic: 'text-red-300', glow: 'shadow-[0_0_30px_-10px_rgba(239,68,68,0.4)]' },
    slate: { grad: 'from-slate-500/30 to-slate-600/10', num: 'text-slate-200', icBg: 'bg-slate-500/20', ic: 'text-slate-300', glow: '' },
  };
  const c = cfg[color];
  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${c.grad} ${c.glow}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl ${c.icBg} flex items-center justify-center ${c.ic}`}>{icon}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{sub}</div>
      </div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`font-display font-bold text-4xl tabular-nums pulse-num ${c.num}`}>{value}</div>
    </div>
  );
}

function PendingRepairsList() {
  const { repairs, machines, users } = useAppStore(
    useShallow(s => ({ repairs: s.repairs, machines: s.machines, users: s.users }))
  );
  const pending = useMemo(
    () => repairs.filter(r => r.status === 'PENDING').slice(0, 5),
    [repairs]
  );
  const getMachine = (id: string) => machines.find(m => m.id === id);
  const getUser = (id: string) => users.find(u => u.id === id);

  if (pending.length === 0) {
    return <div className="py-6 text-center text-xs text-slate-400">暂无待处理报修</div>;
  }
  return (
    <div className="space-y-2">
      {pending.map(r => {
        const m = getMachine(r.machineId);
        const u = getUser(r.reporterId);
        return (
          <div key={r.id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-amber-200">{m?.code ?? r.machineId}</span>
              <span className="text-[10px] text-slate-500">{formatDateTime(r.reportTime)}</span>
            </div>
            <div className="text-xs text-slate-300 line-clamp-2">{r.description}</div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <div className="h-3.5 w-3.5 rounded bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 text-[8px] font-bold">
                {u?.avatar ?? '?'}
              </div>
              {u?.name ?? '未知'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OnlineUsers({ getUser }: any) {
  const { users, machines, queues } = useAppStore(
    useShallow(s => ({ users: s.users, machines: s.machines, queues: s.queues }))
  );
  const displayUsers = useMemo(() => users.slice(0, 8), [users]);

  const statusOf = (uid: string): string => {
    const m = machines.find(x => x.currentUserId === uid);
    if (m) return `使用 ${m.code}`;
    for (const [mid, q] of Object.entries(queues)) {
      const pos = q.findIndex(e => e.userId === uid);
      if (pos >= 0) {
        const mc = machines.find(x => x.id === mid);
        return `排队 ${mc?.code ?? mid} #${pos + 1}`;
      }
    }
    return '空闲';
  };

  return (
    <div className="space-y-2">
      {displayUsers.map(u => {
        const st = statusOf(u.id);
        const busy = !st.startsWith('空闲');
        return (
          <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/40 transition-colors">
            <div className="relative">
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-slate-950
                ${u.role === 'ADMIN' ? 'bg-gradient-to-br from-orange-500 to-rose-400' : 'bg-gradient-to-br from-teal-500 to-cyan-400'}`}
              >
                {u.avatar}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950
                ${busy ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium flex items-center gap-1.5">
                {u.name}
                {u.role === 'ADMIN' && <Shield size={11} className="text-orange-300" />}
              </div>
              <div className={`text-[10px] truncate ${busy ? 'text-amber-300' : 'text-slate-500'}`}>{st}</div>
            </div>
            <div className={`text-[10px] ${u.role === 'ADMIN' ? 'text-orange-300' : 'text-slate-400'}`}>
              {u.role === 'ADMIN' ? '管理员' : u.roomNumber}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RepairsTab({ repairs, getUser, getMachine, onFix, onMarkFault }: any) {
  const [statusFilter, setStatusFilter] = useState<RepairStatus | 'ALL'>('ALL');
  const list = repairs.filter((r: any) => statusFilter === 'ALL' || r.status === statusFilter);
  const statusCfg: Record<RepairStatus, { cls: string; label: string }> = {
    PENDING: { cls: 'bg-amber-500/15 border-amber-400/30 text-amber-300', label: '待处理' },
    CONFIRMED: { cls: 'bg-red-500/15 border-red-400/30 text-red-300', label: '已确认' },
    FIXED: { cls: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300', label: '已修复' },
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-3 inline-flex gap-1">
        {(['ALL', 'PENDING', 'CONFIRMED', 'FIXED'] as const).map(k => (
          <button
            key={k}
            onClick={() => setStatusFilter(k)}
            className={`tab-item text-xs ${statusFilter === k ? 'active' : ''}`}
          >
            {k === 'ALL' ? '全部' : statusCfg[k].label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-700/40 bg-slate-900/40">
                <th className="px-4 py-3 text-left font-medium">机器</th>
                <th className="px-4 py-3 text-left font-medium">描述</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">报修人</th>
                <th className="px-4 py-3 text-left font-medium">报修时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    暂无报修记录
                  </td>
                </tr>
              ) : list.map((r: any) => {
                const m = getMachine(r.machineId);
                const u = getUser(r.reporterId);
                const handler = r.handlerId ? getUser(r.handlerId) : null;
                const s = statusCfg[r.status];
                return (
                  <tr key={r.id} className="border-b border-slate-700/20 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-display font-semibold text-teal-300">{m?.code ?? r.machineId}</span>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <div className="text-slate-300 line-clamp-2">{r.description}</div>
                      {handler && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          处理人：{handler.name} · {r.handleTime && formatDateTime(r.handleTime)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip text-[10px] ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 shrink-0 rounded-md bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 text-[10px] font-bold">
                          {u?.avatar ?? '?'}
                        </div>
                        <span className="text-xs text-slate-300">{u?.name ?? '未知'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">
                      {formatDateTime(r.reportTime)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {r.status !== 'FIXED' && (
                        <button
                          onClick={() => onFix(r.machineId)}
                          className="btn btn-primary !py-1.5 !px-3 text-xs"
                        >
                          解除故障
                        </button>
                      )}
                      {r.status === 'PENDING' && m?.status !== 'FAULT' && (
                        <button
                          onClick={() => onMarkFault(r.machineId)}
                          className="btn btn-danger !py-1.5 !px-3 text-xs"
                        >
                          标记故障
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LogsTab({ logs, getUser }: any) {
  const [actionFilter, setActionFilter] = useState<OperationAction | 'ALL'>('ALL');
  const [resultFilter, setResultFilter] = useState<OperationResult | 'ALL'>('ALL');
  const [onlyToday, setOnlyToday] = useState(true);

  const list = logs.filter((l: any) => {
    if (actionFilter !== 'ALL' && l.action !== actionFilter) return false;
    if (resultFilter !== 'ALL' && l.result !== resultFilter) return false;
    if (onlyToday && !isToday(l.timestamp)) return false;
    return true;
  });

  const actionCfg: Record<OperationAction, { label: string; color: string }> = {
    RESERVE: { label: '预约', color: 'bg-teal-500/15 text-teal-300 border-teal-400/30' },
    CANCEL_RESERVE: { label: '取消预约', color: 'bg-orange-500/15 text-orange-300 border-orange-400/30' },
    START: { label: '开始使用', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' },
    END: { label: '结束使用', color: 'bg-slate-500/15 text-slate-300 border-slate-400/30' },
    REPORT_REPAIR: { label: '提交报修', color: 'bg-amber-500/15 text-amber-300 border-amber-400/30' },
    MARK_FAULT: { label: '标记故障', color: 'bg-red-500/15 text-red-300 border-red-400/30' },
    FIX_MACHINE: { label: '解除故障', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30' },
    TIMEOUT_SHIFT: { label: '超时顺延', color: 'bg-rose-500/15 text-rose-300 border-rose-400/30' },
    AUTO_END: { label: '自动释放', color: 'bg-sky-500/15 text-sky-300 border-sky-400/30' },
  };
  const resultCfg: Record<OperationResult, { label: string; dot: string }> = {
    SUCCESS: { label: '成功', dot: 'bg-emerald-400' },
    FAILED: { label: '失败', dot: 'bg-red-400' },
    BLOCKED: { label: '被阻止', dot: 'bg-amber-400' },
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900/40 border border-slate-700/30">
          {(['ALL', 'RESERVE', 'CANCEL_RESERVE', 'START', 'END', 'REPORT_REPAIR', 'MARK_FAULT', 'FIX_MACHINE', 'TIMEOUT_SHIFT', 'AUTO_END'] as const).map(k => (
            <button
              key={k}
              onClick={() => setActionFilter(k)}
              className={`tab-item text-[11px] !px-2.5 ${actionFilter === k ? 'active' : ''}`}
            >
              {k === 'ALL' ? '全部操作' : actionCfg[k].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-slate-900/40 border border-slate-700/30">
          {(['ALL', 'SUCCESS', 'FAILED', 'BLOCKED'] as const).map(k => (
            <button
              key={k}
              onClick={() => setResultFilter(k)}
              className={`tab-item text-[11px] !px-2.5 ${resultFilter === k ? 'active' : ''}`}
            >
              {k === 'ALL' ? '全部结果' : resultCfg[k].label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300 ml-auto cursor-pointer">
          <input type="checkbox" checked={onlyToday} onChange={e => setOnlyToday(e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500" />
          仅显示今日
        </label>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="text-xs text-slate-400 border-b border-slate-700/40 bg-slate-900/80 backdrop-blur">
                <th className="px-4 py-3 text-left font-medium">时间</th>
                <th className="px-4 py-3 text-left font-medium">操作人</th>
                <th className="px-4 py-3 text-left font-medium">操作</th>
                <th className="px-4 py-3 text-left font-medium">目标机器</th>
                <th className="px-4 py-3 text-left font-medium">详情</th>
                <th className="px-4 py-3 text-left font-medium">结果</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">
                    暂无操作日志
                  </td>
                </tr>
              ) : list.map((l: any) => {
                const u = getUser(l.operatorId);
                const ac = actionCfg[l.action];
                const rc = resultCfg[l.result];
                return (
                  <tr key={l.id} className="border-b border-slate-700/20 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                      {formatDateTime(l.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 shrink-0 rounded-md flex items-center justify-center text-slate-950 text-[10px] font-bold
                          ${u?.role === 'ADMIN' ? 'bg-gradient-to-br from-orange-500 to-rose-400' : 'bg-gradient-to-br from-teal-500 to-cyan-400'}`}
                        >
                          {u?.avatar ?? '?'}
                        </div>
                        <span className="text-xs text-slate-300">{u?.name ?? '未知'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip text-[11px] ${ac.color}`}>{ac.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {l.targetMachineId
                        ? <span className="text-xs font-display font-semibold text-teal-300">{l.targetMachineId}</span>
                        : <span className="text-slate-500 text-[11px]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                      {l.detail}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <span className={`h-2 w-2 rounded-full ${rc.dot}`} />
                        <span className={rc.dot.includes('emerald') ? 'text-emerald-300'
                          : rc.dot.includes('red') ? 'text-red-300' : 'text-amber-300'}>
                          {rc.label}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
