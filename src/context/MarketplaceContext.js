import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { paymentMethods, deliveryMethods } from '../data/catalog';
import { api, hasApiBaseUrl } from '../services/api';
import { clearToken, loadToken, saveToken } from '../services/storage';
import { averageScore } from '../utils/format';

const MarketplaceContext = createContext(null);

function toDate(value) {
  return new Date(value || Date.now()).toISOString();
}

function sortNewest(items) {
  return [...items].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
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
  const [currentUserId, setCurrentUserId] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const authTokenRef = useRef(null);

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
      notify('danger', error.message);
      return false;
    }

    if (!hasApiBaseUrl) {
      notify('danger', 'EXPO_PUBLIC_API_URL is not configured.');
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

  const placeOrder = async (payload) => {
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
        deliveryMethod: payload.deliveryMethod || deliveryMethods[0],
        note: payload.note || ''
      });
      applyResponse(result);
      if (result.checkoutUrl) {
        Linking.openURL(result.checkoutUrl).catch(() => {});
        notify('info', 'Secure checkout opened in your browser.');
      } else {
        notify('success', 'Order placed successfully.');
      }
      return true;
    } catch (error) {
      return handleRemoteError(error, 'Unable to place the order right now.');
    }
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
      paymentMethods,
      deliveryMethods,
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
      confirmOrder,
      deliverOrder,
      addReview,
      toggleUserStatus
    }),
    [
      addProduct,
      addReview,
      analytics,
      confirmOrder,
      currentProducts,
      currentUser,
      deliverOrder,
      deliveryMethods,
      orders,
      paymentMethods,
      placeOrder,
      products,
      register,
      removeProduct,
      restoreProduct,
      reviews,
      signIn,
      signOut,
      toast,
      toggleProductAvailability,
      toggleUserStatus,
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
