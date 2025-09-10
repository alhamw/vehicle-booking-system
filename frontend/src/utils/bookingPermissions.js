/**
 * Utility functions for booking permissions
 * Centralized logic to avoid boilerplate across components
 */

/**
 * Check if a user can edit a booking
 * @param {Object} booking - The booking object
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user can edit the booking
 */
export const canEditBooking = (booking, user) => {
  if (!booking || !user) return false;
  return (
    (user.role === 'admin' && booking.status === 'pending') || 
    (booking.user.id === user.id && booking.status === 'pending')
  );
};

/**
 * Check if a user can cancel a booking
 * @param {Object} booking - The booking object
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user can cancel the booking
 */
export const canCancelBooking = (booking, user) => {
  if (!booking || !user) return false;
  // Only admins can cancel bookings
  return user.role === 'admin' && ['pending', 'approved'].includes(booking.status);
};

/**
 * Check if a user can approve a booking
 * @param {Object} approval - The approval object
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user can approve the booking
 */
export const canApproveBooking = (approval, user) => {
  if (!approval || !user) return false;
  
  // Can only approve if booking status is pending
  if (approval.booking?.status !== 'pending') return false;
  
  const userLevel = user.role === 'approver_l1' ? 1 : 2;
  const userApproval = approval.booking?.approvals?.find(a => a.level === userLevel);
  
  if (!userApproval || userApproval.status !== 'pending') return false;
  
  // For Level 1 approvers, can approve if status is pending
  if (user.role === 'approver_l1') {
    return true;
  }
  
  // For Level 2 approvers, can approve if status is pending AND Level 1 has approved
  if (user.role === 'approver_l2') {
    const level1Approval = approval.booking?.approvals?.find(a => 
      a.level === 1 && 
      a.status === 'approved'
    );
    
    return !!level1Approval;
  }
  
  return false;
};

/**
 * Check if a user can reject a booking
 * @param {Object} approval - The approval object
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user can reject the booking
 */
export const canRejectBooking = (approval, user) => {
  if (!approval || !user) return false;
  
  // Can only reject if booking status is pending
  if (approval.booking?.status !== 'pending') return false;
  
  const userLevel = user.role === 'approver_l1' ? 1 : 2;
  const userApproval = approval.booking?.approvals?.find(a => a.level === userLevel);
  
  // Can reject if approval exists and is pending
  return userApproval && userApproval.status === 'pending';
};

/**
 * Check if a user is an approver
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user is an approver
 */
export const isApprover = (user) => {
  return user?.role === 'approver_l1' || user?.role === 'approver_l2';
};

/**
 * Check if a user is admin only (not approver)
 * @param {Object} user - The current user object
 * @returns {boolean} - True if user is admin only
 */
export const isAdminOnly = (user) => {
  return user?.role === 'admin';
};
