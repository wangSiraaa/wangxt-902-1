import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../store';
import FilterBar from '../components/machine/FilterBar';
import MachineCard from '../components/machine/MachineCard';
import MachineDetailDrawer from '../components/machine/MachineDetailDrawer';
import ReminderForm from '../components/forms/ReminderForm';
import RepairForm from '../components/forms/RepairForm';
import Header from '../components/layout/Header';

export default function Dashboard() {
  const { machines, floors, buildings, queues, repairs, usageLogs, currentUserId, ui } = useAppStore(
    useShallow(s => ({
      machines: s.machines,
      floors: s.floors,
      buildings: s.buildings,
      queues: s.queues,
      repairs: s.repairs,
      usageLogs: s.usageLogs,
      currentUserId: s.currentUserId,
      ui: s.ui,
    }))
  );
  const users = useAppStore(s => s.users);
  const openDetail = useAppStore(s => s.openMachineDetail);

  const user = useMemo(
    () => users.find(u => u.id === currentUserId),
    [users, currentUserId]
  );

  const filtered = useMemo<typeof machines>(() => {
    let list = machines;
    if (ui.selectedBuildingId) {
      const floorIds = floors.filter(f => f.buildingId === ui.selectedBuildingId).map(f => f.id);
      list = list.filter(m => floorIds.includes(m.floorId));
    }
    if (ui.selectedFloorId) {
      list = list.filter(m => m.floorId === ui.selectedFloorId);
    }
    if (ui.selectedStatusFilter && ui.selectedStatusFilter !== 'ALL') {
      list = list.filter(m => m.status === ui.selectedStatusFilter);
    }
    return list;
  }, [machines, floors, ui.selectedBuildingId, ui.selectedFloorId, ui.selectedStatusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayUsage = usageLogs.filter(l => {
      if (!l.startTime) return false;
      const d = new Date(l.startTime);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    });
    const faultCount = repairs.filter(r => r.status !== 'FIXED').length;
    const inUseCount = machines.filter(m => m.status === 'IN_USE').length;
    const idleCount = machines.filter(m => m.status === 'IDLE').length;
    return {
      totalUsage: todayUsage.length,
      faultCount,
      avgWaitMinutes: 0,
      floorUsage: {} as Record<string, number>,
      inUseCount,
      idleCount,
      totalMachines: machines.length,
    };
  }, [machines, usageLogs, repairs, floors, buildings]);

  const myReservation = useMemo(() => {
    if (!user) return null;
    for (const [machineId, entries] of Object.entries(queues)) {
      const idx = entries.findIndex(e => e.userId === user.id);
      if (idx >= 0) {
        const m = machines.find(x => x.id === machineId);
        return {
          machineId,
          machineCode: m?.code ?? machineId,
          position: idx + 1,
          totalInQueue: entries.length,
        };
      }
    }
    return null;
  }, [user, queues, machines]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-6 pb-16 pt-6">
        {myReservation && (
          <div className="mb-6 glass-card p-4 border-amber-400/30 flex items-center gap-4 flex-wrap">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-300 animate-pulse">
              <span className="text-lg">⏳</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-amber-200">当前排队中</div>
              <div className="text-xs text-slate-400">
                机器 <span className="text-slate-200 font-medium">{myReservation.machineCode}</span> · 队列位置
                <span className="text-amber-300 font-semibold ml-1">#{myReservation.position}</span>
                {myReservation.totalInQueue > 0 && (
                  <span className="text-slate-500"> · 共 {myReservation.totalInQueue} 人</span>
                )}
              </div>
            </div>
            <button
              onClick={() => openDetail(myReservation.machineId)}
              className="btn btn-secondary !py-2 text-xs"
            >
              查看详情
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatCard label="机器总数" value={stats.totalMachines} color="slate" />
          <StatCard label="使用中" value={stats.inUseCount} color="amber" />
          <StatCard label="空闲" value={stats.idleCount} color="emerald" />
          <StatCard label="故障" value={stats.faultCount} color="red" />
        </div>

        <FilterBar />

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display font-semibold text-slate-200 tracking-wide">
            洗衣机列表
            <span className="ml-2 text-xs font-normal text-slate-400">共 {filtered.length} 台</span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="glass-card py-16 text-center text-sm text-slate-400">
            没有符合筛选条件的机器
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(m => (
              <MachineCard key={m.id} machine={m} onClick={() => openDetail(m.id)} />
            ))}
          </div>
        )}
      </main>

      <MachineDetailDrawer />
      <ReminderForm />
      <RepairForm />
    </div>
  );
}

function StatCard({
  label, value, color,
}: { label: string; value: number; color: 'slate' | 'amber' | 'emerald' | 'red' }) {
  const cfg = {
    slate: { num: 'text-slate-100', bar: 'from-slate-500/40 to-slate-600/20', glow: '' },
    amber: { num: 'text-amber-300', bar: 'from-amber-400/50 to-orange-500/20', glow: 'shadow-[0_0_25px_-5px_rgba(251,191,36,0.25)]' },
    emerald: { num: 'text-emerald-300', bar: 'from-emerald-400/40 to-teal-500/20', glow: 'shadow-[0_0_25px_-5px_rgba(16,185,129,0.25)]' },
    red: { num: 'text-red-300', bar: 'from-red-500/40 to-rose-500/20', glow: 'shadow-[0_0_25px_-5px_rgba(239,68,68,0.3)]' },
  } as const;
  const c = cfg[color];

  return (
    <div className={`glass-card p-4 ${c.glow}`}>
      <div className="text-[11px] text-slate-400 mb-2 tracking-wider">{label}</div>
      <div className={`font-display font-bold text-3xl tabular-nums pulse-num ${c.num}`}>{value}</div>
      <div className={`mt-3 h-1.5 rounded-full bg-gradient-to-r ${c.bar}`} />
    </div>
  );
}
