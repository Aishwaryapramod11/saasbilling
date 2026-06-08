import React, { useContext, useState } from 'react';
import { BillingContext } from '../context/BillingContext';
import { CreditCard, Trash2, CheckCircle, Plus, EyeOff } from 'lucide-react';

export default function CardManager() {
  const { role, cards, addCard, deleteCard, setDefaultCard } = useContext(BillingContext);

  const [formOpen, setFormOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cardholder, setCardholder] = useState('');
  const [cvc, setCvc] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-detect brand from card prefix
  const detectBrand = (num) => {
    const raw = num.replace(/\s+/g, '');
    if (raw.startsWith('4')) return 'Visa';
    if (raw.startsWith('5')) return 'Mastercard';
    if (raw.startsWith('3')) return 'Amex';
    return 'Generic';
  };

  // Format card input with space separators
  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // digit only
    const parts = [];
    for (let i = 0; i < value.length; i += 4) {
      parts.push(value.substring(i, i + 4));
    }
    setNumber(parts.join(' ').substring(0, 19)); // max 16 digits + 3 spaces
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const rawNumber = number.replace(/\s+/g, '');
    if (rawNumber.length < 15) {
      setError('Please enter a valid credit card number.');
      return;
    }
    if (!expMonth || parseInt(expMonth) < 1 || parseInt(expMonth) > 12) {
      setError('Expiration month must be between 1 and 12.');
      return;
    }
    const currentYear = new Date().getFullYear() % 100; // 26
    const inputYear = parseInt(expYear);
    if (!expYear || inputYear < currentYear) {
      setError('Card must not be expired.');
      return;
    }
    if (!cvc || cvc.length < 3) {
      setError('CVC code is invalid.');
      return;
    }

    const brand = detectBrand(rawNumber);
    const res = addCard({
      number: rawNumber,
      brand,
      expMonth,
      expYear: 2000 + inputYear,
      cardholder,
      isDefault
    });

    if (res.success) {
      setSuccess(true);
      // Reset form
      setNumber('');
      setExpMonth('');
      setExpYear('');
      setCardholder('');
      setCvc('');
      setIsDefault(false);
      
      setTimeout(() => {
        setSuccess(false);
        setFormOpen(false);
      }, 1000);
    } else {
      setError(res.error || 'Failed to register card.');
    }
  };

  const getCardIcon = (brand) => {
    switch (brand) {
      case 'Visa':
        return <span style={{ color: '#0057b7', fontWeight: 'bold', fontSize: '18px', fontStyle: 'italic', fontFamily: 'serif' }}>Visa</span>;
      case 'Mastercard':
        return <span style={{ color: '#eb001b', fontWeight: 'bold', fontSize: '15px' }}>MC</span>;
      case 'Amex':
        return <span style={{ color: '#007bc1', fontWeight: 'bold', fontSize: '15px' }}>Amex</span>;
      default:
        return <CreditCard size={18} />;
    }
  };

  const isViewer = role === 'viewer';

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-secondary)' }}>Registered Cards</h3>
        {!formOpen && (
          <button
            disabled={isViewer}
            onClick={() => setFormOpen(true)}
            className="glass-btn glass-btn-primary"
            style={{ padding: '6px 12px', fontSize: '12.5px' }}
            title={isViewer ? 'Viewer role is read-only' : 'Add Card'}
          >
            <Plus size={14} /> Add Card
          </button>
        )}
      </div>

      {/* 1. CARDS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {cards.map((card) => {
          const isExpiring = card.expMonth === new Date().getMonth() + 1 && card.expYear === new Date().getFullYear();
          return (
            <div
              key={card.id}
              style={{
                border: card.isDefault ? '1px solid var(--border-active)' : '1px solid var(--border-glass)',
                background: 'rgba(255,255,255,0.01)',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                position: 'relative'
              }}
            >
              {/* Card Brand & Number Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '56px',
                  height: '38px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                  {getCardIcon(card.brand)}
                </div>
                
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '700', color: '#fff' }}>•••• •••• •••• {card.last4}</span>
                    {card.isDefault && (
                      <span style={{ fontSize: '9px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--secondary)', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '1px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                        Default
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>Exp: {card.expMonth.toString().padStart(2, '0')}/{card.expYear}</span>
                    <span>Holder: {card.cardholder}</span>
                  </div>
                  {isExpiring && (
                    <span style={{ color: 'var(--danger)', fontSize: '10px', fontWeight: 'bold', display: 'block', marginTop: '4px' }}>
                      ⚠️ Expiring soon
                    </span>
                  )}
                </div>
              </div>

              {/* Card Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {!card.isDefault && (
                  <button
                    disabled={isViewer}
                    onClick={() => setDefaultCard(card.id)}
                    className="glass-btn"
                    style={{ padding: '5px 10px', fontSize: '11px' }}
                  >
                    Set Default
                  </button>
                )}
                <button
                  disabled={isViewer}
                  onClick={() => deleteCard(card.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: isViewer ? 'var(--text-muted)' : 'var(--text-muted)',
                    cursor: isViewer ? 'not-allowed' : 'pointer',
                    padding: '4px'
                  }}
                  className={!isViewer ? 'glass-btn-danger-icon' : ''}
                  title="Remove card"
                >
                  <Trash2 size={15} style={{ color: isViewer ? 'inherit' : 'var(--danger)' }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. ADD PAYMENT FORM */}
      {formOpen && (
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }} className="animate-fade-in">
          <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>Add Card Details</h4>
          
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 12px', borderRadius: '6px', color: '#fca5a5', fontSize: '12px', marginBottom: '14px' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 12px', borderRadius: '6px', color: '#a7f3d0', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} /> Card added successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cardholder Name</label>
              <input
                type="text"
                className="glass-input"
                value={cardholder}
                onChange={(e) => setCardholder(e.target.value)}
                placeholder="Aishwarya R"
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Card Number</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="glass-input"
                  value={number}
                  onChange={handleCardNumberChange}
                  placeholder="4111 2222 3333 4444"
                  style={{ width: '100%', paddingRight: '40px' }}
                  required
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                  {detectBrand(number)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expiry Month</label>
                <input
                  type="number"
                  className="glass-input"
                  value={expMonth}
                  onChange={(e) => setExpMonth(e.target.value.substring(0, 2))}
                  placeholder="MM (1-12)"
                  required
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Expiry Year</label>
                <input
                  type="number"
                  className="glass-input"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value.substring(0, 2))}
                  placeholder="YY (e.g. 28)"
                  required
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CVC Code</label>
                <input
                  type="password"
                  className="glass-input"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                  placeholder="•••"
                  required
                />
              </div>
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', margin: '6px 0' }}>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <span>Set as Default Payment Card</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="glass-btn"
                onClick={() => setFormOpen(false)}
                style={{ padding: '6px 14px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glass-btn glass-btn-secondary"
                style={{ padding: '6px 18px' }}
              >
                Save Card
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
