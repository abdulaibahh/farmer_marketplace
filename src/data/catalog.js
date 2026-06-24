export const paymentMethods = ['Secure Card Checkout', 'Orange Money', 'Africell Money', 'Bank Transfer', 'Cash on Delivery'];

export const deliveryMethods = ['Pickup', 'Local Delivery', 'Courier'];

export const categoryOptions = ['All', 'Grains', 'Roots & Tubers', 'Vegetables', 'Fruits', 'Spices', 'Legumes'];

export const referencePaymentMethods = ['Orange Money', 'Africell Money', 'Bank Transfer'];

export function requiresPaymentReference(method) {
  return referencePaymentMethods.includes(method);
}
