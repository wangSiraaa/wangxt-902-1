import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Building, Floor, Machine, User, QueueEntry, RepairRecord,
  OperationLog, ReminderSettings, UIState, MachineStatus, OperationAction, OperationResult,
} from '../types';
import { BUILDINGS, FLOORS, MACHINES, USERS, QUEUE_ENTRIES, REPAIR_RECORDS, DEFAULT_REMINDER } from '../utils/mockData';
import { genId, getTimeRemainingMs, getConfirmRemainingMs } from '../utils/time';

export interface AppState {
  buildings: Building[];
  floors: Floor[];
  machines: Machine[];
  users: User[];
  queues: Record<string, QueueEntry[]>;
  repairs: RepairRecord[];
  usageLogs: Array<{ id: string; machineId: string; userId: string; startTime: string; endTime: string | null; actualMinutes: number | null }>;
  operationLogs: OperationLog[];
  reminders: ReminderSettings[];
  currentUserId: string;
  ui: UIState;

  selectBuilding: (id: string | null) => void;
  selectFloor: (id: string | null) => void;
  setStatusFilter: (s: MachineStatus | 'ALL') => void;
  openMachineDetail: (id: string) => void;
  closeMachineDetail: () => void;
  openReminderModal: () => void;
  closeReminderModal: () => void;
  openRepairModal: () => void;
  closeRepairModal: () => void;
  switchCurrentUser: (userId: string) => void;
  setCurrentUser: (userId: string) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  dismissToast: (id: string) => void;

  getCurrentUser: () => User | undefined;
  getUserById: (id: string | null | undefined) => User | undefined;
  getFloorById: (id: string | null) => Floor | undefined;
  getBuildingById: (id: string | null) => Building | undefined;
  getBuildingOfFloor: (floorId: string) => Building | undefined;
  getQueueForMachine: (machineId: string) => QueueEntry[];
  hasActiveReservation: (userId: string, excludeMachineId?: string) => boolean;
  getCurrentReservationInfo: (userId: string) => { machineId: string; machineCode: string; position: number; totalInQueue: number } | null;
  isFirstInQueue: (machineId: string, userId: string) => boolean;
  getFilteredMachines: () => Machine[];

  canReserve: (machineId: string, userId: string) => { ok: boolean; reason?: string };
  reserveMachine: (machineId: string, userId: string) => { ok: boolean; reason?: string };
  cancelReservation: (machineId: string, userId: string) => { ok: boolean; reason?: string };
  canStartMachine: (machineId: string, userId: string) => { ok: boolean; reason?: string };
  startMachine: (machineId: string, userId: string, durationMinutes?: number) => { ok: boolean; reason?: string };
  endMachine: (machineId: string, userId: string) => { ok: boolean; reason?: string };
  reportRepair: (machineId: string, userId: string, description: string) => { ok: boolean; reason?: string };
  markFault: (machineId: string, adminId: string) => { ok: boolean; reason?: string };
  fixMachine: (machineId: string, adminId: string) => { ok: boolean; reason?: string };
  saveReminderSettings: (userId: string, patch: Partial<ReminderSettings>) => void;
  getReminderSettings: (userId: string) => ReminderSettings;

  tick: () => void;
  shiftTimedOutQueue: () => void;
  finishExpiredUsages: () => void;

  getTodayStats: () => {
    totalUsage: number;
    faultCount: number;
    avgWaitMinutes: number;
    floorUsage: Record<string, number>;
    inUseCount: number;
    idleCount: number;
    totalMachines: number;
  };

  resetAll: () => void;

  addOperationLog: (params: { operatorId: string; action: OperationAction; targetMachineId: string; detail: string; result: OperationResult }) => void;
}

const initialUIState: UIState = {
  selectedBuildingId: null,
  selectedFloorId: null,
  selectedStatusFilter: 'ALL',
  selectedMachineId: null,
  showDetailDrawer: false,
  showReminderModal: false,
  showRepairModal: false,
  toasts: [],
};

