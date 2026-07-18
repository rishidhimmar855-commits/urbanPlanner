import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useCityStore } from '../store/useCityStore';
import { saveUser } from '../utils/projectPersistence';
import type { GovUser } from '../types';
import { IconCube, IconOverview, IconReports } from './Icons';

const DEMO_USERS: Omit<GovUser, 'id'>[] = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@urban.gov.in',
    role: 'planner',
    department: 'Urban Development',
  },
  {
    name: 'Rajesh Patel',
    email: 'rajesh.patel@urban.gov.in',
    role: 'reviewer',
    department: 'Planning Commission',
  },
  {
    name: 'Admin Desk',
    email: 'admin@urban.gov.in',
    role: 'admin',
    department: 'Smart City Mission',
  },
];

export function Login() {
  const login = useCityStore((s) => s.login);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<GovUser['role']>('planner');
  const [department, setDepartment] = useState('Urban Development');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Enter your name and official email to continue.');
      return;
    }
    setError(null);
    const user: GovUser = {
      id: uuidv4(),
      name: name.trim(),
      email: email.trim(),
      role,
      department: department.trim() || 'Urban Development',
    };
    saveUser(user);
    login(user);
  };

  const quickLogin = (demo: Omit<GovUser, 'id'>) => {
    const user: GovUser = { ...demo, id: uuidv4() };
    saveUser(user);
    login(user);
  };

  return (
    <div className="login-screen">
      <div className="login-layout">
        <section className="login-brand" aria-label="About UrbanVision">
          <p className="eyebrow">Smart City Mission</p>
          <h1>UrbanVision</h1>
          <p className="login-brand-lede">
            Plan balanced cities on real land maps — brief, visualize, and export evidence for
            review.
          </p>
          <ul className="login-points">
            <li>
              <strong>
                <IconOverview size={14} /> Overview
              </strong>
              <span>Track projects, population targets, and budget impact</span>
            </li>
            <li>
              <strong>
                <IconCube size={14} /> 3D Visualize
              </strong>
              <span>Place amenities and compare plan options on the map</span>
            </li>
            <li>
              <strong>
                <IconReports size={14} /> Reports
              </strong>
              <span>Review analytics and export a decision pack</span>
            </li>
          </ul>
        </section>

        <section className="login-panel" aria-label="Sign in">
          <header className="login-header">
            <h2>Officer sign in</h2>
            <p className="login-lede">Use your credentials, or pick a demo account below.</p>
          </header>

          <form className="form-stack" onSubmit={handleLogin} noValidate>
            <label className="field">
              <span>Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                autoComplete="name"
                required
              />
            </label>
            <label className="field">
              <span>Official email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@urban.gov.in"
                autoComplete="email"
                required
              />
            </label>
            <div className="form-row-2">
              <label className="field">
                <span>Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value as GovUser['role'])}>
                  <option value="planner">Planner</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="field">
                <span>Department</span>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Urban Development"
                />
              </label>
            </div>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block btn-lg">
              Sign in to dashboard
            </button>
          </form>

          <div className="login-divider">
            <span>Or continue as demo</span>
          </div>

          <div className="demo-logins">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                className="demo-btn"
                onClick={() => quickLogin(u)}
              >
                <span className="demo-avatar" aria-hidden>
                  {u.name.charAt(0)}
                </span>
                <span className="demo-copy">
                  <strong>{u.name}</strong>
                  <span>
                    {u.role} · {u.department}
                  </span>
                </span>
                <span className="demo-cta">Use</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
