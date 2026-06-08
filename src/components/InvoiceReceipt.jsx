import React, { useContext, useState } from 'react';
import { BillingContext } from '../context/BillingContext';
import { Check, AlertTriangle, Printer, X, Sparkles } from 'lucide-react';

export default function InvoiceReceipt() {
  const { invoices } = useContext(BillingContext);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Paid':
        return { bg: 'rgba(16, 185, 129, 0.12)', color: 'var(--success)', border: 'rgba(16, 185, 129, 0.25)' };
      case 'Failed':
        return { bg: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', border: 'rgba(239, 68, 68, 0.25)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: 'var(--border-glass)' };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getTax = (amount) => +(amount * 0.0825).toFixed(2); // 8.25% Sales Tax
  const getTotal = (amount) => +(amount + getTax(amount)).toFixed(2);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-secondary)' }}>Payment & Billing History</h3>

      {/* INVOICES TABLE */}
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 10px' }}>Invoice ID</th>
              <th style={{ padding: '12px 10px' }}>Date</th>
              <th style={{ padding: '12px 10px' }}>Description</th>
              <th style={{ padding: '12px 10px' }}>Amount</th>
              <th style={{ padding: '12px 10px' }}>Status</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Receipt</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '13px' }}>
            {invoices.map((inv) => {
              const statusData = getStatusStyle(inv.status);
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '14px 10px', color: '#fff', fontWeight: '600' }}>{inv.id}</td>
                  <td style={{ padding: '14px 10px', color: 'var(--text-secondary)' }}>{inv.date}</td>
                  <td style={{ padding: '14px 10px', color: 'var(--text-secondary)' }}>{inv.plan}</td>
                  <td style={{ padding: '14px 10px', color: '#fff', fontWeight: '700' }}>₹{inv.amount.toFixed(2)}</td>
                  <td style={{ padding: '14px 10px' }}>
                    <span style={{
                      background: statusData.bg,
                      color: statusData.color,
                      border: `1px solid ${statusData.border}`,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {inv.status === 'Paid' ? <Check size={10} /> : inv.status === 'Failed' ? <AlertTriangle size={10} /> : null}
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="glass-btn"
                      style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '6px' }}
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PRINTABLE RECEIPT PANEL */}
      {selectedInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(9, 13, 22, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '99999',
          padding: '16px'
        }}>
          <div className="glass-panel printable-invoice" style={{
            width: '100%',
            maxWidth: '520px',
            background: '#0d0d14',
            border: '1px solid var(--border-glass)',
            borderRadius: '16px',
            padding: '36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'relative',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
          }}>
            {/* Close button */}
            <button
              onClick={() => setSelectedInvoice(null)}
              className="no-print"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            {/* Logo & Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-glass)', paddingBottom: '18px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px', color: '#fff' }}>▶</div>
                  <span style={{ fontWeight: '800', fontSize: '15px', color: '#fff' }}>Streamify Inc.</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  800 Broad Street, Floor 14<br />New York, NY 10004<br />billing@streamify.com
                </p>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  background: getStatusStyle(selectedInvoice.status).bg,
                  color: getStatusStyle(selectedInvoice.status).color,
                  border: `1px solid ${getStatusStyle(selectedInvoice.status).border}`,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'inline-block',
                  marginBottom: '8px'
                }}>{selectedInvoice.status.toUpperCase()}</span>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{selectedInvoice.id}</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Billing Date: {selectedInvoice.date}</p>
              </div>
            </div>

            {/* Billed To */}
            <div>
              <h5 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Subscriber Info:</h5>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: '600' }}>Aishwarya R</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>Account Reference: stream-8861f5ef</p>
            </div>

            {/* Invoice Line Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)', padding: '16px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Streaming Service Description</span>
                <span>Subtotal</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                <span>{selectedInvoice.plan}</span>
                <span>₹{selectedInvoice.amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', fontSize: '12.5px' }}>
              <div style={{ display: 'flex', width: '180px', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span>₹{selectedInvoice.amount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', width: '180px', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>State Tax (8.25%):</span>
                <span>₹{getTax(selectedInvoice.amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', width: '180px', justifyContent: 'space-between', fontWeight: 'bold', color: '#fff', fontSize: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '6px', marginTop: '2px' }}>
                <span>Total Amount Paid:</span>
                <span>₹{getTotal(selectedInvoice.amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Payment gateway references */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '10px 14px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              <span>Transaction processed via billing partner. Payment Method: **{selectedInvoice.method}**. If you notice discrepancy, contact our helpdesk.</span>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }} className="no-print">
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={11} color="var(--primary)" /> Official payment slip
              </span>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="glass-btn"
                  onClick={() => setSelectedInvoice(null)}
                  style={{ padding: '8px 16px' }}
                >
                  Close
                </button>
                <button
                  className="glass-btn glass-btn-primary"
                  onClick={handlePrint}
                  style={{ padding: '8px 20px' }}
                >
                  <Printer size={14} /> Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
