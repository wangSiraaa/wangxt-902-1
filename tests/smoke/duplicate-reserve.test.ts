import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store';
import { MACHINES, USERS } from '../../src/utils/mockData';

describe('Smoke 3: 同一住户重复预约第二台机器被阻止', () => {
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
      currentUserId: 'usr_001',
    });
  });

  it('预约第二台机器时被阻止，仅保留第一台的队列', () => {
    const st = () => useAppStore.getState();
    const userId = 'usr_001';
    st().setCurrentUser(userId);

    const firstMachineId = 'mch_001';
    const firstRes = st().reserveMachine(firstMachineId, userId);
    expect(firstRes.ok).toBe(true);

    const info1 = st().getCurrentReservationInfo(userId);
    expect(info1).not.toBeNull();
    expect(info1!.machineId).toBe(firstMachineId);

    const secondMachineId = 'mch_003';
    const secondRes = st().reserveMachine(secondMachineId, userId);
    expect(secondRes.ok).toBe(false);
    expect(secondRes.reason).toMatch(/其他|已在/);

    expect(st().getQueueForMachine(secondMachineId).find(e => e.userId === userId)).toBeUndefined();
    expect(st().getQueueForMachine(firstMachineId).find(e => e.userId === userId)).toBeDefined();
    expect(st().hasActiveReservation(userId, firstMachineId)).toBe(false);
    expect(st().hasActiveReservation(userId)).toBe(true);
  });

  it('先取消第一台预约后，再预约第二台成功', () => {
    const st = () => useAppStore.getState();
    const userId = 'usr_002';
    st().setCurrentUser(userId);

    const first = 'mch_001';
    const second = 'mch_003';

    expect(st().reserveMachine(first, userId).ok).toBe(true);
    expect(st().reserveMachine(second, userId).ok).toBe(false);

    expect(st().cancelReservation(first, userId).ok).toBe(true);

    expect(st().reserveMachine(second, userId).ok).toBe(true);
    expect(st().hasActiveReservation(userId)).toBe(true);
    expect(st().getCurrentReservationInfo(userId)?.machineId).toBe(second);
  });
});
