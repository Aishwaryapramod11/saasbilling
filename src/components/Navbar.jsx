import React, { useContext } from 'react';
import { BillingContext } from '../context/BillingContext';
import { Shield, CreditCard, Eye, AlertTriangle } from 'lucide-react';

export default function Navbar() {
  const { role, setRole, subStatus, cards, plan } = useContext(BillingContext);

  const rolesList = [
    { value: 'admin', label: 'Admin (Account Owner)', icon: Shield, color: 'var(--primary)' },
    { value: 'billing_manager', label: 'Billing Manager', icon: CreditCard, color: 'var(--secondary)' },
    { value: 'viewer', label: 'Viewer (Family Member)', icon: Eye, color: 'var(--text-muted)' }
  ];

  // Check if default card is expiring soon
  const defaultCard = cards.find(c => c.isDefault);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const isExpiringSoon = defaultCard && 
    (defaultCard.expYear === currentYear && defaultCard.expMonth === currentMonth);

  const getStatusBadge = () => {
    switch (subStatus) {
      case 'active':
        return <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Active</span>;
      case 'past_due':
        return <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Past Due</span>;
      case 'unpaid':
        return <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>Suspended</span>;
      default:
        return null;
    }
  };

  const activeRoleData = rolesList.find(r => r.value === role) || rolesList[0];
  const IconComponent = activeRoleData.icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%' }}>
      {/* 1. WARNING BANNERS */}
      {subStatus === 'past_due' && (
        <div style={{ background: 'rgba(229, 9, 20, 0.15)', borderBottom: '1px solid rgba(229, 9, 20, 0.3)', color: '#fda4af', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: '600' }} className="animate-fade-in">
          <AlertTriangle size={16} color="var(--primary)" />
          <span>Renewal Failed! Your credit card was declined. Update your billing details immediately to restore ad-free streaming services.</span>
        </div>
      )}
      
      {isExpiringSoon && subStatus === 'active' && (
        <div style={{ background: 'rgba(245, 158, 11, 0.15)', borderBottom: '1px solid rgba(245, 158, 11, 0.3)', color: '#fcd34d', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', fontWeight: '600' }} className="animate-fade-in">
          <AlertTriangle size={16} />
          <span>Card Expiration warning: Your billing card ({defaultCard.brand} ending in {defaultCard.last4}) expires this month. Update it to prevent interruption to your streaming service.</span>
        </div>
      )}

      {/* 2. MAIN NAVBAR */}
      <div className="glass-panel" style={{
        borderRadius: '0 0 16px 16px',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        zIndex: '99',
        borderTop: 'none'
      }}>
        {/* Branding Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--indigo-glow)',
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#fff'
          }}>
            ▶
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Streamify Billing
            </h1>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Consumer Family Subscription</p>
          </div>
        </div>

        {/* Plan / Status info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#fff' }}>{plan}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Subscription Status</span>
          </div>
          {getStatusBadge()}
        </div>

        {/* User profile Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            border: `2px solid ${activeRoleData.color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 15px ${activeRoleData.color}40`,
            padding: '2px'
          }}>
            <img 
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${role}`} 
              alt="Role Avatar" 
              style={{ width: '100%', height: '100%', borderRadius: '50%' }} 
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              View Profile Role
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <IconComponent size={14} style={{ position: 'absolute', left: '10px', color: activeRoleData.color }} />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '6px 12px 6px 30px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {rolesList.map(r => (
                  <option key={r.value} value={r.value} style={{ background: '#0a0a0d', color: '#fff' }}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
