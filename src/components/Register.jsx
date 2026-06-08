import React, { useState } from 'react';

export default function Register({ onRegisterSuccess, onToggleView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      onRegisterSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #1b0a0a 0%, #0c0404 100%)',
      padding: '20px'
    }}>
      <div className="glass-card" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '40px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '30px' }}>
          <span style={{
            fontSize: '32px',
            fontWeight: '900',
            background: 'linear-gradient(to right, #ff1e27, #e50914, #b20710)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '1px',
            textShadow: '0 0 30px rgba(229, 9, 20, 0.3)'
          }}>STREAMIFY</span>
          <span style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: '#fff',
            background: '#e50914',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 'bold',
            marginTop: '-10px'
          }}>BILLING</span>
        </div>

        <h2 style={{ fontSize: '20px', color: '#fff', fontWeight: '700', marginBottom: '8px' }}>Create Account</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>Register a new profile to start simulating subscription models.</p>

        {error && (
          <div style={{
            background: 'rgba(229, 9, 20, 0.15)',
            border: '1px solid rgba(229, 9, 20, 0.3)',
            color: '#ff4d5a',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#fff', marginBottom: '6px', fontWeight: '500' }}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. user@streamify.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              className="form-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#fff', marginBottom: '6px', fontWeight: '500' }}>Select Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#18181b',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="viewer">Viewer (Read-only)</option>
              <option value="billing_manager">Billing Manager</option>
              <option value="admin">Administrator (Full Access)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#fff', marginBottom: '6px', fontWeight: '500' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              className="form-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#fff', marginBottom: '6px', fontWeight: '500' }}>Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border 0.2s'
              }}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(to right, #ff1e27, #e50914)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(229, 9, 20, 0.3)',
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <button onClick={onToggleView} style={{
            background: 'none',
            border: 'none',
            color: '#ff1e27',
            fontWeight: '600',
            cursor: 'pointer',
            padding: 0
          }}>Sign In</button>
        </p>
      </div>
    </div>
  );
}
