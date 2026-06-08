import React, { createContext, useState, useEffect } from 'react';

export const BillingContext = createContext();

const initialInvoices = [
  { id: 'INV-1092', date: '2026-04-08', plan: 'Basic (Ads) Plan', amount: 5.99, status: 'Paid', method: 'Visa ending in 4242' },
  { id: 'INV-2041', date: '2026-05-08', plan: 'Standard (HD) Plan', amount: 15.49, status: 'Paid', method: 'Visa ending in 4242' },
  { id: 'INV-3184', date: '2026-06-08', plan: 'Standard (HD) Plan', amount: 15.49, status: 'Paid', method: 'Visa ending in 4242' }
];

export const BillingProvider = ({ children }) => {
  // 1. RBAC & Subscriptions
  const [role, setRole] = useState(() => localStorage.getItem('role') || 'admin');
  const [plan, setPlan] = useState(() => localStorage.getItem('plan') || 'Standard (HD)');
  const [billingCycle, setBillingCycle] = useState(() => localStorage.getItem('billingCycle') || 'monthly');
  const [subStatus, setSubStatus] = useState(() => localStorage.getItem('subStatus') || 'active');
  const [trialEnds, setTrialEnds] = useState('2026-07-08');

  // 2. Payment Methods
  const [cards, setCards] = useState(() => {
    const saved = localStorage.getItem('cards');
    return saved ? JSON.parse(saved) : [
      { id: 'c1', brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2028, cardholder: 'Aishwarya R', isDefault: true }
    ];
  });

  // 3. Usage & Metrics (streaming concurrent screens, downloaded episodes, hours watched)
  const [usage, setUsage] = useState(() => {
    const saved = localStorage.getItem('usage');
    return saved ? JSON.parse(saved) : {
      seats: 2,
      downloads: 42,
      hoursStreamed: 120
    };
  });

  // Limits based on streaming plans (stateful so Admin can edit them dynamically)
  const [planLimits, setPlanLimits] = useState(() => {
    const saved = localStorage.getItem('planLimits');
    return saved ? JSON.parse(saved) : {
      'Basic (Ads)': { seats: 1, downloads: 0, resolution: '720p HD Quality', price: 5.99 },
      'Standard (HD)': { seats: 2, downloads: 100, resolution: '1080p Full HD', price: 15.49 },
      'Premium (4K)': { seats: 6, downloads: 1000, resolution: '4K Ultra HD + HDR', price: 22.99 }
    };
  });

  const [yearlyDiscount, setYearlyDiscount] = useState(() => {
    const saved = localStorage.getItem('yearlyDiscount');
    return saved ? parseInt(saved) : 20;
  });

  // 4. Billing History & Audit Logs
  const [invoices, setInvoices] = useState(() => {
    const saved = localStorage.getItem('invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });
  
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('logs');
    return saved ? JSON.parse(saved) : [
      { id: 1, time: new Date().toLocaleTimeString(), message: 'System: Streamify streaming workspace initialized.' },
      { id: 2, time: new Date().toLocaleTimeString(), message: 'Streaming: Subscription plan active on Standard (HD) tier.' }
    ];
  });

  // Synchronize states to localStorage
  useEffect(() => { localStorage.setItem('role', role); }, [role]);
  useEffect(() => { localStorage.setItem('plan', plan); }, [plan]);
  useEffect(() => { localStorage.setItem('billingCycle', billingCycle); }, [billingCycle]);
  useEffect(() => { localStorage.setItem('subStatus', subStatus); }, [subStatus]);
  useEffect(() => { localStorage.setItem('cards', JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem('usage', JSON.stringify(usage)); }, [usage]);
  useEffect(() => { localStorage.setItem('planLimits', JSON.stringify(planLimits)); }, [planLimits]);
  useEffect(() => { localStorage.setItem('yearlyDiscount', yearlyDiscount.toString()); }, [yearlyDiscount]);
  useEffect(() => { localStorage.setItem('invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('logs', JSON.stringify(logs)); }, [logs]);

  // Helper to add audit logs
  const addLog = (message) => {
    setLogs(prev => [
      { id: Date.now(), time: new Date().toLocaleTimeString(), message },
      ...prev
    ]);
  };

  // Calculate plan prices with discount
  const getPlanPrice = (planName, cycle = billingCycle) => {
    const base = planLimits[planName].price;
    if (cycle === 'yearly') {
      return +(base * (1 - yearlyDiscount / 100)).toFixed(2);
    }
    return base;
  };

  // Pro-ration calculation: upgrade/downgrade mid-cycle
  const calculateProration = (targetPlan) => {
    if (plan === targetPlan) return { total: 0, credit: 0, newCharge: 0 };
    
    // Simulate day 15 of a 30-day billing cycle (50% remaining)
    const ratioRemaining = 0.50; 
    const currentPrice = getPlanPrice(plan);
    const newPrice = getPlanPrice(targetPlan);
    
    const credit = +(currentPrice * ratioRemaining).toFixed(2);
    const newCharge = +(newPrice * ratioRemaining).toFixed(2);
    const total = +(newCharge - credit).toFixed(2);

    return {
      credit,
      newCharge,
      total,
      daysRemaining: 15
    };
  };

  // Switch Plan with Pro-ration invoice injection
  const changePlan = (newPlan) => {
    console.log("BillingContext: changePlan triggered for plan:", newPlan, "Active role:", role);
    if (role === 'viewer') {
      console.warn("BillingContext: Rejected plan change because role is viewer");
      addLog(`Error: Viewer profile tried to modify subscription to ${newPlan}. Blocked.`);
      return { success: false, error: 'Access Denied: Read-only profile.' };
    }

    const { total, credit, newCharge } = calculateProration(newPlan);
    console.log("BillingContext: Proration calculated:", { total, credit, newCharge });
    const oldPlan = plan;
    setPlan(newPlan);
    setSubStatus('active');
    console.log("BillingContext: plan state successfully set to:", newPlan);

    // Create a pro-rated invoice if there's a charge
    if (total !== 0) {
      const invoiceId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const newInvoice = {
        id: invoiceId,
        date: new Date().toISOString().split('T')[0],
        plan: `Subscription Update: ${oldPlan} ➔ ${newPlan} (Pro-rated)`,
        amount: Math.abs(total),
        status: total > 0 ? 'Paid' : 'Refunded',
        method: (() => {
          const defaultCard = cards.find(c => c.isDefault);
          return defaultCard ? `${defaultCard.brand} ending in ${defaultCard.last4}` : 'System Credit';
        })()
      };
      setInvoices(prev => [newInvoice, ...prev]);
      addLog(`Streaming: Upgraded subscription from ${oldPlan} to ${newPlan}. Pro-rated charge: ₹${total}.`);
    } else {
      addLog(`Streaming: Shifted subscription to ${newPlan}. No adjustments.`);
    }

    // Auto-adjust active screens if they exceed new limits
    const limits = planLimits[newPlan];
    setUsage(prev => ({
      ...prev,
      seats: Math.min(prev.seats, limits.seats),
      downloads: Math.min(prev.downloads, limits.downloads)
    }));

    return { success: true };
  };

  // Add Credit Card
  const addCard = (cardDetails) => {
    if (role === 'viewer') return { success: false, error: 'Access Denied.' };
    
    const newCard = {
      id: `c-${Date.now()}`,
      brand: cardDetails.brand || 'Visa',
      last4: cardDetails.number.slice(-4),
      expMonth: parseInt(cardDetails.expMonth),
      expYear: parseInt(cardDetails.expYear),
      cardholder: cardDetails.cardholder || 'Cardholder',
      isDefault: cards.length === 0
    };
    
    setCards(prev => {
      const updated = cardDetails.isDefault 
        ? prev.map(c => ({ ...c, isDefault: false })).concat(newCard)
        : prev.concat(newCard);
      return updated;
    });

    addLog(`CardManager: Added new ${newCard.brand} ending in ${newCard.last4} as default.`);
    return { success: true };
  };

  const deleteCard = (id) => {
    if (role === 'viewer') return { success: false };
    const cardToDelete = cards.find(c => c.id === id);
    if (!cardToDelete) return { success: false };

    setCards(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (cardToDelete.isDefault && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });

    addLog(`CardManager: Removed payment method ${cardToDelete.brand} ending in ${cardToDelete.last4}.`);
    return { success: true };
  };

  const setDefaultCard = (id) => {
    if (role === 'viewer') return { success: false };
    setCards(prev => prev.map(c => ({
      ...c,
      isDefault: c.id === id
    })));
    const activeCard = cards.find(c => c.id === id);
    addLog(`CardManager: Changed billing card to ${activeCard?.brand} ending in ${activeCard?.last4}.`);
    return { success: true };
  };

  // --- SANDBOX SIMULATORS ---
  const simulatePaymentFailure = () => {
    setSubStatus('past_due');
    const invoiceId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const failedInvoice = {
      id: invoiceId,
      date: new Date().toISOString().split('T')[0],
      plan: `${plan} Subscription Renewal (Failed)`,
      amount: getPlanPrice(plan),
      status: 'Failed',
      method: (() => {
        const defaultCard = cards.find(c => c.isDefault);
        return defaultCard ? `${defaultCard.brand} ending in ${defaultCard.last4}` : 'No Card';
      })()
    };
    setInvoices(prev => [failedInvoice, ...prev]);
    addLog(`Sandbox: Subscription charge of ₹${getPlanPrice(plan)} failed. Access state set to Past Due.`);
  };

  const simulateUsageSpike = (enable = true) => {
    if (enable) {
      setUsage({
        seats: 4, // Exceeds Standard (HD) limit of 2 screens!
        downloads: 125, // Exceeds Standard (HD) limit of 100!
        hoursStreamed: 245
      });
      addLog('Sandbox: Simulated stream overage spike. Active screens exceeded maximum concurrent capacity.');
    } else {
      setUsage({
        seats: 2,
        downloads: 42,
        hoursStreamed: 120
      });
      addLog('Sandbox: Reset streaming usage metrics to normal.');
    }
  };

  const triggerCardExpiry = (enable = true) => {
    setCards(prev => prev.map(c => {
      if (c.isDefault) {
        return {
          ...c,
          expMonth: enable ? new Date().getMonth() + 1 : 12,
          expYear: enable ? new Date().getFullYear() : 2028
        };
      }
      return c;
    }));
    addLog(enable ? 'Sandbox: Set card expiration warning header active.' : 'Sandbox: Reset card expiration warnings.');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <BillingContext.Provider
      value={{
        role,
        setRole,
        plan,
        setPlan: changePlan,
        billingCycle,
        setBillingCycle,
        subStatus,
        setSubStatus,
        trialEnds,
        cards,
        addCard,
        deleteCard,
        setDefaultCard,
        usage,
        setUsage,
        planLimits,
        setPlanLimits,
        yearlyDiscount,
        setYearlyDiscount,
        invoices,
        logs,
        addLog,
        calculateProration,
        getPlanPrice,
        simulatePaymentFailure,
        simulateUsageSpike,
        triggerCardExpiry,
        clearLogs
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};
