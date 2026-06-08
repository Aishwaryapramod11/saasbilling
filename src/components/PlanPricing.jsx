import React, { useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BillingContext } from '../context/BillingContext';
import { Check, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';

export default function PlanPricing() {
  const {
    role,
    plan,
    setPlan,
    billingCycle,
    setBillingCycle,
    planLimits,
    setPlanLimits,
    yearlyDiscount,
    setYearlyDiscount,
    calculateProration,
    getPlanPrice,
    cards
  } = useContext(BillingContext);

  const [confirmModal, setConfirmModal] = useState(null);

  const plansList = [
    {
      name: 'Basic (Ads)',
      description: 'Stream our catalog with light ad breaks. Best for individual users.',
      features: ['1 Active Screen', '720p HD Video Quality', 'No Offline Downloads', 'Ad-Supported catalog']
    },
    {
      name: 'Standard (HD)',
      description: 'Ad-free streaming with downloads. Perfect for couples or roommates.',
      features: ['2 Active Screens', '1080p Full HD Quality', '100 Downloads / mo', 'Ad-Free streaming', 'High Quality audio'],
      popular: true
    },
    {
      name: 'Premium (4K)',
      description: 'Maximum resolution and spatial sound. Ultimate tier for families.',
      features: ['6 Active Screens (Family)', '4K Ultra HD + HDR video', 'Unlimited Offline Downloads', 'Ad-Free streaming', 'Dolby Atmos Spatial Audio']
    }
  ];

  const handlePlanClick = (targetPlan) => {
    console.log("PlanPricing: handlePlanClick triggered for targetPlan:", targetPlan, "Current role:", role, "Current plan:", plan);
    if (role === 'viewer') {
      console.warn("PlanPricing: Blocked plan click because role is viewer");
      return;
    }
    if (plan === targetPlan) {
      console.log("PlanPricing: Click ignored because target plan is already active");
      return;
    }
    setConfirmModal(targetPlan);
  };

  const [editedPrice, setEditedPrice] = useState(0);
  const [editedDiscount, setEditedDiscount] = useState(0);
  const [editedSeats, setEditedSeats] = useState(0);
  const [editedDownloads, setEditedDownloads] = useState(0);
  const [editedResolution, setEditedResolution] = useState('');

  // Sync edited states when modal opens
  useEffect(() => {
    if (confirmModal && planLimits[confirmModal]) {
      const pData = planLimits[confirmModal];
      setEditedPrice(pData.price);
      setEditedDiscount(yearlyDiscount);
      setEditedSeats(pData.seats);
      setEditedDownloads(pData.downloads);
      setEditedResolution(pData.resolution);
    }
  }, [confirmModal, planLimits, yearlyDiscount]);

  const handleConfirmChange = () => {
    console.log("PlanPricing: handleConfirmChange triggered for plan:", confirmModal);
    if (!confirmModal) return;

    // Save changes to planLimits and yearlyDiscount in BillingContext if admin
    if (role === 'admin') {
      setPlanLimits(prev => ({
        ...prev,
        [confirmModal]: {
          price: parseFloat(editedPrice),
          seats: parseInt(editedSeats),
          downloads: parseInt(editedDownloads),
          resolution: editedResolution
        }
      }));
      setYearlyDiscount(parseInt(editedDiscount));
    }

    setPlan(confirmModal);
    setConfirmModal(null);
  };

  let proration = { credit: 0, newCharge: 0, total: 0 };
  let prorationError = null;

  if (confirmModal) {
    try {
      // Calculate dynamic proration based on edited price/discount values
      const ratioRemaining = 0.50; 
      const currentPrice = getPlanPrice(plan);
      
      const targetBasePrice = parseFloat(editedPrice) || 0;
      let targetPrice = targetBasePrice;
      if (billingCycle === 'yearly') {
        targetPrice = +(targetBasePrice * (1 - (parseInt(editedDiscount) || 0) / 100)).toFixed(2);
      }
      
      const credit = +(currentPrice * ratioRemaining).toFixed(2);
      const newCharge = +(targetPrice * ratioRemaining).toFixed(2);
      const total = +(newCharge - credit).toFixed(2);

      proration = {
        credit,
        newCharge,
        total,
        daysRemaining: 15
      };
    } catch (e) {
      prorationError = e.message;
      console.error("PlanPricing: Proration calculation failed:", e);
    }
  }

  const activeCard = cards ? cards.find(c => c.isDefault) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* 1. BILLING CYCLE SELECTOR */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{
          display: 'inline-flex',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-glass)',
          padding: '4px',
          borderRadius: '10px'
        }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 18px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: billingCycle === 'monthly' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              boxShadow: billingCycle === 'monthly' ? 'var(--indigo-glow)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Billed Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            style={{
              padding: '8px 18px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              background: billingCycle === 'yearly' ? 'var(--primary)' : 'transparent',
              color: '#fff',
              boxShadow: billingCycle === 'yearly' ? 'var(--indigo-glow)' : 'none',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>Billed Annually</span>
            <span style={{ fontSize: '9px', background: 'var(--secondary)', color: '#090d16', padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold' }}>
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* 2. PRICING GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
        {plansList.map((p) => {
          const isCurrent = plan === p.name;
          const limits = planLimits[p.name];
          const price = getPlanPrice(p.name);
          const isViewer = role === 'viewer';
          
          return (
            <div
              key={p.name}
              className={`glass-panel ${p.popular ? 'pulse-border' : 'glass-panel-hover'}`}
              style={{
                padding: '30px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                background: p.popular ? 'rgba(229, 9, 20, 0.04)' : 'var(--bg-card)',
                height: '100%',
                minHeight: '420px'
              }}
            >
              {p.popular && (
                <span style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '24px',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  boxShadow: 'var(--indigo-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Sparkles size={10} /> RECOMMENDED
                </span>
              )}

              {/* Plan Header */}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>{p.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '20px', minHeight: '40px' }}>
                  {p.description}
                </p>

                {/* Plan Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
                  <span style={{ fontSize: '32px', fontWeight: '900', color: '#fff' }}>₹{price}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>

                {/* Features Checklist */}
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
                  {p.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Check size={14} color="var(--secondary)" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Subscribe button */}
              <div>
                <button
                  disabled={isCurrent || isViewer}
                  onClick={() => handlePlanClick(p.name)}
                  className={`glass-btn ${isCurrent ? '' : p.popular ? 'glass-btn-primary' : 'glass-btn-secondary'}`}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    opacity: isViewer ? 0.4 : 1
                  }}
                  title={isViewer ? 'Viewer profile is read-only' : isCurrent ? 'Current Plan' : `Change plan to ${p.name}`}
                >
                  {isCurrent 
                    ? 'Current Plan' 
                    : role === 'viewer' 
                      ? 'Buy Subscription' 
                      : role === 'billing_manager' 
                        ? 'Update Subscription' 
                        : 'Change Subscription'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. PRO-RATION MODAL DIALOG */}
      {confirmModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'rgba(7, 7, 10, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '999999',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '460px',
            maxHeight: 'calc(100vh - 42px)',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)' }}>
              <Sparkles size={22} />
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Confirm Plan Adjustment</h2>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              You are updating your subscription from **{plan}** to **{confirmModal}** mid-cycle. The Streamify billing system has calculated your adjustments for the remaining **15 days** of the current billing cycle:
            </p>

            {prorationError ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '16px', color: '#fca5a5', fontSize: '13px', lineHeight: '1.4' }}>
                <strong>Calculation Error:</strong> {prorationError}
              </div>
            ) : (
              /* proration breakdown table */
              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Unused credit ({plan}):</span>
                  <span style={{ color: 'var(--success)' }}>-₹{proration.credit.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>Prorated charge ({confirmModal}):</span>
                  <span style={{ color: '#fff' }}>+₹{proration.newCharge.toFixed(2)}</span>
                </div>
                <hr style={{ border: 'none', borderBottom: '1px dashed var(--border-glass)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14.5px' }}>
                  <span style={{ color: '#fff' }}>Charged Today:</span>
                  <span style={{ color: 'var(--secondary)' }}>₹{proration.total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Admin Override Settings */}
            {role === 'admin' && (
              <div style={{ borderTop: '1px dashed var(--border-glass)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🔧 Admin: Override Tiers & Price
                </h4>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Base Price (₹/mo)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="glass-input"
                      value={editedPrice}
                      onChange={(e) => setEditedPrice(parseFloat(e.target.value) || 0)}
                      style={{ padding: '6px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Yearly Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="glass-input"
                      value={editedDiscount}
                      onChange={(e) => setEditedDiscount(parseInt(e.target.value) || 0)}
                      style={{ padding: '6px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Max Active Screens</label>
                    <input
                      type="number"
                      min="1"
                      className="glass-input"
                      value={editedSeats}
                      onChange={(e) => setEditedSeats(parseInt(e.target.value) || 1)}
                      style={{ padding: '6px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Downloads Limit / mo</label>
                    <input
                      type="number"
                      min="0"
                      className="glass-input"
                      value={editedDownloads}
                      onChange={(e) => setEditedDownloads(parseInt(e.target.value) || 0)}
                      style={{ padding: '6px 10px', fontSize: '12.5px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Video Resolution</label>
                  <select
                    className="glass-input"
                    value={editedResolution}
                    onChange={(e) => setEditedResolution(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '12.5px', background: '#0a0a0d', color: '#fff' }}
                  >
                    <option value="720p HD Quality">720p HD Quality</option>
                    <option value="1080p Full HD">1080p Full HD</option>
                    <option value="4K Ultra HD + HDR">4K Ultra HD + HDR</option>
                    <option value="8K Extreme Cinema">8K Extreme Cinema</option>
                  </select>
                </div>
              </div>
            )}

            {/* payment default card reference */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <HelpCircle size={14} />
              {activeCard ? (
                <span>Payment will be billed to: **{activeCard.brand} ending in {activeCard.last4}**</span>
              ) : (
                <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>Alert: No payment cards registered. Subscription will accrue to account balance.</span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                className="glass-btn"
                onClick={() => setConfirmModal(null)}
                style={{ padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                className="glass-btn glass-btn-primary"
                disabled={!!prorationError}
                onClick={handleConfirmChange}
                style={{ padding: '8px 20px' }}
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
