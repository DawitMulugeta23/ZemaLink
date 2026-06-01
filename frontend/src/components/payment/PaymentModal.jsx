import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { paymentService } from '../../services/paymentService';

export default function PaymentModal({ isOpen, onClose, amount, itemName, itemType, itemId, onSuccess }) {
  const { isDark } = useTheme();
  const [method, setMethod] = useState(null);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('choose');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMethod(null);
      setPhase('choose');
      setError('');
      setBusy(false);
      setCardName('');
      setCardNumber('');
      setExpiry('');
      setCvv('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen && phase !== 'success') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, phase, onClose]);

  if (!isOpen) return null;

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const handleChapaPay = async () => {
    setBusy(true);
    setError('');
    try {
      let res;
      if (itemType === 'song') res = await paymentService.initiateSongPurchase(itemId);
      else if (itemType === 'subscription') res = await paymentService.initiateSubscription(itemName);
      else if (itemType === 'ticket') res = await paymentService.initiateTicketPurchase(itemId);

      if (res?.success && res?.checkout_url) {
        setPhase('success');
        if (onSuccess) onSuccess(res);
        window.open(res.checkout_url, '_blank');
      } else {
        setError(res?.message || 'Failed to initiate payment');
      }
    } catch (err) {
      setError(err?.message || 'Payment service unavailable');
    } finally {
      setBusy(false);
    }
  };

  const handleMockPay = async (e) => {
    e.preventDefault();
    setError('');
    const raw = cardNumber.replace(/\s/g, '');
    if (raw.length < 12) { setError('Card number must be at least 12 digits'); return; }
    if (!cardName.trim()) { setError('Cardholder name is required'); return; }
    if (expiry.length < 5) { setError('Enter a valid expiry date'); return; }
    if (cvv.length < 3) { setError('Enter a valid CVV'); return; }

    setBusy(true);
    try {
      let res;
      if (itemType === 'song') res = await paymentService.mockPurchaseSong(itemId);
      else if (itemType === 'ticket') res = await paymentService.mockPurchaseTicket(itemId);
      else res = { success: true };

      if (res?.success) {
        setPhase('success');
        if (onSuccess) onSuccess(res);
      } else {
        setError(res?.message || 'Mock payment failed');
      }
    } catch (err) {
      setError(err?.message || 'Payment service error');
    } finally {
      setBusy(false);
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && phase !== 'success') onClose();
  };

  const displayAmount = amount != null ? `$${Number(amount).toFixed(2)}` : '';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-slide-up transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/90 border-white/10 backdrop-blur-2xl'
            : 'bg-white/90 border-slate-200 backdrop-blur-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            phase === 'success'
              ? 'text-green-400/70 hover:bg-green-500/10'
              : isDark ? 'text-slate-500 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'
          }`}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {phase === 'success' ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl shadow-green-500/30 animate-bounce-in">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Payment Successful!</h3>
            <p className={`text-sm mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {itemName && <>You now own <strong>{itemName}</strong></>}
            </p>
            {displayAmount && (
              <p className={`text-lg font-semibold mb-6 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{displayAmount}</p>
            )}
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-purple-500/25"
            >
              Done
            </button>
          </div>
        ) : phase === 'choose' ? (
          <div className="p-6 md:p-8">
            <div className="text-center mb-6">
              <div className={`mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-amber-500 flex items-center justify-center shadow-xl shadow-purple-500/30`}>
                <span className="text-3xl">{itemType === 'subscription' ? '\u{1F4B3}' : '\u{1F3B5}'}</span>
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Complete Purchase</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{itemName}</p>
              {displayAmount && (
                <p className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayAmount}</p>
              )}
            </div>

            <div className="space-y-3">
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Select Payment Method
              </p>

              <button
                onClick={() => { setMethod('chapa'); handleChapaPay(); }}
                disabled={busy}
                className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center gap-4 ${
                  isDark
                    ? 'bg-slate-800/50 border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5'
                    : 'bg-slate-50 border-slate-200 hover:border-purple-400/50 hover:bg-purple-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  CH
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Pay with Chapa</p>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Online payment via Chapa</p>
                </div>
                {busy && method === 'chapa' ? (
                  <svg className="animate-spin h-5 w-5 text-purple-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => { setMethod('mock'); setPhase('form'); }}
                disabled={busy}
                className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center gap-4 ${
                  isDark
                    ? 'bg-slate-800/50 border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5'
                    : 'bg-slate-50 border-slate-200 hover:border-amber-400/50 hover:bg-amber-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  M
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Mock Payment</p>
                  <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Test payment simulation</p>
                </div>
                <svg className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {error && (
              <div className={`mt-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
                isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 md:p-8">
            <div className="text-center mb-6">
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Mock Payment</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{itemName}</p>
              {displayAmount && (
                <p className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayAmount}</p>
              )}
            </div>

            <form onSubmit={handleMockPay} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cardholder Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    isDark
                      ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Card Number</label>
                <input
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                    isDark
                      ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      isDark
                        ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
                <div className="w-28">
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                      isDark
                        ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {error && (
                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                  isDark ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setPhase('choose'); setError(''); }}
                  disabled={busy}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
                    isDark
                      ? 'border-white/10 text-slate-300 hover:bg-white/5'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                    isDark
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/25'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/25'
                  }`}
                >
                  {busy ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : `Pay ${displayAmount || ''}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