const buildInitialQueues = (): Record<string, QueueEntry[]> => {
  const map: Record<string, QueueEntry[]> = {};
  for (const entry of QUEUE_ENTRIES) {
    if (!map[entry.machineId]) map[entry.machineId] = [];
    map[entry.machineId].push(entry);
  }
  return map;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      buildings: BUILDINGS,
      floors: FLOORS,
      machines: MACHINES,
      users: USERS,
      queues: buildInitialQueues(),
      repairs: REPAIR_RECORDS,
      usageLogs: [],
      operationLogs: [],
      reminders: [{ ...DEFAULT_REMINDER, userId: 'usr_001' }],
      currentUserId: 'usr_001',
      ui: initialUIState,

      selectBuilding: (id) => set({ ui: { ...get().ui, selectedBuildingId: id, selectedFloorId: null } }),
      selectFloor: (id) => set({ ui: { ...get().ui, selectedFloorId: id } }),
      setStatusFilter: (s) => set({ ui: { ...get().ui, selectedStatusFilter: s } }),
      openMachineDetail: (id) => set({ ui: { ...get().ui, selectedMachineId: id, showDetailDrawer: true } }),
      closeMachineDetail: () => set({ ui: { ...get().ui, showDetailDrawer: false } }),
      openReminderModal: () => set({ ui: { ...get().ui, showReminderModal: true } }),
      closeReminderModal: () => set({ ui: { ...get().ui, showReminderModal: false } }),
      openRepairModal: () => set({ ui: { ...get().ui, showRepairModal: true } }),
      closeRepairModal: () => set({ ui: { ...get().ui, showRepairModal: false } }),
      switchCurrentUser: (userId) => {
        const user = get().users.find(u => u.id === userId);
        if (!user) return;
        set({ currentUserId: userId });
        get().showToast('info', `已切换为：${user.name}`);
      },
      setCurrentUser: (userId) => {
        const user = get().users.find(u => u.id === userId);
        if (!user) return;
        set({ currentUserId: userId });
      },
      showToast: (type, message) => {
        const id = genId();
        set({ ui: { ...get().ui, toasts: [...get().ui.toasts, { id, type, message }] } });
        setTimeout(() => {
          const current = get().ui.toasts;
          set({ ui: { ...get().ui, toasts: current.filter(t => t.id !== id) } });
        }, 3000);
      },
      dismissToast: (id) => {
        set({ ui: { ...get().ui, toasts: get().ui.toasts.filter(t => t.id !== id) } });
      },

      getCurrentUser: () => get().users.find(u => u.id === get().currentUserId),
      getUserById: (id) => get().users.find(u => u.id === id),
      getFloorById: (id) => id ? get().floors.find(f => f.id === id) : undefined,
      getBuildingById: (id) => id ? get().buildings.find(b => b.id === id) : undefined,
      getBuildingOfFloor: (floorId) => {
        const floor = get().floors.find(f => f.id === floorId);
        if (!floor) return undefined;
        return get().buildings.find(b => b.id === floor.buildingId);
      },
      getQueueForMachine: (machineId) => get().queues[machineId] ?? [],
      hasActiveReservation: (userId, excludeMachineId) => {
        const queues = get().queues;
        return Object.entries(queues).some(([mid, entries]) => {
          if (excludeMachineId && mid === excludeMachineId) return false;
          return entries.some(e => e.userId === userId);
        });
      },
      getCurrentReservationInfo: (userId) => {
        const queues = get().queues;
        for (const [machineId, entries] of Object.entries(queues)) {
          const idx = entries.findIndex(e => e.userId === userId);
          if (idx >= 0) {
            const m = get().machines.find(x => x.id === machineId);
            return {
              machineId,
              machineCode: m?.code ?? machineId,
              position: idx + 1,
              totalInQueue: entries.length,
            };
          }
        }
        return null;
      },
      isFirstInQueue: (machineId, userId) => {
        const queue = get().queues[machineId];
        return !!queue && queue.length > 0 && queue[0].userId === userId;
      },
      getFilteredMachines: () => {
        const { machines, ui } = get();
        return machines.filter(m => {
          if (ui.selectedFloorId && m.floorId !== ui.selectedFloorId) return false;
          if (!ui.selectedFloorId && ui.selectedBuildingId) {
            const floor = get().getFloorById(m.floorId);
            if (!floor || floor.buildingId !== ui.selectedBuildingId) return false;
          }
          if (ui.selectedStatusFilter !== 'ALL' && m.status !== ui.selectedStatusFilter) return false;
          return true;
        });
      },

      addOperationLog: ({ operatorId, action, targetMachineId, detail, result }) => {
        set({
          operationLogs: [
            {
              id: genId(),
              operatorId,
              action,
              targetMachineId,
              detail,
              timestamp: new Date().toISOString(),
              result,
            },
            ...get().operationLogs,
          ].slice(0, 500),
        });
      },

      canReserve: (machineId, userId) => {
        const machine = get().machines.find(m => m.id === machineId);
        if (!machine) return { ok: false, reason: '机器不存在' };
        if (machine.status === 'FAULT') return { ok: false, reason: '机器故障，暂不可预约' };
        if (get().hasActiveReservation(userId, machineId)) return { ok: false, reason: '您已在其他机器的预约队列中' };
        const queue = get().queues[machineId] ?? [];
        if (queue.some(e => e.userId === userId)) return { ok: false, reason: '您已在该机器的预约队列中' };
        return { ok: true };
      },
      reserveMachine: (machineId, userId) => {
        const check = get().canReserve(machineId, userId);
        if (!check.ok) {
          get().addOperationLog({ operatorId: userId, action: 'RESERVE', targetMachineId: machineId, detail: check.reason ?? '', result: 'BLOCKED' });
          get().showToast('error', check.reason ?? '预约失败');
          return check;
        }
        const existing = get().queues[machineId] ?? [];
        const newEntry: QueueEntry = {
          id: genId(),
          machineId,
          userId,
          position: existing.length + 1,
          joinTime: new Date().toISOString(),
          confirmTimeoutSeconds: 0,
          confirmed: false,
        };
        set({ queues: { ...get().queues, [machineId]: [...existing, newEntry] } });
        get().addOperationLog({ operatorId: userId, action: 'RESERVE', targetMachineId: machineId, detail: `加入预约队列，位置#${newEntry.position}`, result: 'SUCCESS' });
        const user = get().getUserById(userId);
        get().showToast('success', `${user?.name ?? ''} 已成功加入排队队列，位置#${newEntry.position}`);
        return { ok: true };
      },
      cancelReservation: (machineId, userId) => {
        const queue = get().queues[machineId] ?? [];
        const idx = queue.findIndex(e => e.userId === userId);
        if (idx < 0) {
          get().addOperationLog({ operatorId: userId, action: 'CANCEL_RESERVE', targetMachineId: machineId, detail: '不在队列中，取消无效', result: 'BLOCKED' });
          return { ok: false, reason: '您不在该机器的预约队列中' };
        }
        const newQueue = queue.filter(e => e.userId !== userId).map((e, i) => ({ ...e, position: i + 1 }));
        set({ queues: { ...get().queues, [machineId]: newQueue } });
        get().addOperationLog({ operatorId: userId, action: 'CANCEL_RESERVE', targetMachineId: machineId, detail: `取消预约，原位置#${idx + 1}`, result: 'SUCCESS' });
        get().showToast('info', '已取消预约，队列位置已释放');
        return { ok: true };
      },

      canStartMachine: (machineId, userId) => {
        const machine = get().machines.find(m => m.id === machineId);
        if (!machine) return { ok: false, reason: '机器不存在' };
        if (machine.status === 'FAULT') return { ok: false, reason: '机器故障，不可使用' };
        if (machine.status === 'IDLE') {
          const queue = get().queues[machineId] ?? [];
          if (queue.length > 0 && queue[0].userId !== userId) {
            return { ok: false, reason: '有排队用户，请先让排队第一人确认使用' };
          }
          return { ok: true };
        }
        if (machine.status === 'IN_USE') {
          if (machine.currentUserId === userId) return { ok: false, reason: '您已在使用中' };
          return { ok: false, reason: '机器使用中，请先加入排队' };
        }
        return { ok: false, reason: '当前状态不可开始使用' };
      },
      startMachine: (machineId, userId, durationMinutes = 45) => {
        const check = get().canStartMachine(machineId, userId);
        if (!check.ok) {
          get().addOperationLog({ operatorId: userId, action: 'START', targetMachineId: machineId, detail: check.reason ?? '', result: 'BLOCKED' });
          get().showToast('error', check.reason ?? '无法开始使用');
          return check;
        }
        set({
          machines: get().machines.map(m => m.id === machineId ? {
            ...m, status: 'IN_USE' as MachineStatus, currentUserId: userId, startTime: new Date().toISOString(), durationMinutes,
          } : m),
        });
        const queues = get().queues;
        const queue = queues[machineId] ?? [];
        if (queue.length > 0 && queue[0].userId === userId) {
          const newQueue = queue.slice(1).map((e, i) => ({ ...e, position: i + 1 }));
          set({ queues: { ...queues, [machineId]: newQueue } });
        }
        set({
          usageLogs: [
            { id: genId(), machineId, userId, startTime: new Date().toISOString(), endTime: null, actualMinutes: null },
            ...get().usageLogs,
          ],
        });
        get().addOperationLog({ operatorId: userId, action: 'START', targetMachineId: machineId, detail: `开始使用，时长${durationMinutes}分钟`, result: 'SUCCESS' });
        const user = get().getUserById(userId);
        get().showToast('success', `${user?.name ?? ''} 开始使用机器`);
        return { ok: true };
      },
      endMachine: (machineId, userId) => {
        const machine = get().machines.find(m => m.id === machineId);
        if (!machine) return { ok: false, reason: '机器不存在' };
        if (machine.status !== 'IN_USE') return { ok: false, reason: '机器未在使用中' };
        if (machine.currentUserId !== userId) {
          const user = get().getCurrentUser();
          if (user?.role !== 'ADMIN') return { ok: false, reason: '您不是当前使用人，不可结束' };
        }
        const actualMinutes = machine.startTime
          ? Math.max(1, Math.round((Date.now() - new Date(machine.startTime).getTime()) / 60000))
          : machine.durationMinutes;
        set({
          machines: get().machines.map(m => m.id === machineId ? {
            ...m, status: 'IDLE' as MachineStatus, currentUserId: null, startTime: null, durationMinutes: m.durationMinutes,
          } : m),
          usageLogs: get().usageLogs.map(l => l.machineId === machineId && l.endTime === null ? {
            ...l, endTime: new Date().toISOString(), actualMinutes,
          } : l),
        });
        get().addOperationLog({ operatorId: userId, action: 'END', targetMachineId: machineId, detail: `结束使用，实际使用${actualMinutes}分钟`, result: 'SUCCESS' });
        get().showToast('success', '机器已释放，回归空闲状态');
        return { ok: true };
      },

      reportRepair: (machineId, userId, description) => {
        if (!description.trim()) {
          get().addOperationLog({ operatorId: userId, action: 'REPORT_REPAIR', targetMachineId: machineId, detail: '报修说明为空', result: 'BLOCKED' });
          return { ok: false, reason: '请填写故障说明' };
        }
        set({
          repairs: [
            {
              id: genId(), machineId, reporterId: userId, description: description.trim(),
              status: 'PENDING', reportTime: new Date().toISOString(), handleTime: null, handlerId: null,
            },
            ...get().repairs,
          ],
        });
        get().addOperationLog({ operatorId: userId, action: 'REPORT_REPAIR', targetMachineId: machineId, detail: description.slice(0, 60), result: 'SUCCESS' });
        get().showToast('success', '已提交报修申请，管理员将尽快处理');
        return { ok: true };
      },
      markFault: (machineId, adminId) => {
        const admin = get().getUserById(adminId);
        if (!admin || admin.role !== 'ADMIN') return { ok: false, reason: '仅管理员可操作' };
        const machine = get().machines.find(m => m.id === machineId);
        if (!machine) return { ok: false, reason: '机器不存在' };
        set({
          machines: get().machines.map(m => m.id === machineId ? {
            ...m, status: 'FAULT' as MachineStatus, currentUserId: null, startTime: null,
          } : m),
          repairs: get().repairs.map(r => r.machineId === machineId && r.status === 'PENDING' ? {
            ...r, status: 'CONFIRMED' as const, handleTime: new Date().toISOString(), handlerId: adminId,
          } : r),
        });
        get().addOperationLog({ operatorId: adminId, action: 'MARK_FAULT', targetMachineId: machineId, detail: '管理员标记机器故障，已清空使用状态', result: 'SUCCESS' });
        get().showToast('error', '机器已标记为故障，已清空占用');
        return { ok: true };
      },
      fixMachine: (machineId, adminId) => {
        const admin = get().getUserById(adminId);
        if (!admin || admin.role !== 'ADMIN') return { ok: false, reason: '仅管理员可操作' };
        set({
          machines: get().machines.map(m => m.id === machineId ? { ...m, status: 'IDLE' as MachineStatus } : m),
          repairs: get().repairs.map(r => r.machineId === machineId && (r.status === 'CONFIRMED' || r.status === 'PENDING') ? {
            ...r, status: 'FIXED' as const, handleTime: new Date().toISOString(), handlerId: adminId,
          } : r),
        });
        get().addOperationLog({ operatorId: adminId, action: 'FIX_MACHINE', targetMachineId: machineId, detail: '管理员修复机器，恢复空闲', result: 'SUCCESS' });
        get().showToast('success', '机器已修复，恢复空闲可用');
        return { ok: true };
      },

      saveReminderSettings: (userId, patch) => {
        const list = get().reminders;
        const idx = list.findIndex(r => r.userId === userId);
        const base = idx >= 0 ? { ...list[idx], ...patch, userId } : { ...DEFAULT_REMINDER, userId, ...patch };
        const newList = idx >= 0 ? list.map((r, i) => i === idx ? base : r) : [...list, base];
        set({ reminders: newList });
        get().showToast('success', '提醒设置已保存');
      },
      getReminderSettings: (userId) => {
        return get().reminders.find(r => r.userId === userId) ?? { ...DEFAULT_REMINDER, userId };
      },

      tick: () => {
        get().shiftTimedOutQueue();
        get().finishExpiredUsages();
      },
      shiftTimedOutQueue: () => {
        const { queues, machines, showToast, addOperationLog } = get();
        let changed = false;
        const newQueues: Record<string, QueueEntry[]> = { ...queues };
        for (const machine of machines) {
          if (machine.status !== 'IN_USE') continue;
          const queue = newQueues[machine.id] ?? [];
          if (queue.length === 0) continue;
          const first = queue[0];
          if (first.confirmTimeoutSeconds > 0 && !first.confirmed) {
            const remain = getConfirmRemainingMs(first.joinTime, first.confirmTimeoutSeconds);
            if (remain <= 0) {
              newQueues[machine.id] = queue.slice(1).map((e, i) => ({ ...e, position: i + 1 }));
              changed = true;
              addOperationLog({ operatorId: first.userId, action: 'TIMEOUT_SHIFT', targetMachineId: machine.id, detail: '超时未确认，自动顺延', result: 'BLOCKED' });
              const user = get().getUserById(first.userId);
              showToast('info', `${user?.name ?? '用户'} 超时未确认使用，已顺延下一位`);
            }
          }
        }
        if (changed) set({ queues: newQueues });
      },
      finishExpiredUsages: () => {
        const { machines, endMachine } = get();
        for (const m of machines) {
          if (m.status === 'IN_USE' && m.currentUserId && m.startTime) {
            const remain = getTimeRemainingMs(m.startTime, m.durationMinutes);
            if (remain <= 0) {
              endMachine(m.id, m.currentUserId);
            }
          }
        }
      },

      getTodayStats: () => {
        const { machines, usageLogs, repairs, floors } = get();
        const todayUsage = usageLogs.filter(l => l.startTime && (() => {
          const d = new Date(l.startTime);
          const now = new Date();
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        })());
        const faultCount = repairs.filter(r => r.status !== 'FIXED').length;
        const inUseCount = machines.filter(m => m.status === 'IN_USE').length;
        const idleCount = machines.filter(m => m.status === 'IDLE').length;
        const floorMap = new Map<string, number>();
        for (const f of floors) floorMap.set(f.id, 0);
        for (const u of todayUsage) {
          const m = machines.find(x => x.id === u.machineId);
          if (m) floorMap.set(m.floorId, (floorMap.get(m.floorId) ?? 0) + 1);
        }
        const floorUsage: Record<string, number> = {};
        for (const f of floors) {
          const fb = get().buildings.find(b => b.id === f.buildingId);
          const label = `${fb?.name ?? ''}·${f.floorNumber}楼`;
          floorUsage[label] = floorMap.get(f.id) ?? 0;
        }
        const avgWaitMinutes = 0;
        return {
          totalUsage: todayUsage.length,
          faultCount,
          avgWaitMinutes,
          floorUsage,
          inUseCount,
          idleCount,
          totalMachines: machines.length,
        };
      },

      resetAll: () => {
        localStorage.removeItem('laundry-store-v1');
        location.reload();
      },
    }),
    {
      name: 'laundry-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        machines: state.machines,
        queues: state.queues,
        repairs: state.repairs,
        usageLogs: state.usageLogs,
        operationLogs: state.operationLogs,
        reminders: state.reminders,
        currentUserId: state.currentUserId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // After rehydrate from localStorage, start tick loop
          if (typeof window !== 'undefined') {
            // noop, App component will start interval
          }
        }
      },
    },
  ),
);
