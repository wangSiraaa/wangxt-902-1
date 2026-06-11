import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store';
import { MACHINES } from '../../src/utils/mockData';

describe('Smoke: 打印清单功能', () => {
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
      ui: {
        showDetailDrawer: false,
        showReminderModal: false,
        showRepairModal: false,
        showPrintPreview: false,
        selectedMachineId: null,
        selectedBuildingId: null,
        selectedFloorId: null,
        selectedStatusFilter: 'ALL',
        printList: [],
        toasts: [],
      },
    });
  });

  it('空闲和使用中的机器可加入打印清单', () => {
    const st = () => useAppStore.getState();
    const idleMachine = MACHINES.find(m => m.id === 'mch_001')!;
    const inUseMachine = MACHINES.find(m => m.id === 'mch_002')!;

    // 将 mch_002 置为使用中
    useAppStore.setState({
      machines: st().machines.map(m =>
        m.id === 'mch_002' ? { ...m, status: 'IN_USE', currentUserId: 'usr_001', startTime: new Date().toISOString() } : m
      ),
    });

    const addIdle = st().addToPrintList(idleMachine.id);
    expect(addIdle.ok).toBe(true);

    const addInUse = st().addToPrintList(inUseMachine.id);
    expect(addInUse.ok).toBe(true);

    expect(st().ui.printList.length).toBe(2);
    expect(st().ui.printList.some(p => p.machineId === idleMachine.id)).toBe(true);
    expect(st().ui.printList.some(p => p.machineId === inUseMachine.id)).toBe(true);
  });

  it('故障机器不能加入打印清单（失败分支）', () => {
    const st = () => useAppStore.getState();
    const adminId = 'usr_admin';
    const faultMachineId = 'mch_003';

    st().setCurrentUser(adminId);
    const mark = st().markFault(faultMachineId, adminId);
    expect(mark.ok).toBe(true);

    const faulty = st().machines.find(m => m.id === faultMachineId);
    expect(faulty?.status).toBe('FAULT');

    const addFault = st().addToPrintList(faultMachineId);
    expect(addFault.ok).toBe(false);
    expect(addFault.reason).toContain('故障');

    expect(st().ui.printList.length).toBe(0);
  });

  it('同一台机器重复加入打印清单会被忽略或移除（切换）', () => {
    const st = () => useAppStore.getState();
    const machineId = 'mch_001';

    const add1 = st().addToPrintList(machineId);
    expect(add1.ok).toBe(true);
    expect(st().ui.printList.length).toBe(1);

    const add2 = st().addToPrintList(machineId);
    expect(add2.ok).toBe(true);
    expect(st().ui.printList.length).toBe(1);

    st().togglePrintListItem(machineId);
    expect(st().ui.printList.length).toBe(0);

    st().togglePrintListItem(machineId);
    expect(st().ui.printList.length).toBe(1);
  });

  it('清空打印清单功能正常', () => {
    const st = () => useAppStore.getState();
    st().addToPrintList('mch_001');
    st().addToPrintList('mch_002');
    st().addToPrintList('mch_003');
    expect(st().ui.printList.length).toBe(3);

    st().clearPrintList();
    expect(st().ui.printList.length).toBe(0);
  });

  it('从打印清单移除单台机器功能正常', () => {
    const st = () => useAppStore.getState();
    st().addToPrintList('mch_001');
    st().addToPrintList('mch_002');
    expect(st().ui.printList.length).toBe(2);

    st().removeFromPrintList('mch_001');
    expect(st().ui.printList.length).toBe(1);
    expect(st().ui.printList.some(p => p.machineId === 'mch_001')).toBe(false);
    expect(st().ui.printList.some(p => p.machineId === 'mch_002')).toBe(true);
  });

  it('打印清单随 UI 状态持久化到 localStorage', () => {
    const st = () => useAppStore.getState();
    st().addToPrintList('mch_001');
    st().addToPrintList('mch_002');

    const stored = window.localStorage.getItem('laundry-store-v1');
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.state?.ui?.printList).toBeDefined();
    expect(parsed.state.ui.printList.length).toBe(2);
  });

  it('楼层筛选和打印清单状态刷新后不丢失', () => {
    const st = () => useAppStore.getState();

    st().addToPrintList('mch_001');
    st().addToPrintList('mch_002');

    const firstBuilding = MACHINES[0] ? (MACHINES[0].floorId ?? 'bld_001') : 'bld_001';
    st().selectBuilding(firstBuilding);
    st().selectFloor('flr_001');
    st().setStatusFilter('IDLE');

    const stored = window.localStorage.getItem('laundry-store-v1');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);

    expect(parsed.state.ui.printList.length).toBe(2);
    expect(parsed.state.ui.selectedStatusFilter).toBe('IDLE');
    expect(parsed.state.ui.selectedFloorId).toBe('flr_001');
    expect(parsed.state.ui.selectedBuildingId).toBe(firstBuilding);
  });

  it('打开/关闭打印预览弹窗功能正常', () => {
    const st = () => useAppStore.getState();

    expect(st().ui.showPrintPreview).toBe(false);
    st().openPrintPreview();
    expect(st().ui.showPrintPreview).toBe(true);
    st().closePrintPreview();
    expect(st().ui.showPrintPreview).toBe(false);
  });

  it('不存在的机器加入打印清单返回失败', () => {
    const st = () => useAppStore.getState();
    const addResult = st().addToPrintList('non_existent_machine');
    expect(addResult.ok).toBe(false);
    expect(addResult.reason).toContain('不存在');
  });
});
