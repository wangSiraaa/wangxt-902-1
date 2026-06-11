import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store';
import { MACHINES } from '../../src/utils/mockData';

describe('Smoke 2: 故障机器预约失败', () => {
  beforeEach(() => {
    window.localStorage.removeItem('laundry-store-v1');
    const freshMachines = MACHINES.map(m => ({
      ...m,
      status: 'IDLE' as const,
      currentUserId: null,
      startTime: null,
    }));
    useAppStore.setState({
      machines: freshMachines,
      queues: {},
      operationLogs: [],
      usageLogs: [],
      repairs: [],
      currentUserId: 'usr_admin',
    });
  });

  it('管理员标记故障后，住户预约被阻止并生成失败日志', () => {
    const st = () => useAppStore.getState();
    const adminId = 'usr_admin';
    const userId = 'usr_001';
    const machineId = 'mch_005';

    st().setCurrentUser(adminId);
    const mark = st().markFault(machineId, adminId);
    expect(mark.ok).toBe(true);

    const faulty = st().machines.find(m => m.id === machineId);
    expect(faulty?.status).toBe('FAULT');

    st().setCurrentUser(userId);
    const reserve = st().reserveMachine(machineId, userId);
    expect(reserve.ok).toBe(false);
    expect(reserve.reason).toContain('故障');

    expect(st().getQueueForMachine(machineId)).toEqual([]);

    const faultLogs = st().operationLogs.filter(
      l => l.targetMachineId === machineId && l.action === 'RESERVE' && l.result === 'BLOCKED'
    );
    expect(faultLogs.length).toBeGreaterThan(0);
    expect(faultLogs[0].detail).toContain('故障');
  });

  it('初始已为 FAULT 状态的机器直接预约失败', () => {
    const st = () => useAppStore.getState();
    st().setCurrentUser('usr_003');

    // 先把 mch_001 手动置为 FAULT
    const targetId = 'mch_001';
    const r = st().markFault(targetId, 'usr_admin');
    expect(r.ok).toBe(true);

    const res = st().reserveMachine(targetId, 'usr_003');
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/故障|FAULT/);
  });
});
