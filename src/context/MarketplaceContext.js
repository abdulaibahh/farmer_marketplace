import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { paymentMethods, deliveryMethods } from '../data/catalog';
import { api, hasApiBaseUrl } from '../services/api';
import { clearCart, clearToken, loadCart, loadToken, saveCart, saveToken } from '../services/storage';
import { averageScore } from '../utils/format';

const MarketplaceContext = createContext(null);

function toDate(value) {
  return new Date(value || Date.now()).toISOString();
}

function sortNewest(items) {
  return [...items].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function normalizeCartItems(items) {
  const grouped = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const productId = item?.productId;
    const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));

    if (!productId) {
      continue;
    }

    grouped.set(productId, (grouped.get(productId) || 0) + quantity);
  }

  return Array.from(grouped, ([productId, quantity]) => ({ productId, quantity }));
}

function formatValidationMessage(error, fallbackMessage) {
  const rawMessage = String(error?.message || '').trim();

  if (rawMessage) {
    try {
      const parsed = JSON.parse(rawMessage);
      const issues = Array.isArray(parsed) ? parsed : [parsed];
      const emailIssue = issues.find((issue) => Array.isArray(issue?.path) && issue.path.includes('email'));

      if (emailIssue) {
        return 'Please enter a valid email address, like name@example.com.';
      }

      const firstIssue = issues.find((issue) => typeof issue?.message === 'string' && issue.message.trim());
      if (firstIssue) {
        return firstIssue.message.trim();
      }
    } catch {
      if (/invalid email/i.test(rawMessage)) {
        return 'Please enter a valid email address, like name@example.com.';
      }
    }
  }

  return rawMessage || fallbackMessage;
}

function computeAnalytics({ users, products, orders }) {
  const activeProducts = products.filter((product) => product.isVisible && product.isAvailable);
  const completedOrders = orders.filter((order) => order.status === 'delivered');
  const pendingOrders = orders.filter((order) => order.status === 'pending');
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.status === 'delivered' || order.paymentStatus === 'paid' ? Number(order.totalPrice || 0) : 0),
    0
  );
  const topProduct = products
    .map((product) => ({
      product,
      sold: orders
        .filter((order) => order.productId === product.id && order.status !== 'cancelled')
        .reduce((sum, order) => sum + Number(order.quantity || 0), 0)
    }))
    .sort((left, right) => right.sold - left.sold)[0];

  return {
    totalRevenue,
    activeProducts: activeProducts.length,
    completedOrders: completedOrders.length,
    pendingOrders: pendingOrders.length,
    totalUsers: users.length,
    farmers: users.filter((user) => user.role === 'farmer').length,
    buyers: users.filter((user) => user.role === 'buyer').length,
    topProductName: topProduct?.product?.name || '—',
    averageOrderValue: orders.filter((order) => order.status !== 'cancelled').length === 0
      ? 0
      : totalRevenue / orders.filter((order) => order.status !== 'cancelled').length
  };
}

