import { useState, useCallback } from 'react';
import { db, getTenantPath } from '../firebaseConfig';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';

/**
 * Custom hook for coupon management and validation in the billing module.
 * 
 * @returns {Object} Coupon states and handler functions.
 */
export const useCoupon = () => {
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    
    // Get current user info for branch/admin specific filtering
    const currentUserUID = sessionStorage.getItem('fb_user_uid');
    const userRole = sessionStorage.getItem('fb_user_role');
    const currentUserAdminUID = sessionStorage.getItem('fb_user_admin_uid');

    /**
     * Applies a coupon based on the provided subtotal.
     * Validates against Firestore: isActive, expiryDate, usageLimit, and minOrderValue.
     * 
     * BULK COUPON VALIDATION NOTE:
     * Bulk codes generated via the BulkCouponForm inherently pass through this exact logic.
     * Since bulk codes are stored with a usageLimit = 1, the standard validation (usedCount >= usageLimit)
     * effectively ensures they are single-use per customer. No special hook adjustments are required!
     * 
     * @param {number} subtotal - The current bill subtotal before tax/discounts.
     */
    const applyCoupon = async (subtotal) => {
        if (!subtotal || subtotal <= 0) {
            setCouponError('Cart is empty');
            return;
        }

        if (!couponCode.trim()) {
            setCouponError('Please enter a coupon code');
            return;
        }

        if (appliedCoupon) {
            setCouponError('A coupon is already applied');
            return;
        }

        try {
            setCouponError('');
            const normalizedCode = couponCode.trim().toUpperCase();
            
            const path = getTenantPath('coupons');
            const q = query(
                collection(db, path), 
                where('code', '==', normalizedCode),
                where('isActive', '==', true)
            );
            
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setCouponError('Invalid coupon code');
                setAppliedCoupon(null);
                setCouponDiscount(0);
                return;
            }

            const couponDoc = querySnapshot.docs[0];
            const couponData = { id: couponDoc.id, ...couponDoc.data() };
            
            // Strictly enforce manual entry ONLY for Bulk Coupons
            if (!couponData.isBulk) {
                setCouponError('This input is specifically for secret voucher codes. Public offers are automatically applied!');
                setAppliedCoupon(null);
                setCouponDiscount(0);
                return;
            }

            // Check admin/branch assignment
            if (userRole === 'admin') {
                if (couponData.assignedToAdminUID && couponData.assignedToAdminUID !== currentUserUID) {
                    setCouponError('Coupon not assigned to your account');
                    setAppliedCoupon(null);
                    setCouponDiscount(0);
                    return;
                }
            } else if (userRole === 'staff') {
                if (!currentUserAdminUID || (couponData.assignedToAdminUID && couponData.assignedToAdminUID !== currentUserAdminUID)) {
                    setCouponError('Coupon not assigned to your admin');
                    setAppliedCoupon(null);
                    setCouponDiscount(0);
                    return;
                }
            }

            const now = new Date();

            // a. Check expiryDate
            const expiryDate = couponData.expiryDate.toDate();
            if (now > expiryDate) {
                setCouponError('Coupon has expired');
                return;
            }

            // a2. Check startDate
            if (couponData.startDate) {
                const startDate = couponData.startDate.toDate();
                // Set start of day for accurate comparison if needed
                startDate.setHours(0, 0, 0, 0);
                if (now < startDate) {
                    setCouponError('Coupon is not active yet');
                    return;
                }
            }

            // b. Check usageLimit
            if (couponData.usageLimit > 0 && couponData.usedCount >= couponData.usageLimit) {
                setCouponError('Coupon usage limit reached');
                return;
            }

            // c. Check minOrderValue
            if (subtotal < couponData.minOrderValue) {
                setCouponError(`Minimum order ₹${couponData.minOrderValue} required`);
                return;
            }

            // d. Calculate discount
            let discount = 0;
            if (couponData.discountType === 'percentage') {
                discount = (subtotal * couponData.discountValue) / 100;
            } else if (couponData.discountType === 'flat') {
                discount = couponData.discountValue;
            }

            // Cap discount so it never exceeds subtotal
            discount = Math.min(discount, subtotal);

            // e. Set applied Coupon details
            setAppliedCoupon(couponData);
            setCouponDiscount(discount);
            setCouponError('');
            
        } catch (error) {
            console.error('Error applying coupon:', error);
            setCouponError('Failed to validate coupon');
        }
    };

    /**
     * Resets the coupon state and clears applied discount.
     */
    const removeCoupon = useCallback(() => {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponCode('');
        setCouponError('');
    }, []);

    /**
     * Automatically finds and applies the best valid coupon for a given subtotal.
     */
    const runAutoApplyCoupon = useCallback(async (subtotal) => {
        if (!subtotal || subtotal <= 0) {
            setAppliedCoupon(null);
            setCouponDiscount(0);
            setCouponCode('');
            return;
        }

        try {
            const path = getTenantPath('coupons');
            const q = query(
                collection(db, path), 
                where('isActive', '==', true)
            );
            
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) return;

            const now = new Date();
            let bestCoupon = null;
            let maxDiscount = 0;

            for (const docObj of querySnapshot.docs) {
                const couponData = { id: docObj.id, ...docObj.data() };
                
                // Expose ONLY public Single coupons or coupons assigned to this specific admin.
                if (couponData.isBulk) continue;

                // Branch/Admin Restriction Check
                if (userRole === 'admin') {
                    if (couponData.assignedToAdminUID && couponData.assignedToAdminUID !== currentUserUID) continue;
                } else if (userRole === 'staff') {
                    if (!currentUserAdminUID || (couponData.assignedToAdminUID && couponData.assignedToAdminUID !== currentUserAdminUID)) continue;
                }
                
                // Expiry Check
                if (couponData.expiryDate) {
                    const expiryDate = couponData.expiryDate.toDate();
                    if (now > expiryDate) continue;
                }

                // Start Date Check
                if (couponData.startDate) {
                    const startDate = couponData.startDate.toDate();
                    startDate.setHours(0, 0, 0, 0);
                    if (now < startDate) continue;
                }

                // Usage Limit Check
                if (couponData.usageLimit > 0 && couponData.usedCount >= couponData.usageLimit) continue;

                // Min Order Check
                if (subtotal < couponData.minOrderValue) continue;

                // Calculate discount
                let discount = 0;
                if (couponData.discountType === 'percentage') {
                    discount = (subtotal * couponData.discountValue) / 100;
                } else if (couponData.discountType === 'flat') {
                    discount = couponData.discountValue;
                }

                // Cap discount
                discount = Math.min(discount, subtotal);

                if (discount > maxDiscount) {
                    maxDiscount = discount;
                    bestCoupon = couponData;
                }
            }

            if (bestCoupon) {
                setCouponCode(bestCoupon.code);
                setAppliedCoupon(bestCoupon);
                setCouponDiscount(maxDiscount);
                setCouponError('');
            } else {
                setAppliedCoupon(null);
                setCouponDiscount(0);
                setCouponCode('');
            }
            
        } catch (error) {
            console.error('Error auto-applying coupon:', error);
        }
    }, [userRole, currentUserUID, currentUserAdminUID]);

    return {
        couponCode,
        setCouponCode,
        appliedCoupon,
        couponError,
        couponDiscount,
        applyCoupon,
        removeCoupon,
        runAutoApplyCoupon
    };
};
