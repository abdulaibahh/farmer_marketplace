const currencyFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

export function formatLeones(amount) {
  return `Le ${currencyFormatter.format(Math.round(Number(amount) || 0))}`;
}

export function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return dateFormatter.format(date);
}

export function formatShortDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function roleLabel(role) {
  const labels = {
    farmer: 'Farmer',
    buyer: 'Buyer',
    admin: 'Admin'
  };

  return labels[role] || 'User';
}

export function statusLabel(status) {
  const labels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    draft: 'Draft',
    active: 'Active',
    inactive: 'Inactive',
    paid: 'Paid',
    unpaid: 'Payment due'
  };

  return labels[status] || String(status || 'Unknown');
}

export function availabilityLabel(product) {
  if (!product?.isVisible) {
    return 'Hidden';
  }

  if (!product?.isAvailable || Number(product?.quantity || 0) <= 0) {
    return 'Out of stock';
  }

  if (Number(product.quantity) < 10) {
    return 'Low stock';
  }

  return 'Available';
}

export function averageScore(items) {
  if (!items || items.length === 0) {
    return 0;
  }

  const total = items.reduce((sum, value) => sum + Number(value || 0), 0);
  return total / items.length;
}

export function initialsFromName(name) {
  return String(name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}

