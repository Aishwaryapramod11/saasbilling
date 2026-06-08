import React, { useContext } from 'react';
import { BillingContext } from '../context/BillingContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Tv, Download, Clock, ShieldAlert } from 'lucide-react';

const subscriberChartData = [
  { name: 'Jan', Subscribers: 12.5 }, // in millions
  { name: 'Feb', Subscribers: 14.2 },
  { name: 'Mar', Subscribers: 16.8 },
  { name: 'Apr', Subscribers: 19.5 },
  { name: 'May', Subscribers: 22.1 },
  { name: 'Jun', Subscribers: 25.8 }
];

export default function DashboardStats() {
  const { plan, usage, planLimits } = useContext(BillingContext);

  const limits = planLimits[plan];
  
  // Calculate Overage costs for extra downloads
  const calculateOverage = () => {
    let downloadOverageCost = 0;
    if (usage.downloads > limits.downloads) {
      // $0.10 per additional offline download
      downloadOverageCost = (usage.downloads - limits.downloads) * 0.10;
    }
    return {
      downloads: +downloadOverageCost.toFixed(2),
      total: +downloadOverageCost.toFixed(2)
    };
  };

  const overages = calculateOverage();

  // Progress calculations
  const screensPct = Math.min((usage.seats / limits.seats) * 100, 100);
  const downloadsPct = limits.downloads === 0 ? 0 : Math.min((usage.downloads / limits.downloads) * 100, 100);
  const hoursPct = Math.min((usage.hoursStreamed / 300) * 100, 100); // 300 hrs standard target

  return (
    <div className="stats-grid">
      {/* 1. USAGE METRICS CARD */}
      <div className="glass-panel stats-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Current Streaming Usage</span>
          <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'normal' }}>
            {plan} Plan
          </span>
        </h3>

        {/* Metric 1: Concurrent Screens */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tv size={14} color="var(--primary)" /> Active Streams (Screens)
            </span>
            <span style={{ fontWeight: '600' }}>
              {usage.seats} / {limits.seats} active
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${screensPct}%`,
              height: '100%',
              background: usage.seats > limits.seats ? 'var(--danger)' : 'linear-gradient(to right, var(--primary), var(--secondary))',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
          {usage.seats > limits.seats && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
              <ShieldAlert size={12} />
              <span>Screen Congestion: Too many active streams. Upgrade plan to unlock screens.</span>
            </div>
          )}
        </div>

        {/* Metric 2: Offline Downloads */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={14} color="var(--secondary)" /> Offline Downloads
            </span>
            <span style={{ fontWeight: '600' }}>
              {usage.downloads} / {limits.downloads === 1000 ? 'Unlimited' : limits.downloads}
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${limits.downloads === 1000 ? 100 : downloadsPct}%`,
              height: '100%',
              background: usage.downloads > limits.downloads ? 'var(--danger)' : 'linear-gradient(to right, var(--secondary), var(--success))',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
          {usage.downloads > limits.downloads && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
              <ShieldAlert size={12} />
              <span>Overage: +{usage.downloads - limits.downloads} downloads (₹{overages.downloads} fee)</span>
            </div>
          )}
        </div>

        {/* Metric 3: Streaming Hours */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="var(--success)" /> Watch Time (Hours)
            </span>
            <span style={{ fontWeight: '600' }}>
              {usage.hoursStreamed} hours this cycle
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: `${hoursPct}%`,
              height: '100%',
              background: 'var(--success)',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>
        </div>

        {/* Cost Overage Summary */}
        {overages.total > 0 && (
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }} className="animate-fade-in">
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Overage Download Fee (Next Bill):</span>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--danger)' }}>+₹{overages.total.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* 2. SUBSCRIBER GROWTH CHART */}
      <div className="glass-panel stats-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-secondary)' }}>Global Streamify Members Growth</h3>
          <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 'bold' }}>+106% Growth</span>
        </div>
        
        <div style={{ width: '100%', height: '200px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={subscriberChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit="M" />
              <Tooltip 
                contentStyle={{ background: '#0a0a0d', border: '1px solid var(--border-glass)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--text-muted)' }}
              />
              <Area type="monotone" dataKey="Subscribers" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSubscribers)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

  );
}
