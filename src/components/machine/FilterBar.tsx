import { useAppStore } from '../../store';
import type { MachineStatus } from '../../types';
import { Filter, Printer, ListChecks, Trash2, Plus } from 'lucide-react';

const STATUS_TABS: Array<{ key: MachineStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'IDLE', label: '空闲' },
  { key: 'IN_USE', label: '使用中' },
  { key: 'FAULT', label: '故障' },
];

export default function FilterBar() {
  const { buildings, floors } = useAppStore();
  const { selectedBuildingId, selectedFloorId, selectedStatusFilter, printList } = useAppStore(s => s.ui);
  const selectBuilding = useAppStore(s => s.selectBuilding);
  const selectFloor = useAppStore(s => s.selectFloor);
  const setStatusFilter = useAppStore(s => s.setStatusFilter);
  const openPrintPreview = useAppStore(s => s.openPrintPreview);
  const clearPrintList = useAppStore(s => s.clearPrintList);
  const addToPrintList = useAppStore(s => s.addToPrintList);
  const getFilteredMachines = useAppStore(s => s.getFilteredMachines);
  const showToast = useAppStore(s => s.showToast);

  const availFloors = selectedBuildingId
    ? floors.filter(f => f.buildingId === selectedBuildingId)
    : floors;

  const handleAddFiltered = () => {
    const filtered = getFilteredMachines();
    const nonFault = filtered.filter(m => m.status !== 'FAULT');
    if (nonFault.length === 0) {
      showToast('error', '当前筛选结果没有可加入打印清单的机器');
      return;
    }
    let added = 0;
    for (const m of nonFault) {
      if (!printList.some(p => p.machineId === m.id)) {
        addToPrintList(m.id);
        added++;
      }
    }
    if (added === 0) {
      showToast('info', '这些机器已经在打印清单中了');
    }
  };

  return (
    <div className="glass-card p-4 md:p-5 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Filter size={16} className="text-teal-400" />
          <span className="font-medium">筛选条件</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">楼栋</label>
            <select
              value={selectedBuildingId ?? ''}
              onChange={e => selectBuilding(e.target.value || null)}
              className="input !py-2"
            >
              <option value="">全部楼栋</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1.5">楼层</label>
            <select
              value={selectedFloorId ?? ''}
              onChange={e => selectFloor(e.target.value || null)}
              className="input !py-2"
            >
              <option value="">全部楼层</option>
              {availFloors.map(f => {
                const b = buildings.find(b => b.id === f.buildingId);
                return (
                  <option key={f.id} value={f.id}>{b ? b.name + ' · ' : ''}{f.floorNumber}楼</option>
                );
              })}
            </select>
          </div>

          <div className="col-span-2 md:col-span-1 flex items-end">
            <div className="w-full flex flex-wrap gap-1 p-1 rounded-xl bg-slate-900/40 border border-slate-700/30">
              {STATUS_TABS.map(t => (
                <div
                  key={t.key}
                  onClick={() => setStatusFilter(t.key)}
                  className={`tab-item flex-1 text-center ${selectedStatusFilter === t.key ? 'active' : ''}`}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:ml-auto border-t lg:border-t-0 lg:border-l border-slate-700/30 lg:pl-4 pt-3 lg:pt-0">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/40 border border-slate-700/30">
            <ListChecks size={15} className={printList.length > 0 ? 'text-teal-400' : 'text-slate-500'} />
            <span className="text-sm">
              打印清单
              <span className={`ml-1.5 font-semibold tabular-nums ${printList.length > 0 ? 'text-teal-300' : 'text-slate-500'}`}>
                {printList.length}
              </span>
            </span>
          </div>

          <button
            onClick={handleAddFiltered}
            className="btn btn-secondary !py-2 !px-3 text-xs flex items-center gap-1.5"
            title="将当前筛选结果中的非故障机器加入打印清单"
          >
            <Plus size={14} />
            加入筛选
          </button>

          <button
            onClick={clearPrintList}
            disabled={printList.length === 0}
            className="btn btn-danger !py-2 !px-3 text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="清空打印清单"
          >
            <Trash2 size={14} />
            清空
          </button>

          <button
            onClick={openPrintPreview}
            disabled={printList.length === 0}
            className="btn btn-primary !py-2 !px-3 text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="预览并打印清单"
          >
            <Printer size={14} />
            打印清单
          </button>
        </div>
      </div>
    </div>
  );
}

