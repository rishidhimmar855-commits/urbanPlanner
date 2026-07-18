import { useCityStore } from '../store/useCityStore';
import type { AppView } from '../types';
import { OverviewDashboard } from './OverviewDashboard';
import { PlanningDesk } from './PlanningDesk';
import { ReportsPage } from './ReportsPage';
import {
  IconCube,
  IconLogout,
  IconOverview,
  IconReports,
} from './Icons';

const NAV: { id: AppView; label: string; hint: string; Icon: typeof IconOverview }[] = [
  { id: 'overview', label: 'Overview', hint: 'Projects & impact', Icon: IconOverview },
  { id: 'visualize', label: '3D Visualize', hint: 'City map & amenities', Icon: IconCube },
  { id: 'reports', label: 'Reports', hint: 'Analytics & export', Icon: IconReports },
];

export function AppShell() {
  const user = useCityStore((s) => s.user);
  const activeView = useCityStore((s) => s.activeView);
  const setActiveView = useCityStore((s) => s.setActiveView);
  const logout = useCityStore((s) => s.logout);
  const projectName = useCityStore((s) => s.project?.name);

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <span className="sidebar-mark" aria-hidden>
            UV
          </span>
          <div>
            <strong>UrbanVision</strong>
            <span>Smart City Mission</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
              aria-current={activeView === item.id ? 'page' : undefined}
            >
              <span className="sidebar-link-icon">
                <item.Icon size={18} />
              </span>
              <span className="sidebar-link-text">
                <span className="sidebar-link-label">{item.label}</span>
                <span className="sidebar-link-hint">{item.hint}</span>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <p className="eyebrow">
              {activeView === 'overview' && 'Mission desk'}
              {activeView === 'visualize' && 'Spatial planning'}
              {activeView === 'reports' && 'Evidence & analytics'}
            </p>
            <h1 className="topbar-title">
              {activeView === 'overview' && 'Overview'}
              {activeView === 'visualize' && (projectName ?? '3D visualization')}
              {activeView === 'reports' && 'Reports'}
            </h1>
          </div>

          <div className="topbar-right">
            <div className="topbar-profile">
              <div className="avatar" aria-hidden>
                {user?.name?.charAt(0) ?? 'G'}
              </div>
              <div className="topbar-profile-meta">
                <strong>{user?.name ?? 'Officer'}</strong>
                <span>
                  {user?.role} · {user?.department}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm topbar-logout"
                onClick={logout}
                aria-label="Log out"
              >
                <IconLogout size={16} />
                <span className="topbar-logout-label">Log out</span>
              </button>
            </div>
          </div>
        </header>

        <div className="app-content">
          {activeView === 'overview' && <OverviewDashboard />}
          {activeView === 'visualize' && <PlanningDesk />}
          {activeView === 'reports' && <ReportsPage />}
        </div>
      </div>
    </div>
  );
}
