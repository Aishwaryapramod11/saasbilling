import React, { useContext, useState } from 'react';
import { BillingProvider, BillingContext } from './context/BillingContext';
import Navbar from './components/Navbar';
import DashboardStats from './components/DashboardStats';
import PlanPricing from './components/PlanPricing';
import CardManager from './components/CardManager';
import InvoiceReceipt from './components/InvoiceReceipt';
import SandboxConsole from './components/SandboxConsole';
import Login from './components/Login';
import Register from './components/Register';

function AppContent() {
  const { token, login, loading } = useContext(BillingContext);
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'

  // 1. Loading State
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1b0a0a 0%, #0c0404 100%)',
        gap: '20px',
        color: '#fff'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '4px solid rgba(229, 9, 20, 0.1)',
          borderTopColor: '#e50914',
          animation: 'spin 1s linear infinite'
        }} className="spinner-loader" />
        <span style={{ fontSize: '14px', letterSpacing: '1px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Syncing Session data...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 2. Authentication Gate
  if (!token) {
    if (authView === 'register') {
      return (
        <Register
          onRegisterSuccess={(jwtToken, user) => login(jwtToken, user)}
          onToggleView={() => setAuthView('login')}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={(jwtToken, user) => login(jwtToken, user)}
        onToggleView={() => setAuthView('register')}
      />
    );
  }

  // 3. Full Dashboard View
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      paddingBottom: '60px'
    }}>
      
      {/* Global Navigation */}
      <Navbar />

      {/* Main Dashboard Area */}
      <div style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px'
      }} className="animate-fade-in no-print">
        
        {/* Section A: Pricing Tiers & Subscription Selection */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Choose Streaming Plan</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Select a Streamify subscription tier that fits your family viewing preferences. Cancel or change plans anytime.</p>
          </div>
          <PlanPricing />
        </section>

        {/* Section B: Resource Usage & Area Charts */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Streaming Usage & Stats</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Track active device screens, offline downloads, and global membership metrics.</p>
          </div>
          <DashboardStats />
        </section>

        {/* Section C: Cards & Payment Methods + Invoice History */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Payment Methods</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage your saved credit cards for default billing cycles.</p>
            </div>
            <CardManager />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Invoice Log</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Inspect and print invoices billed to your account during your subscription lifetime.</p>
            </div>
            <InvoiceReceipt />
          </div>
        </section>

        {/* Section D: Simulation Control Console */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Simulation & Audit Sandbox</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Trigger simulated screen overloads, declined payments, expiring cards, and view live audit feeds.</p>
          </div>
          <SandboxConsole />
        </section>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <BillingProvider>
      <AppContent />
    </BillingProvider>
  );
}
