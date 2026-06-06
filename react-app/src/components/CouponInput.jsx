import React, { useState } from 'react';
import { useCoupon } from '../hooks/useCoupon';
import { Ticket, X, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CouponInput = ({ cartTotal, franchiseId, customerId, onDiscountApplied }) => {
  const [code, setCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { validateAndApplyCoupon, loading } = useCoupon();

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    const result = await validateAndApplyCoupon(code, cartTotal, franchiseId, customerId);

    if (result.valid) {
      setAppliedCoupon(result.coupon);
      setSuccessMsg(`✓ ${result.coupon.code} applied — you save ₹${result.discount.toFixed(2)}!`);
      toast.success('Coupon applied successfully!');
      if (onDiscountApplied) {
        onDiscountApplied(result);
      }
    } else {
      setErrorMsg(result.error);
    }
  };

  const handleRemove = () => {
    setAppliedCoupon(null);
    setCode('');
    setSuccessMsg('');
    setErrorMsg('');
    if (onDiscountApplied) {
      onDiscountApplied({ valid: false, discount: 0, finalAmount: cartTotal, coupon: null });
    }
  };

  return (
    <div className="w-full space-y-3 p-4 bg-white shadow-lg rounded-xl border border-gray-100 transition-all duration-300">
      <div className="flex items-center gap-2 mb-1">
        <Ticket size={20} className="text-blue-500" />
        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Promotional Coupon</h3>
      </div>

      {!appliedCoupon ? (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type code (e.g. SAVE1000)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={loading}
            className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all uppercase font-black"
          />
          <button
            onClick={handleApply}
            disabled={loading || !code.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold px-6 py-2 rounded-lg transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'APPLY'
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-green-700 font-black">
            <CheckCircle2 size={18} />
            <span className="tracking-widest">{appliedCoupon.code} ACTIVE</span>
          </div>
          <button
            onClick={handleRemove}
            className="p-1 hover:bg-red-50 rounded-full transition-colors text-red-400 hover:text-red-500"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {successMsg && (
        <p className="text-xs text-green-600 font-bold ml-1 animate-in fade-in transition-all">
          {successMsg}
        </p>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 text-xs text-red-500 font-bold ml-1 animate-in shake-x duration-300">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};

export default CouponInput;
