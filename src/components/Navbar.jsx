import React, { useContext } from 'react';
import { BillingContext } from '../context/BillingContext';
import { Shield, CreditCard, Eye, AlertTriangle, LogOut } from 'lucide-react';

export default function Navbar() {
  const { role, user, logout, subStatus, cards, plan } = useContext(BillingContext);

  const rolesList = [
    { value: 'admin', label: 'Admin', icon: Shield, color: 'var(--primary)' },
    { value: 'billing_manager', label: 'Billing Manager', icon: CreditCard, color: 'var(--secondary)' },
    { value: 'viewer', label: 'Viewer', icon: Eye, color: 'var(--text-muted)' }
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
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.organizationName || 'Consumer Family Subscription'}</p>
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

        {/* User profile Role & Session info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user?.email || 'default'}`} 
                alt="Role Avatar" 
                style={{ width: '100%', height: '100%', borderRadius: '50%' }} 
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{user?.email}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <IconComponent size={12} style={{ color: activeRoleData.color }} />
                <span style={{ fontSize: '11px', fontWeight: '700', color: activeRoleData.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeRoleData.label}
                </span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button 
            onClick={logout}
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'background 0.2s, border 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(229, 9, 20, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(229, 9, 20, 0.4)';
              e.currentTarget.style.color = '#ff4d5a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
