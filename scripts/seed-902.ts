#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const seedPath = resolve(__dirname, '..', 'src', 'seed', 'seed-902.json');
const seedData = JSON.parse(readFileSync(seedPath, 'utf-8'));

function printBusinessNumbers() {
  const bn = seedData.businessNumbers;

  console.log('========================================');
  console.log('  自助洗衣机占用看板 - Seed 902 业务编号');
  console.log('========================================\n');

  console.log(`[SEED_VERSION] ${seedData.seedVersion}`);
  console.log(`[GENERATED_AT] ${seedData.generatedAt}\n`);

  console.log(`[TOTAL_MACHINES] ${bn.totalMachines} 台机器`);
  console.log(`[IDLE_MACHINES] (${bn.idleMachineCodes.length}) ${bn.idleMachineCodes.join(', ')}`);
  console.log(`[IN_USE_MACHINES] (${bn.inUseMachineCodes.length}) ${bn.inUseMachineCodes.join(', ')}`);
  console.log(`[FAULT_MACHINES] (${bn.faultMachineCodes.length}) ${bn.faultMachineCodes.join(', ')}\n`);

  console.log(`[PRINT_LIST_COUNT] ${bn.printListCount} 台待打印`);
  const printCodes = seedData.printList
    .map((p: { machineId: string }) => {
      const m = seedData.machines.find((x: { id: string }) => x.id === p.machineId);
      return m?.code ?? p.machineId;
    })
    .join(', ');
  console.log(`[PRINT_LIST_CODES] ${printCodes}\n`);

  console.log(`[QUEUE_COUNT] ${bn.queueCount} 条排队记录`);
  console.log(`[BUILDINGS] ${seedData.buildings.length} 栋楼`);
  console.log(`[FLOORS] ${seedData.floors.length} 个楼层`);
  console.log(`[USERS] ${seedData.users.length} 位用户\n`);

  console.log('--- 筛选预设 ---');
  const ui = seedData.uiSelected;
  const b = seedData.buildings.find((x: { id: string }) => x.id === ui.selectedBuildingId);
  const f = seedData.floors.find((x: { id: string }) => x.id === ui.selectedFloorId);
  console.log(`[SELECTED_BUILDING] ${b?.name ?? '全部'}`);
  console.log(`[SELECTED_FLOOR] ${f ? `${f.floorNumber}楼` : '全部'}`);
  console.log(`[SELECTED_STATUS] ${ui.selectedStatusFilter}\n`);

  console.log('--- 业务编号清单 ---');
  for (const m of seedData.machines) {
    const floor = seedData.floors.find((x: { id: string }) => x.id === m.floorId);
    const building = seedData.buildings.find((x: { id: string }) => x.id === floor?.buildingId);
    const inPrint = seedData.printList.some((p: { machineId: string }) => p.machineId === m.id);
    const q = seedData.queueEntries.filter((e: { machineId: string }) => e.machineId === m.id).length;
    const parts = [
      m.code,
      m.status,
      `${building?.name ?? ''}${floor ? `·${floor.floorNumber}F` : ''}`,
      inPrint ? 'PRINT' : '',
      q > 0 ? `Q${q}` : '',
    ].filter(Boolean);
    console.log(`  [MACHINE] ${parts.join(' | ')}`);
  }

  console.log('\n========================================');
}

printBusinessNumbers();
