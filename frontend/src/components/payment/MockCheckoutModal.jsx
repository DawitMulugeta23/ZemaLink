import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function MockCheckoutModal({ isOpen, onClose, itemType, itemId, itemName, amount, onSuccess, busy: externalBusy, onPay }) {
  const { isDark } = useTheme();
  const [accountNumber, setAccountNumber] = useState('');
  const [bankPassword, setBankPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isBusy = busy || externalBusy;

  useEffect(() => {
    if (isOpen) {
      setAccountNumber('');
      setBankPassword('');
      setPhone('');
      setError('');
      setSuccess(false);
      setBusy(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && isOpen && !success) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, success, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!accountNumber.trim()) { setError('Account number is required'); return; }
    if (!bankPassword.trim() && !phone.trim()) { setError('Bank password or phone number is required'); return; }

    setBusy(true);
    try {
      const accountData = {
        account_number: accountNumber.trim(),
        bank_password: bankPassword.trim(),
        phone: phone.trim(),
      };
      if (onPay) {
        await onPay(accountData);
      }
      setSuccess(true);
      if (onSuccess) onSuccess({ success: true });
    } catch (err) {
      setError(err?.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !success) onClose();
  };

  const displayAmount = amount != null ? `${Number(amount).toFixed(2)} ETB` : '';

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
            success
              ? 'text-green-400/70 hover:bg-green-500/10'
              : isDark ? 'text-slate-500 hover:bg-white/10' : 'text-slate-400 hover:bg-slate-100'
          }`}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {success ? (
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
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-primary-500/25"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Mock Bank Payment</h2>
              <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{itemName}</p>
              {displayAmount && (
                <p className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{displayAmount}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Account Number
                </label>
                <input
                  type="text"
                  placeholder="0132123456 / 1000234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isDark
                      ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Bank Password
                </label>
                <input
                  type="password"
                  placeholder="test1234"
                  value={bankPassword}
                  onChange={(e) => setBankPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isDark
                      ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`} />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className={`px-2 ${isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>
                    or
                  </span>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Phone Number <span className={`${isDark ? 'text-slate-500' : 'text-slate-400'}`}>(alternative)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+251912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 ${
                    isDark
                      ? 'bg-slate-800/50 border-white/10 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
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
                  onClick={onClose}
                  disabled={isBusy}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
                    isDark
                      ? 'border-white/10 text-slate-300 hover:bg-white/5'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                    isDark
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/25'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/25'
                  }`}
                >
                  {isBusy ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : 'Pay by Mock'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
