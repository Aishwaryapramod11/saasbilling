import React, { createContext, useState, useEffect, useCallback } from 'react';

export const BillingContext = createContext();

export const BillingProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  
  // Derived state from user object
  const [role, setRole] = useState('viewer');
  const [plan, setPlanState] = useState('Basic (Ads)');
  const [billingCycle, setBillingCycleState] = useState('monthly');
  const [subStatus, setSubStatus] = useState('active');
  const [trialEnds, setTrialEnds] = useState('2026-07-08');
  const [usage, setUsage] = useState({ seats: 1, downloads: 0, hoursStreamed: 0 });
  const [yearlyDiscount, setYearlyDiscountState] = useState(20);

  // Lists loaded from API
  const [cards, setCards] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [planLimits, setPlanLimits] = useState({
    'Basic (Ads)': { seats: 1, downloads: 0, resolution: '720p HD Quality', price: 5.99 },
    'Standard (HD)': { seats: 2, downloads: 100, resolution: '1080p Full HD', price: 15.49 },
    'Premium (4K)': { seats: 6, downloads: 1000, resolution: '4K Ultra HD + HDR', price: 22.99 }
  });

  const [loading, setLoading] = useState(true);

  // Helper: Get Request Headers
  const getHeaders = useCallback(() => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, [token]);

  // --- API FETCHERS ---

  const fetchLimits = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/limits');
      if (response.ok) {
        const data = await response.json();
        if (data.planLimits) {
          setPlanLimits(data.planLimits);
        }
      }
    } catch (err) {
      console.error('Fetch limits failed:', err);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/auth/me', { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setRole(data.role);
        setPlanState(data.plan);
        setBillingCycleState(data.billingCycle);
        setSubStatus(data.subStatus);
        setTrialEnds(data.trialEnds);
        setUsage({
          seats: data.seats,
          downloads: data.downloads,
          hoursStreamed: data.hoursStreamed
        });
        setYearlyDiscountState(data.yearlyDiscount);
      } else {
        // Token expired/invalid, clear session
        logout();
      }
    } catch (err) {
      console.error('Fetch user failed:', err);
    }
  }, [token, getHeaders]);

  const fetchCards = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/cards', { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      }
    } catch (err) {
      console.error('Fetch cards failed:', err);
    }
  }, [token, getHeaders]);

  const fetchInvoices = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/invoices', { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error('Fetch invoices failed:', err);
    }
  }, [token, getHeaders]);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/logs', { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Fetch logs failed:', err);
    }
  }, [token, getHeaders]);

  // Load all user session data when token is available
  useEffect(() => {
    const loadSession = async () => {
      setLoading(true);
      await fetchLimits();
      if (token) {
        await fetchUserData();
        await fetchCards();
        await fetchInvoices();
        await fetchLogs();
      }
      setLoading(false);
    };
    loadSession();
  }, [token, fetchUserData, fetchCards, fetchInvoices, fetchLogs, fetchLimits]);

  // Session controllers
  const login = (jwtToken, userDetails) => {
    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userDetails);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setRole('viewer');
    setCards([]);
    setInvoices([]);
    setLogs([]);
  };

  // --- BILLING / PLAN LOGIC ---

  // Get plan price after applying discount (if yearly)
  const getPlanPrice = (planName, cycle = billingCycle) => {
    if (!planLimits[planName]) return 0;
    const base = planLimits[planName].price;
    if (cycle === 'yearly') {
      return +(base * (1 - yearlyDiscount / 100)).toFixed(2);
    }
    return base;
  };

  // Calculate real-time proration based on current plan prices
  const calculateProration = (targetPlan) => {
    if (plan === targetPlan) return { total: 0, credit: 0, newCharge: 0 };
    const ratioRemaining = 0.50; // Day 15 of 30
    const currentPrice = getPlanPrice(plan);
    const newPrice = getPlanPrice(targetPlan);
    const credit = +(currentPrice * ratioRemaining).toFixed(2);
    const newCharge = +(newPrice * ratioRemaining).toFixed(2);
    const total = +(newCharge - credit).toFixed(2);
    return { credit, newCharge, total, daysRemaining: 15 };
  };

  // Submit checkout/switch request to backend
  const changePlan = async (newPlan, targetCycle = billingCycle) => {
    try {
      const response = await fetch('/api/billing/plan', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ newPlan, cycle: targetCycle })
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Plan change failed.' };
      }

      await fetchUserData();
      await fetchInvoices();
      await fetchLogs();
      return { success: true };
    } catch (err) {
      console.error('Change plan request failed:', err);
      return { success: false, error: 'Network communication failure.' };
    }
  };

  // Switch billing cycle (updates state via server plan endpoint)
  const setBillingCycle = async (newCycle) => {
    await changePlan(plan, newCycle);
  };

  // Admin-only: Save modified master pricing limits
  const savePlanLimits = async (updatedLimits, discountRate) => {
    try {
      const response = await fetch('/api/billing/limits', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          planLimits: updatedLimits,
          yearlyDiscount: discountRate
        })
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to update plan configurations.' };
      }

      await fetchLimits();
      await fetchUserData();
      await fetchLogs();
      return { success: true };
    } catch (err) {
      console.error('Save limits failed:', err);
      return { success: false, error: 'Network communication failure.' };
    }
  };

  // --- CARDS CRUD ---

  const addCard = async (cardDetails) => {
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(cardDetails)
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to save card.' };
      }

      await fetchCards();
      await fetchLogs();
      return { success: true };
    } catch (err) {
      console.error('Add card failed:', err);
      return { success: false, error: 'Network communication failure.' };
    }
  };

  const deleteCard = async (id) => {
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to delete card.' };
      }

      await fetchCards();
      await fetchLogs();
      return { success: true };
    } catch (err) {
      console.error('Delete card failed:', err);
      return { success: false };
    }
  };

  const setDefaultCard = async (id) => {
    try {
      const response = await fetch(`/api/cards/${id}/default`, {
        method: 'POST',
        headers: getHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to set default card.' };
      }

      await fetchCards();
      await fetchLogs();
      return { success: true };
    } catch (err) {
      console.error('Set default card failed:', err);
      return { success: false };
    }
  };

  // --- SANDBOX SIMULATORS ---

  const simulatePaymentFailure = async () => {
    try {
      const response = await fetch('/api/sandbox/decline', {
        method: 'POST',
        headers: getHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Error: ${data.error}`);
        return;
      }

      await fetchUserData();
      await fetchInvoices();
      await fetchLogs();
    } catch (err) {
      console.error('Simulate payment failure failed:', err);
    }
  };

  const simulateUsageSpike = async (enable = true) => {
    try {
      const response = await fetch('/api/sandbox/spike', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ enable })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Error: ${data.error}`);
        return;
      }

      await fetchUserData();
      await fetchLogs();
    } catch (err) {
      console.error('Simulate usage spike failed:', err);
    }
  };

  const triggerCardExpiry = async (enable = true) => {
    try {
      const response = await fetch('/api/sandbox/expiry', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ enable })
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Error: ${data.error}`);
        return;
      }

      await fetchCards();
      await fetchLogs();
    } catch (err) {
      console.error('Simulate card expiry failed:', err);
    }
  };

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/logs', {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const data = await response.json();
        alert(`Error: ${data.error}`);
        return;
      }

      await fetchLogs();
    } catch (err) {
      console.error('Clear logs failed:', err);
    }
  };

  return (
    <BillingContext.Provider
      value={{
        token,
        login,
        logout,
        user,
        role,
        plan,
        setPlan: changePlan,
        billingCycle,
        setBillingCycle,
        subStatus,
        trialEnds,
        usage,
        cards,
        addCard,
        deleteCard,
        setDefaultCard,
        planLimits,
        setPlanLimits: savePlanLimits, // binds admin limits modification
        yearlyDiscount,
        setYearlyDiscount: (d) => savePlanLimits(planLimits, d),
        invoices,
        logs,
        calculateProration,
        getPlanPrice,
        simulatePaymentFailure,
        simulateUsageSpike,
        triggerCardExpiry,
        clearLogs,
        loading
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};
