import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { getApiBaseUrl } from './config';

interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  mobileNumber?: string;
  role: string;
  status?: string;
  mfaEnabled?: boolean;
}

const apiBaseUrl = getApiBaseUrl();
const tunnelHeaders = { 'ngrok-skip-browser-warning': 'true' };

function formatRole(role: string) {
  return role.replace(/_/g, ' ');
}

function roleLabel(role: string) {
  if (role === 'board_member') return 'Board Portal';
  if (['super_admin', 'management_admin', 'community_manager', 'admin_staff'].includes(role)) return 'Management Portal';
  return 'Homeowner Portal';
}

function accountLabel(user: AuthUser) {
  return user.username || user.email || user.mobileNumber || 'User';
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  if (!token || !user) {
    return <Login onLogin={(t, nextUser) => { setToken(t); setUser(nextUser); }} />;
  }

  const logout = async () => {
    try {
      await axios.post(`${apiBaseUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}`, ...tunnelHeaders }
      });
    } catch (error) {
      console.error(error);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <div className="portal-app">
      <div className="container">
        <div className="portal-shell">
          <div className="portal-header-band">
            <div className="portal-header-content">
              <div>
                <div className="portal-brand-name">Deans Pond HOA</div>
                <div className="portal-brand-subtitle">Community operations portal</div>
              </div>

              <div className="portal-header-actions">
                <div className="portal-account-block">
                  <div className="portal-account-label">Account</div>
                  <div className="fw-semibold">{accountLabel(user)}</div>
                  <div className="small text-white-50">{formatRole(user.role)}</div>
                </div>
                <button className="btn portal-btn-secondary portal-logout-btn" onClick={logout}>
                  Logout
                </button>
              </div>
            </div>
          </div>

          <main className="portal-main">
            <div className="portal-topbar">
              <div>
                <div className="text-uppercase small text-muted mb-2">{roleLabel(user.role)}</div>
                <h1 className="portal-heading mb-2">Professional Community Operations</h1>
                <div className="text-muted">A resident-first workspace modeled on modern HOA management service portals.</div>
              </div>
              <div className="portal-topbar-note">Property and HOA Management Services in New Jersey</div>
            </div>

            <Routes>
              <Route path="/dashboard" element={<Dashboard user={user} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
