import React, { useContext, useState } from 'react';
import { BillingContext } from '../context/BillingContext';
import { Play, RotateCcw, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';

export default function SandboxConsole() {
  const {
    role,
    subStatus,
    setSubStatus,
    simulatePaymentFailure,
    simulateUsageSpike,
    triggerCardExpiry,
    logs,
    clearLogs
  } = useContext(BillingContext);

  const [spikeActive, setSpikeActive] = useState(false);
  const [expiryActive, setExpiryActive] = useState(false);

  const isAdmin = role === 'admin';

  const handleSpikeToggle = (e) => {
    if (!isAdmin) return;
    const checked = e.target.checked;
    setSpikeActive(checked);
    simulateUsageSpike(checked);
  };

  const handleExpiryToggle = (e) => {
    if (!isAdmin) return;
    const checked = e.target.checked;
    setExpiryActive(checked);
    triggerCardExpiry(checked);
  };

  const handleDeclineClick = () => {
    if (!isAdmin) return;
    simulatePaymentFailure();
  };

  const handleResetEnvironment = () => {
    if (!isAdmin) return;
    setSpikeActive(false);
    setExpiryActive(false);
    setSubStatus('active');
    simulateUsageSpike(false);
    triggerCardExpiry(false);
    clearLogs();
  };

  return (
    <div className="sandbox-grid">
      {/* 1. SIMULATOR PANEL */}
      <div className="glass-panel sandbox-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '320px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-secondary)' }}>Streamify Sandbox</h3>
          {isAdmin ? (
            <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={11} /> Admin Active
            </span>
          ) : (
            <span style={{ fontSize: '10px', background: 'rgba(229, 9, 20, 0.12)', color: 'var(--primary)', border: '1px solid rgba(229, 9, 20, 0.25)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={11} /> Locked (Admin Only)
            </span>
          )}
        </div>

        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Simulate typical streaming plan events to test warnings, account delinquency states, and pro-rated download overages.
        </p>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px', opacity: isAdmin ? 1 : 0.45 }}>
          {/* Action 1: Decline Payment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              disabled={!isAdmin}
              onClick={handleDeclineClick}
              className="glass-btn glass-btn-danger"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Play size={12} />
              <span>Simulate Payment Decline</span>
            </button>
            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
              Simulates card failure on renewal, sets status to Past Due, and locks account streaming.
            </span>
          </div>

          {/* Action 2: Concurrency spike */}
          <label style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '13px', cursor: isAdmin ? 'pointer' : 'not-allowed', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: '700', color: '#fff' }}>Screen Concurrency Spike</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulates 4 screens active on Standard</span>
            </div>
            <input
              type="checkbox"
              checked={spikeActive}
              disabled={!isAdmin}
              onChange={handleSpikeToggle}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
          </label>

          {/* Action 3: Expired card */}
          <label style={{ display: 'flex', alignItems: 'center', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '13px', cursor: isAdmin ? 'pointer' : 'not-allowed', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: '700', color: '#fff' }}>Simulate Expiring Card</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Forces card expiry header warnings</span>
            </div>
            <input
              type="checkbox"
              checked={expiryActive}
              disabled={!isAdmin}
              onChange={handleExpiryToggle}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Global Reset */}
        {isAdmin && (
          <button
            onClick={handleResetEnvironment}
            className="glass-btn"
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '10px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <RotateCcw size={12} />
            <span>Reset Account Sandbox</span>
          </button>
        )}
      </div>

      {/* 2. AUDIT FEED */}
      <div className="glass-panel sandbox-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-secondary)' }}>Live Subscription Audit Logs</h3>
          {logs.length > 0 && (
            <button
              onClick={clearLogs}
              style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '11.5px', cursor: 'pointer' }}
            >
              Clear Logs
            </button>
          )}
        </div>

        {/* Logs list */}
        <div style={{
          flexGrow: 1,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid var(--border-glass)',
          borderRadius: '10px',
          padding: '16px',
          fontFamily: 'monospace',
          fontSize: '11.5px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          maxHeight: '235px',
          minHeight: '180px'
        }}>
          {logs.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '12px' }}>No logs recorded in this session.</div>
          ) : (
            logs.map((log) => {
              const isError = log.message.includes('Error') || log.message.includes('Failed') || log.message.includes('Blocked');
              const isSuccess = log.message.includes('Added') || log.message.includes('Upgraded') || log.message.includes('Paid');
              return (
                <div key={log.id} style={{ display: 'flex', gap: '10px', lineBreak: 'anywhere' }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{log.time}]</span>
                  <span style={{
                    color: isError ? 'var(--danger)' : isSuccess ? 'var(--success)' : 'var(--text-secondary)'
                  }}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

