import React from 'react';
import { BillingProvider } from './context/BillingContext';
import Navbar from './components/Navbar';
import DashboardStats from './components/DashboardStats';
import PlanPricing from './components/PlanPricing';
import CardManager from './components/CardManager';
import InvoiceReceipt from './components/InvoiceReceipt';
import SandboxConsole from './components/SandboxConsole';

function AppContent() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      paddingBottom: '60px'
    }} className="animate-fade-in no-print">
      
      {/* 1. Global Navigation */}
      <Navbar />

      {/* 2. Main Dashboard Area */}
      <div style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '30px'
      }}>
        
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
