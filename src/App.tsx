import { useCallback } from 'react';
import { useAppStore } from './store';
import Dashboard from './pages/Dashboard';
import AdminView from './pages/AdminView';
import Toasts from './components/common/Toasts';
import { useClockTicker } from './hooks/useCountdown';

export default function App() {
  const currentUser = useAppStore(s => s.getCurrentUser());
  const tick = useAppStore(s => s.tick);
  const onTick = useCallback(() => tick(), [tick]);
  useClockTicker(1000, onTick);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="text-amber-300 text-4xl mb-4">⚠</div>
          <h2 className="text-lg font-semibold mb-2">用户未找到</h2>
          <p className="text-sm text-slate-400 mb-6">当前数据可能已损坏或未初始化</p>
          <button
            onClick={() => useAppStore.getState().resetAll()}
            className="btn btn-primary"
          >
            重置所有数据
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100">
      {currentUser.role === 'ADMIN' ? <AdminView /> : <Dashboard />}
      <Toasts />
    </div>
  );
}
