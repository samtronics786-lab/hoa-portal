import axios from 'axios';
import { useState } from 'react';
import { getApiBaseUrl } from '../config';

const apiBaseUrl = getApiBaseUrl();
const tunnelHeaders = { 'ngrok-skip-browser-warning': 'true' };

interface LoginProps {
  onLogin: (token: string, user: { id: string; email?: string; username?: string; mobileNumber?: string; role: string }) => void;
}

type LoginMode = 'staff' | 'homeowner';

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<LoginMode>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileCode, setMobileCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaPendingUser, setMfaPendingUser] = useState<{ id: string; email?: string; username?: string; role: string } | null>(null);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetState, setResetState] = useState<'idle' | 'requesting' | 'email-sent' | 'resetting' | 'done' | 'error'>('idle');

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) return err.response?.data?.message || fallback;
    return fallback;
  };

  const staffLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${apiBaseUrl}/auth/login`, { username, password }, { headers: tunnelHeaders });
      if (res.data.mfaRequired) {
        setMfaTempToken(res.data.tempToken);
        setMfaPendingUser(res.data.user);
        return;
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(getErrorMessage(err, 'Staff login failed.'));
    }
  };

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setDevCode('');
    try {
      const res = await axios.post(`${apiBaseUrl}/auth/homeowner/request-code`, { mobileNumber }, { headers: tunnelHeaders });
      setCodeRequested(true);
      if (res.data.developmentCode) setDevCode(res.data.developmentCode);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send mobile login code.'));
    }
  };

  const verifyHomeownerCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${apiBaseUrl}/auth/homeowner/verify-code`, { mobileNumber, code: mobileCode }, { headers: tunnelHeaders });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(getErrorMessage(err, 'Code verification failed.'));
    }
  };

  const verifyMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const res = await axios.post(`${apiBaseUrl}/auth/verify-mfa`, { tempToken: mfaTempToken, code: mfaCode }, { headers: tunnelHeaders });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(getErrorMessage(err, 'Verification failed.'));
    }
  };

  const requestReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetState('requesting');
    setError('');
    try {
      await axios.post(`${apiBaseUrl}/auth/request-password-reset`, { email: resetEmail }, { headers: tunnelHeaders });
      setResetState('email-sent');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to send reset email.'));
      setResetState('error');
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setResetState('resetting');
    try {
      await axios.post(`${apiBaseUrl}/auth/reset-password`, { token: resetToken, password: newPassword }, { headers: tunnelHeaders });
      setResetState('done');
      setShowReset(false);
      if (resetEmail) setUsername(resetEmail);
    } catch (err) {
      setError(getErrorMessage(err, 'Password reset failed.'));
      setResetState('error');
    }
  };

  const resetHomeownerFlow = () => {
    setCodeRequested(false);
    setMobileCode('');
    setDevCode('');
  };

  return (
    <div className="login-shell">
      <div className="login-frame">
        <section className="login-hero">
          <div className="hero-kicker mb-3">Single-Family HOA Operations</div>
          <h1 className="display-5 fw-semibold mb-3">Property and HOA Management Services in New Jersey.</h1>
          <p className="mb-4 text-white-50">
            A cleaner HOA experience for residents, board leaders, and administrators, with mobile access for homeowners and controlled staff operations.
          </p>

          <div className="demo-credentials">
            <div className="demo-item">
              <div className="small text-uppercase text-white-50">Super Admin</div>
              <div className="fw-semibold">superadmin / Admin123!</div>
            </div>
            <div className="demo-item">
              <div className="small text-uppercase text-white-50">Manager</div>
              <div className="fw-semibold">manager / Manager123!</div>
            </div>
            <div className="demo-item">
              <div className="small text-uppercase text-white-50">Homeowner</div>
              <div className="fw-semibold">Use registered mobile number</div>
            </div>
          </div>
        </section>

        <section className="login-card">
          <div className="section-title mb-4">
            <h2>{showReset ? 'Reset staff password' : mfaPendingUser ? 'Verify sign in' : mode === 'staff' ? 'Staff sign in' : codeRequested ? 'Enter mobile code' : 'Homeowner mobile sign in'}</h2>
            <span className="section-tag">Secure access</span>
          </div>

          {!showReset && !mfaPendingUser ? (
            <>
              <div className="dashboard-tabs mb-4">
                <button type="button" className={`dashboard-tab ${mode === 'staff' ? 'is-active' : ''}`} onClick={() => { setMode('staff'); setError(''); }}>
                  Staff
                </button>
                <button type="button" className={`dashboard-tab ${mode === 'homeowner' ? 'is-active' : ''}`} onClick={() => { setMode('homeowner'); setError(''); resetHomeownerFlow(); }}>
                  Homeowner
                </button>
              </div>

              {mode === 'staff' ? (
                <>
                  <p className="text-muted mb-4">Superadmins, managers, and staff use their username and password to access the operations portal.</p>
                  <form onSubmit={staffLogin} className="portal-form">
                    <div className="mb-3">
                      <label className="form-label">Username</label>
                      <input value={username} onChange={(e) => setUsername(e.target.value)} className="form-control" placeholder="manager" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Password</label>
                      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="form-control" placeholder="Enter your password" />
                    </div>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <button type="submit" className="btn portal-btn w-100">Enter Portal</button>
                  </form>

                  <button type="button" className="btn btn-link px-0 mt-3" onClick={() => { setShowReset(true); setResetEmail(username); }}>
                    Forgot your staff password?
                  </button>
                </>
              ) : (
                <>
                  <p className="text-muted mb-4">Homeowners sign in with their registered mobile number. We’ll text a 5-digit one-time login code to that number.</p>
                  {!codeRequested ? (
                    <form onSubmit={requestCode} className="portal-form">
                      <div className="mb-3">
                        <label className="form-label">Registered Mobile Number</label>
                        <input value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className="form-control" placeholder="(555) 100-0002" />
                      </div>
                      {error && <div className="alert alert-danger">{error}</div>}
                      <button type="submit" className="btn portal-btn w-100">Send Login Code</button>
                    </form>
                  ) : (
                    <form onSubmit={verifyHomeownerCode} className="portal-form">
                      <div className="mb-3">
                        <label className="form-label">5-Digit Login Code</label>
                        <input value={mobileCode} onChange={(e) => setMobileCode(e.target.value)} className="form-control" placeholder="Enter the code you received" />
                      </div>
                      {devCode ? <div className="alert alert-warning">Development code: <strong>{devCode}</strong></div> : null}
                      {error && <div className="alert alert-danger">{error}</div>}
                      <button type="submit" className="btn portal-btn w-100">Verify and Enter Portal</button>
                    </form>
                  )}

                  {codeRequested ? (
                    <button type="button" className="btn btn-link px-0 mt-3" onClick={resetHomeownerFlow}>
                      Use a different mobile number
                    </button>
                  ) : null}
                </>
              )}
            </>
          ) : mfaPendingUser ? (
            <>
              <p className="text-muted mb-4">A verification code has been sent to your staff email. Enter it below to finish signing in.</p>
              <form onSubmit={verifyMfa} className="portal-form">
                <div className="mb-3">
                  <label className="form-label">Verification Code</label>
                  <input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} className="form-control" placeholder="Enter the 6-digit code" />
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <button type="submit" className="btn portal-btn w-100">Verify and Enter Portal</button>
              </form>
              <button type="button" className="btn btn-link px-0 mt-3" onClick={() => { setMfaPendingUser(null); setMfaTempToken(''); setMfaCode(''); }}>
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <p className="text-muted mb-4">Staff password reset remains email-based. Request a token, then use it below to set a new password.</p>
              <form onSubmit={requestReset} className="portal-form">
                <div className="mb-3">
                  <label className="form-label">Staff Account Email</label>
                  <input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} type="email" className="form-control" placeholder="name@hoa.com" />
                </div>
                <button type="submit" className="btn portal-btn w-100" disabled={resetState === 'requesting'}>
                  {resetState === 'requesting' ? 'Sending email...' : 'Send Reset Email'}
                </button>
              </form>

              {resetState === 'email-sent' && <div className="alert alert-success mt-3">Reset email sent. Use the token from your inbox below.</div>}

              <form onSubmit={resetPassword} className="portal-form mt-3">
                <div className="mb-3">
                  <label className="form-label">Reset Token</label>
                  <input value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="form-control" placeholder="Paste reset token" />
                </div>
                <div className="mb-3">
                  <label className="form-label">New Password</label>
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" className="form-control" placeholder="Enter a new password" />
                </div>
                {resetState === 'done' && <div className="alert alert-success">Password updated. You can sign in now.</div>}
                {resetState === 'error' && <div className="alert alert-danger">{error || 'Password reset failed.'}</div>}
                <button type="submit" className="btn portal-btn w-100" disabled={resetState === 'resetting'}>
                  {resetState === 'resetting' ? 'Updating password...' : 'Update Password'}
                </button>
              </form>

              <button type="button" className="btn btn-link px-0 mt-3" onClick={() => setShowReset(false)}>
                Back to sign in
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