export function MarketplaceProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const authTokenRef = useRef(null);
  const [cartReady, setCartReady] = useState(false);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const notify = (type, message) => setToast({ type, message, id: Date.now() });

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);

    return undefined;
  }, [toast]);

  const applyBootstrap = (payload) => {
    if (!payload) {
      return;
    }

    if (Array.isArray(payload.users)) {
      setUsers(payload.users);
    }

    if (Array.isArray(payload.products)) {
      setProducts(payload.products);
    }

    if (Array.isArray(payload.orders)) {
      setOrders(payload.orders);
    }

    if (Array.isArray(payload.reviews)) {
      setReviews(payload.reviews);
    }

    if (payload.currentUser?.id) {
      setCurrentUserId(payload.currentUser.id);
    }
  };

  const applyResponse = (response) => {
    const payload = response?.bootstrap || response;
    applyBootstrap(payload);
    return response;
  };

  const handleRemoteError = async (error, fallbackMessage) => {
    if (error?.status) {
      notify('danger', formatValidationMessage(error, fallbackMessage));
      return false;
    }

    if (!hasApiBaseUrl) {
      notify('danger', 'EXPO_PUBLIC_API_URL is not configured.');
    } else if (error?.code === 'REQUEST_TIMEOUT') {
      notify('danger', error.message);
    } else {
      notify('danger', fallbackMessage);
    }

    return false;
  };

  const refreshBootstrap = async ({ silent = false } = {}) => {
    const token = authTokenRef.current;
    if (!token || !hasApiBaseUrl) {
      return false;
    }

    try {
      const payload = await api.bootstrap(token);
      applyBootstrap(payload.bootstrap || payload);
      return true;
    } catch (error) {
      if (error?.status === 401) {
        await clearToken();
        authTokenRef.current = null;
        setCurrentUserId(null);
        if (!silent) {
          notify('warning', 'Your session expired. Please sign in again.');
        }
        return false;
      }

      if (!silent) {
        notify('danger', 'Unable to sync the marketplace right now.');
      }

      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      const token = await loadToken();
      if (!mounted || !token || !hasApiBaseUrl) {
        return;
      }

      authTokenRef.current = token;
      await refreshBootstrap();
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const storedCart = await loadCart();
      if (!mounted) {
        return;
      }

      setCartItems(normalizeCartItems(storedCart));
      setCartReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cartReady) {
      return;
    }

    void saveCart(cartItems);
  }, [cartItems, cartReady]);

  useEffect(() => {
    let mounted = true;

    const syncPaymentReturn = async (url) => {
      if (!url) {
        return;
      }

      let paymentStatus = null;
      try {
        const parsedUrl = new URL(url);
        paymentStatus = parsedUrl.searchParams.get('payment');
      } catch {
        return;
      }

      if (paymentStatus !== 'success' && paymentStatus !== 'cancelled') {
        return;
      }

      if (!mounted) {
        return;
      }

      if (paymentStatus === 'success') {
        notify('success', 'Payment completed. Syncing your order now.');
      } else {
        notify('warning', 'Checkout was cancelled before payment completed.');
      }

      await refreshBootstrap({ silent: true });
    };

    Linking.getInitialURL().then((url) => {
      void syncPaymentReturn(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void syncPaymentReturn(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const currentUser = useMemo(
    () => users.find((user) => user.id === currentUserId) || null,
    [currentUserId, users]
  );

  const currentProducts = useMemo(() => products.filter((product) => product.isVisible), [products]);
  const visibleOrders = useMemo(() => sortNewest(orders), [orders]);
  const analytics = useMemo(() => computeAnalytics({ users, products, orders }), [orders, products, users]);

  const signIn = async ({ email, password }) => {
    try {
      const result = await api.login({
        email: String(email || '').trim(),
        password: String(password || '')
      });
      authTokenRef.current = result.token;
      await saveToken(result.token);
      applyResponse(result);
      setCurrentUserId(result.user.id);
      notify('success', `Welcome back, ${result.user.name.split(' ')[0]}!`);
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to reach the production backend.');
    }
  };

  const register = async (payload) => {
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const role = payload.role === 'farmer' ? 'farmer' : 'buyer';

    if (!name || !email || !password) {
      notify('warning', 'Please complete name, email, and password.');
      return false;
    }

    try {
      const result = await api.register({
        name,
        email,
        password,
        role,
        location: payload.location || '',
        phone: payload.phone || '',
        storeName: payload.storeName || '',
        bio: payload.bio || '',
        preferredPaymentMethod: payload.preferredPaymentMethod || paymentMethods[0]
      });
      authTokenRef.current = result.token;
      await saveToken(result.token);
      applyResponse(result);
      setCurrentUserId(result.user.id);
      notify('success', 'Your account is ready.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to reach the production backend.');
    }
  };

  const signOut = async () => {
    setCurrentUserId(null);
    setUsers([]);
    setProducts([]);
    setOrders([]);
    setReviews([]);
    authTokenRef.current = null;
    await clearToken();
    await clearCart();
    setCartItems([]);
    notify('info', 'You have been signed out.');
  };

  const updateProfile = async (patch) => {
    if (!currentUser || !authTokenRef.current) {
      notify('warning', 'Please sign in again.');
      return false;
    }

    try {
      const result = await api.updateProfile(authTokenRef.current, patch);
      applyResponse(result);
      notify('success', 'Profile updated.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to update your profile right now.');
    }
  };

  const addProduct = async (payload) => {
    if (!currentUser || currentUser.role !== 'farmer' || !authTokenRef.current) {
      notify('warning', 'Only farmers can add products.');
      return false;
    }

    const name = String(payload.name || '').trim();
    if (!name) {
      notify('warning', 'Product name is required.');
      return false;
    }

    try {
      const result = await api.createProduct(authTokenRef.current, payload);
      applyResponse(result);
      notify('success', 'Product listing added.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to create the listing right now.');
    }
  };

  const updateProduct = async (productId, patch) => {
    if (!currentUser || !authTokenRef.current) {
      notify('warning', 'Please sign in again.');
      return false;
    }

    const target = products.find((product) => product.id === productId);
    if (!target) {
      notify('warning', 'That product no longer exists.');
      return false;
    }

    const canEdit = currentUser.role === 'admin' || target.farmerId === currentUser.id;
    if (!canEdit) {
      notify('warning', 'You are not allowed to edit this listing.');
      return false;
    }

    try {
      const result = await api.updateProduct(authTokenRef.current, productId, patch);
      applyResponse(result);
      notify('success', 'Product updated.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to update the listing right now.');
    }
  };

  const removeProduct = async (productId) => {
    if (!currentUser || currentUser.role !== 'admin' || !authTokenRef.current) {
      notify('warning', 'Only admin can remove a listing.');
      return false;
    }

    try {
      const result = await api.removeProduct(authTokenRef.current, productId);
      applyResponse(result);
      notify('success', 'Listing removed from the marketplace.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to remove the listing right now.');
    }
  };

  const restoreProduct = async (productId) => {
    if (!currentUser || currentUser.role !== 'admin' || !authTokenRef.current) {
      return false;
    }

    try {
      const result = await api.restoreProduct(authTokenRef.current, productId);
      applyResponse(result);
      notify('success', 'Listing restored.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to restore the listing right now.');
    }
  };

  const toggleProductAvailability = async (productId, nextValue) => {
    if (!currentUser || !authTokenRef.current) {
      notify('warning', 'Please sign in again.');
      return false;
    }

    const target = products.find((product) => product.id === productId);
    if (!target) {
      notify('warning', 'That product no longer exists.');
      return false;
    }

    const canEdit = currentUser.role === 'admin' || target.farmerId === currentUser.id;
    if (!canEdit) {
      notify('warning', 'You cannot change that product.');
      return false;
    }

    try {
      const result = await api.updateProductAvailability(authTokenRef.current, productId, {
        isAvailable: nextValue
      });
      applyResponse(result);
      notify('success', nextValue ? 'Product marked as available.' : 'Product marked as unavailable.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to update availability right now.');
    }
  };

  const placeOrder = async (payload, options = {}) => {
    if (!currentUser || currentUser.role !== 'buyer' || !authTokenRef.current) {
      notify('warning', 'Only buyers can place orders.');
      return false;
    }

    const product = products.find((candidate) => candidate.id === payload.productId);
    if (!product || !product.isVisible) {
      notify('danger', 'That product is not available right now.');
      return false;
    }

    const quantity = Math.max(1, Number(payload.quantity || 1));
    if (quantity > product.quantity) {
      notify('warning', 'There is not enough stock for that quantity.');
      return false;
    }

    try {
      const result = await api.createOrder(authTokenRef.current, {
        productId: payload.productId,
        quantity,
        paymentMethod: payload.paymentMethod || paymentMethods[0],
        paymentReference: payload.paymentReference || '',
        deliveryMethod: payload.deliveryMethod || deliveryMethods[0],
        note: payload.note || ''
      });
      applyResponse(result);
      if (result.checkoutUrl && options.openCheckout !== false) {
        try {
          await Linking.openURL(result.checkoutUrl);
          if (!options.silent) {
            notify('info', 'Secure checkout opened in your browser.');
          }
        } catch {
          notify('warning', 'The order was created, but checkout could not be opened. Use the order screen to try again.');
        }
      } else if (!options.silent) {
        if (!result.checkoutUrl) {
          notify('success', 'Order placed successfully.');
        } else {
          notify('success', 'Order added to your payment queue.');
        }
      }
      return result;
    } catch (error) {
      return handleRemoteError(error, 'Unable to place the order right now.');
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    if (!currentUser || currentUser.role !== 'buyer') {
      notify('warning', 'Only buyers can build a cart.');
      return false;
    }

    const product = products.find((candidate) => candidate.id === productId);
    if (!product || !product.isVisible || !product.isAvailable) {
      notify('danger', 'That product is not available right now.');
      return false;
    }

    if (Number(product.quantity || 0) <= 0) {
      notify('warning', 'That product is out of stock.');
      return false;
    }

    const safeQuantity = Math.max(1, Math.floor(Number(quantity || 1)));
    const currentQuantity = cartItems.find((item) => item.productId === productId)?.quantity || 0;
    const nextQuantity = Math.min(product.quantity, currentQuantity + safeQuantity);

    if (nextQuantity <= 0) {
      notify('warning', 'There is no stock available for that product.');
      return false;
    }

    setCartItems((current) => {
      const next = current.filter((item) => item.productId !== productId);
      next.push({ productId, quantity: nextQuantity });
      return normalizeCartItems(next);
    });

    if (currentQuantity > 0) {
      notify('success', `${product.name} quantity updated in your cart.`);
    } else {
      notify('success', `${product.name} added to your cart.`);
    }

    return true;
  };

  const updateCartItemQuantity = async (productId, quantity) => {
    if (!currentUser || currentUser.role !== 'buyer') {
      return false;
    }

    const product = products.find((candidate) => candidate.id === productId);
    if (!product) {
      return false;
    }

    if (Number(product.quantity || 0) <= 0) {
      await removeCartItem(productId);
      notify('warning', 'That product is out of stock.');
      return false;
    }

    const requestedQuantity = Math.floor(Number(quantity || 1));
    if (requestedQuantity <= 0) {
      return removeCartItem(productId);
    }

    const nextQuantity = Math.min(product.quantity, requestedQuantity);

    setCartItems((current) =>
      normalizeCartItems(
        current.map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item))
      )
    );

    notify('info', `${product.name} quantity set to ${nextQuantity}.`);
    return true;
  };

  const removeCartItem = async (productId) => {
    if (!currentUser || currentUser.role !== 'buyer') {
      return false;
    }

    const product = products.find((candidate) => candidate.id === productId);
    setCartItems((current) => current.filter((item) => item.productId !== productId));
    if (product) {
      notify('info', `${product.name} removed from your cart.`);
    }
    return true;
  };

  const clearCartItems = async () => {
    setCartItems([]);
    await clearCart();
    notify('info', 'Your cart is empty now.');
    return true;
  };

  const confirmOrder = async (orderId) => {
    if (!currentUser || (currentUser.role !== 'farmer' && currentUser.role !== 'admin') || !authTokenRef.current) {
      return false;
    }

    const order = orders.find((candidate) => candidate.id === orderId);
    if (currentUser.role === 'farmer' && order && order.farmerId !== currentUser.id) {
      notify('warning', 'You cannot confirm that order.');
      return false;
    }

    try {
      const result = await api.confirmOrder(authTokenRef.current, orderId);
      applyResponse(result);
      notify('success', 'Order confirmed.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to confirm the order right now.');
    }
  };

  const deliverOrder = async (orderId) => {
    if (!currentUser || (currentUser.role !== 'farmer' && currentUser.role !== 'admin') || !authTokenRef.current) {
      return false;
    }

    const order = orders.find((candidate) => candidate.id === orderId);
    if (currentUser.role === 'farmer' && order && order.farmerId !== currentUser.id) {
      notify('warning', 'You cannot update that order.');
      return false;
    }

    try {
      const result = await api.deliverOrder(authTokenRef.current, orderId);
      applyResponse(result);
      notify('success', 'Order marked as delivered.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to update the order right now.');
    }
  };

  const addReview = async ({ orderId, rating, comment }) => {
    if (!currentUser || currentUser.role !== 'buyer' || !authTokenRef.current) {
      return false;
    }

    const order = orders.find((candidate) => candidate.id === orderId);
    if (!order || order.buyerId !== currentUser.id || order.status !== 'delivered') {
      notify('warning', 'Reviews are available once the order is delivered.');
      return false;
    }

    if (reviews.some((review) => review.orderId === orderId)) {
      notify('warning', 'You already reviewed that order.');
      return false;
    }

    try {
      const result = await api.addReview(authTokenRef.current, orderId, {
        rating: Math.max(1, Math.min(5, Number(rating || 5))),
        comment: comment || ''
      });
      applyResponse(result);
      notify('success', 'Thanks for sharing your feedback.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to submit your review right now.');
    }
  };

  const toggleUserStatus = async (userId) => {
    if (!currentUser || currentUser.role !== 'admin' || !authTokenRef.current) {
      return false;
    }

    const target = users.find((user) => user.id === userId);
    if (target?.id === currentUser.id) {
      notify('warning', 'You cannot suspend your own account.');
      return false;
    }

    try {
      const result = await api.toggleUserStatus(authTokenRef.current, userId);
      applyResponse(result);
      notify('success', 'User status updated.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to update the user right now.');
    }
  };

  const toggleUserVerification = async (userId) => {
    if (!currentUser || currentUser.role !== 'admin' || !authTokenRef.current) {
      return false;
    }

    const target = users.find((user) => user.id === userId);
    if (target?.role !== 'farmer') {
      notify('warning', 'Verification is reserved for farmer accounts.');
      return false;
    }

    try {
      const result = await api.toggleUserVerification(authTokenRef.current, userId);
      applyResponse(result);
      notify('success', 'Farmer verification updated.');
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to update the farmer right now.');
    }
  };

  const value = useMemo(
    () => ({
      users,
      products,
      orders: visibleOrders,
      reviews,
      currentUser,
      toast,
      analytics,
      currentProducts,
      cartItems,
      paymentMethods,
      deliveryMethods,
      notify,
      signIn,
      register,
      signOut,
      updateProfile,
      addProduct,
      updateProduct,
      removeProduct,
      restoreProduct,
      toggleProductAvailability,
      placeOrder,
      addToCart,
      updateCartItemQuantity,
      removeCartItem,
      clearCart: clearCartItems,
      confirmOrder,
      deliverOrder,
      addReview,
      toggleUserStatus,
      toggleUserVerification
    }),
    [
      addProduct,
      addReview,
      addToCart,
      analytics,
      cartItems,
      clearCartItems,
      confirmOrder,
      currentProducts,
      currentUser,
      deliverOrder,
      deliveryMethods,
      orders,
      paymentMethods,
      notify,
      placeOrder,
      products,
      register,
      removeProduct,
      removeCartItem,
      restoreProduct,
      reviews,
      signIn,
      signOut,
      toast,
      toggleProductAvailability,
      toggleUserStatus,
      toggleUserVerification,
      updateCartItemQuantity,
      updateProfile,
      updateProduct,
      users,
      visibleOrders
    ]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used inside MarketplaceProvider');
  }

  return context;
}
