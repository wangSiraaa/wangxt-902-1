import { useAppStore } from '../../store';
import type { MachineStatus } from '../../types';
import { Building, Filter } from 'lucide-react';

const STATUS_TABS: Array<{ key: MachineStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: '全部' },
  { key: 'IDLE', label: '空闲' },
  { key: 'IN_USE', label: '使用中' },
  { key: 'FAULT', label: '故障' },
];

export default function FilterBar() {
  const { buildings, floors } = useAppStore();
  const { selectedBuildingId, selectedFloorId, selectedStatusFilter } = useAppStore(s => s.ui);
  const selectBuilding = useAppStore(s => s.selectBuilding);
  const selectFloor = useAppStore(s => s.selectFloor);
  const setStatusFilter = useAppStore(s => s.setStatusFilter);

  const availFloors = selectedBuildingId
    ? floors.filter(f => f.buildingId === selectedBuildingId)
    : floors;

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
      </div>
    </div>
  );
}
