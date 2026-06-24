import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  categoryOptions,
  deliveryMethods,
  paymentMethods,
  requiresPaymentReference
} from '../data/catalog';
import { averageScore, availabilityLabel, formatLeones, initialsFromName } from '../utils/format';
import {
  Badge,
  Button,
  Card,
  Callout,
  Chip,
  Divider,
  EmptyState,
  Input,
  FeatureCarousel,
  DetailModal,
  ProductMedia,
  SearchField,
  SectionHeader,
  StatCard
} from '../components/ui';
import { colors, radius, spacing, typeScale, weights } from '../theme';

const sortOptions = [
  { id: 'featured', label: 'Featured' },
  { id: 'latest', label: 'Latest' },
  { id: 'price-low', label: 'Price: low' },
  { id: 'price-high', label: 'Price: high' }
];

function stars(count) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(count || 0))));
  return '★★★★★'.slice(0, rounded) + '☆☆☆☆☆'.slice(0, 5 - rounded);
}

export function MarketplaceScreen() {
  const {
    currentUser,
    products,
    reviews,
    analytics,
    placeOrder,
    cartItems,
    addToCart,
    updateCartItemQuantity,
    removeCartItem,
    clearCart,
    notify
  } = useMarketplace();
  const { width } = useWindowDimensions();
  const columns = width >= 1100 ? 3 : width >= 720 ? 2 : 1;
  const cardBasis = columns === 3 ? '31.5%' : columns === 2 ? '48.5%' : '100%';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState(deliveryMethods[0]);
  const [note, setNote] = useState('');
  const [cartPaymentMethod, setCartPaymentMethod] = useState(paymentMethods[0]);
  const [cartPaymentReference, setCartPaymentReference] = useState('');
  const [cartDeliveryMethod, setCartDeliveryMethod] = useState(deliveryMethods[0]);
  const [cartNote, setCartNote] = useState('');
  const [insightKey, setInsightKey] = useState(null);
  const [heroSlideKey, setHeroSlideKey] = useState(null);
  const [paymentGuideOpen, setPaymentGuideOpen] = useState(false);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products
      .filter((product) => product.isVisible)
      .filter((product) => (category === 'All' ? true : product.category === category))
      .filter((product) => {
        if (!term) {
          return true;
        }

        const haystack = [
          product.name,
          product.description,
          product.farmerName,
          product.location,
          product.category
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((left, right) => {
        if (sortBy === 'price-low') {
          return left.price - right.price;
        }

        if (sortBy === 'price-high') {
          return right.price - left.price;
        }

        if (sortBy === 'latest') {
          return new Date(right.createdAt) - new Date(left.createdAt);
        }

        if (left.isFeatured !== right.isFeatured) {
          return Number(right.isFeatured) - Number(left.isFeatured);
        }

        return new Date(right.createdAt) - new Date(left.createdAt);
      });
  }, [category, products, search, sortBy]);

  const featuredProducts = useMemo(
    () => visibleProducts.filter((product) => product.isFeatured).slice(0, 5),
    [visibleProducts]
  );

  const marketplaceRating = useMemo(
    () => averageScore(reviews.map((review) => review.rating)),
    [reviews]
  );

  const productRatingStats = useMemo(
    () =>
      products.map((product) => {
        const productReviews = reviews.filter((review) => review.productId === product.id);
        return {
          product,
          rating: averageScore(productReviews.map((review) => review.rating)),
          reviewCount: productReviews.length
        };
      }),
    [products, reviews]
  );

  const bestRatedProduct = useMemo(
    () =>
      productRatingStats
        .filter((stat) => stat.reviewCount > 0)
        .sort((left, right) => right.rating - left.rating || right.reviewCount - left.reviewCount)[0] || null,
    [productRatingStats]
  );

  const marketInsight = useMemo(() => {
    if (!insightKey) {
      return null;
    }

    if (insightKey === 'catalog') {
      return {
        eyebrow: 'Marketplace overview',
        title: 'Visible listings',
        subtitle: 'A quick snapshot of the catalogue currently shown on screen.',
        badgeLabel: 'Catalogue',
        badgeTone: 'primary',
        rows: [
          ['Visible listings', String(visibleProducts.length), 'Available in the current filter set.'],
          ['Categories shown', String(new Set(visibleProducts.map((product) => product.category)).size || 0), 'Grouped by product type.'],
          ['Sort mode', sortBy === 'latest' ? 'Latest arrivals' : sortBy === 'price-low' ? 'Lowest price' : sortBy === 'price-high' ? 'Highest price' : 'Featured first', 'Tap the action below to keep browsing.']
        ],
        actionLabel: visibleProducts.length > 0 ? 'Show latest listings' : null,
        actionPress: () => {
          setCategory('All');
          setSortBy('latest');
          setInsightKey(null);
          notify('info', 'Showing all visible listings sorted by latest arrivals.');
        }
      };
    }

    if (insightKey === 'featured') {
      const focusProduct = featuredProducts[0] || visibleProducts[0] || null;

      return {
        eyebrow: 'Spotlight',
        title: 'Featured produce',
        subtitle: 'The products most likely to stand out first in the marketplace.',
        badgeLabel: 'Featured',
        badgeTone: 'accent',
        rows: [
          ['Featured items', String(featuredProducts.length), 'Highlighted by farmers for quick discovery.'],
          ['Top pick', focusProduct ? focusProduct.name : 'No featured product', focusProduct ? `${formatLeones(focusProduct.price)} · ${focusProduct.location}` : 'Add featured produce to showcase your best listing.'],
          ['Open action', focusProduct ? 'Preview the highlighted product' : 'No product selected', 'Use the button below to open the full listing.']
        ],
        actionLabel: focusProduct ? 'Open featured product' : null,
        actionPress: () => {
          if (!focusProduct) {
            setInsightKey(null);
            return;
          }

          notify('info', `Opened ${focusProduct.name}.`);
          setSelectedProductId(focusProduct.id);
          setInsightKey(null);
        }
      };
    }

    if (insightKey === 'rating') {
      const focusProduct = bestRatedProduct?.product || featuredProducts[0] || visibleProducts[0] || null;

      return {
        eyebrow: 'Buyer feedback',
        title: 'Marketplace rating',
        subtitle: 'Average product feedback collected from delivered orders.',
        badgeLabel: 'Ratings',
        badgeTone: 'info',
        rows: [
          ['Marketplace average', marketplaceRating ? marketplaceRating.toFixed(1) : '—', `${reviews.length} review${reviews.length === 1 ? '' : 's'} recorded.`],
          ['Highest rated product', focusProduct ? focusProduct.name : 'No reviewed product yet', focusProduct ? `${bestRatedProduct?.rating?.toFixed(1) || '—'} rating · ${bestRatedProduct?.reviewCount || 0} review${(bestRatedProduct?.reviewCount || 0) === 1 ? '' : 's'}` : 'Encourage buyers to leave reviews after delivery.'],
          ['Discovery tip', 'Use ratings to refine search', 'Featured items and top-rated products are easiest to find from here.']
        ],
        actionLabel: focusProduct ? 'Open top-rated product' : null,
        actionPress: () => {
          if (!focusProduct) {
            setInsightKey(null);
            return;
          }

          notify('info', `Opened ${focusProduct.name}.`);
          setSelectedProductId(focusProduct.id);
          setInsightKey(null);
        }
      };
    }

    return null;
  }, [
    bestRatedProduct,
    featuredProducts,
    insightKey,
    marketplaceRating,
    notify,
    reviews.length,
    setCategory,
    setInsightKey,
    setSelectedProductId,
    setSortBy,
    sortBy,
    visibleProducts
  ]);

  const paymentGuide = useMemo(
    () => ({
      eyebrow: 'Payment integration',
      title: 'How payments work in this marketplace',
      subtitle: 'Stripe handles card checkout. Mobile money and bank transfers use a real transaction reference that the seller verifies before fulfilment.',
      badgeLabel: 'Payments',
      badgeTone: 'accent',
      rows: [
        ['Secure Card Checkout', 'Stripe hosted checkout', 'Real card payment flow in test or live mode.'],
        ['Orange Money', 'Transaction reference required', 'The seller verifies the submitted transaction ID when confirming the order.'],
        ['Africell Money', 'Transaction reference required', 'The seller verifies the submitted transaction ID when confirming the order.'],
        ['Bank Transfer', 'Transfer reference required', 'The seller verifies the submitted bank reference before fulfilment.'],
        ['Cash on Delivery', 'Functional delivery payment', 'Automatically becomes paid when the order is delivered.']
      ]
    }),
    []
  );

  const heroSlides = useMemo(() => {
    const openFeatured = featuredProducts[0] || visibleProducts[0] || null;
    const topPick = featuredProducts[1] || openFeatured;

    return [
      {
        id: 'fresh-harvest',
        eyebrow: 'Fresh harvest',
        title: 'Browse the freshest market picks in one place.',
        description: `${featuredProducts.length} featured listings are ready to explore from trusted farmers.`,
        cta: 'Open featured produce',
        tone: 'success',
        colors: [colors.heroStart, colors.heroEnd],
        stats: [
          { value: String(visibleProducts.length), label: 'Live items' },
          { value: String(featuredProducts.length), label: 'Featured' }
        ],
        onPress: () => {
          setHeroSlideKey('fresh-harvest');
          notify('info', 'Opened fresh harvest details.');
        }
      },
      {
        id: 'smart-filters',
        eyebrow: 'Smart filters',
        title: 'Tap a card, open a listing, and refine your search fast.',
        description: 'Sort by latest, compare pricing, and jump straight into the checkout flow.',
        cta: 'Reset to all products',
        tone: 'primary',
        colors: [colors.primaryDark, colors.primary],
        stats: [
          { value: 'Search', label: 'By crop' },
          { value: 'Sort', label: 'By price' }
        ],
        onPress: () => {
          setHeroSlideKey('smart-filters');
          notify('info', 'Opened smart filter details.');
        }
      },
      {
        id: 'secure-checkout',
        eyebrow: 'Secure checkout',
        title: 'Order with Stripe-ready payment flows and flexible delivery.',
        description: 'Every product card opens a detailed order sheet with payment and delivery choices.',
        cta: topPick ? `Preview ${topPick.name}` : 'Start shopping',
        tone: 'accent',
        colors: [colors.accent, '#A86710'],
        stats: [
          { value: '3', label: 'Payment options' },
          { value: '100%', label: 'Responsive' }
        ],
        onPress: () => {
          setHeroSlideKey('secure-checkout');
          notify('info', 'Opened secure checkout details.');
        }
      }
    ];
  }, [featuredProducts, notify, visibleProducts]);

  const heroSlideInfo = useMemo(() => {
    if (!heroSlideKey) {
      return null;
    }

    const openFeatured = featuredProducts[0] || visibleProducts[0] || null;
    const topPick = featuredProducts[1] || openFeatured;

    if (heroSlideKey === 'fresh-harvest') {
      return {
        eyebrow: 'Fresh harvest',
        title: 'Browse the freshest market picks in one place.',
        subtitle: 'Featured produce from trusted farmers is surfaced first for faster discovery.',
        badgeLabel: 'Harvest',
        badgeTone: 'success',
        rows: [
          ['Live items', String(visibleProducts.length), 'Visible products currently ready to browse.'],
          ['Featured items', String(featuredProducts.length), 'Promoted produce from sellers.'],
          ['Best next step', openFeatured ? openFeatured.name : 'No featured product', openFeatured ? `${formatLeones(openFeatured.price)} · ${openFeatured.location}` : 'Add a featured listing to make this section shine.']
        ],
        actionLabel: openFeatured ? 'Open featured product' : null,
        actionPress: () => {
          if (!openFeatured) {
            setHeroSlideKey(null);
            return;
          }

          notify('info', `Opened ${openFeatured.name}.`);
          setSelectedProductId(openFeatured.id);
          setHeroSlideKey(null);
        }
      };
    }

    if (heroSlideKey === 'smart-filters') {
      return {
        eyebrow: 'Smart filters',
        title: 'Refine the catalogue quickly.',
        subtitle: 'Use the filters to jump between categories, price ranges, and newer arrivals.',
        badgeLabel: 'Filters',
        badgeTone: 'primary',
        rows: [
          ['Active category', category, 'Current product group shown on the page.'],
          ['Sort mode', sortBy === 'latest' ? 'Latest arrivals' : sortBy === 'price-low' ? 'Lowest price' : sortBy === 'price-high' ? 'Highest price' : 'Featured first', 'How the catalogue is currently ordered.'],
          ['Matching products', String(visibleProducts.length), 'Listings that meet your search and filter criteria.']
        ],
        actionLabel: 'Reset filters',
        actionPress: () => {
          setCategory('All');
          setSortBy('featured');
          setHeroSlideKey(null);
          notify('info', 'Filters reset to featured products.');
        }
      };
    }

    return {
      eyebrow: 'Secure checkout',
      title: 'Payment-ready shopping.',
      subtitle: 'The checkout flow supports one-item card payment or multi-item mobile money style carts.',
      badgeLabel: 'Checkout',
      badgeTone: 'accent',
      rows: [
        ['Payment options', '3 methods', 'Mobile money, bank transfer, and cash on delivery.'],
        ['Cart support', 'Yes', 'Add multiple products before paying.'],
        ['Top pick', topPick ? topPick.name : 'No product selected', topPick ? `${formatLeones(topPick.price)} · ${topPick.location}` : 'Browse the marketplace to choose a product.']
      ],
      actionLabel: topPick ? 'Open top pick' : null,
      actionPress: () => {
        if (!topPick) {
          setHeroSlideKey(null);
          return;
        }

        notify('info', `Opened ${topPick.name}.`);
        setSelectedProductId(topPick.id);
        setHeroSlideKey(null);
      }
    };
  }, [
    category,
    featuredProducts,
    heroSlideKey,
    notify,
    setCategory,
    setSelectedProductId,
    setSortBy,
    sortBy,
    visibleProducts
  ]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const selectedReviews = useMemo(
    () => reviews.filter((review) => review.productId === selectedProduct?.id),
    [reviews, selectedProduct?.id]
  );

  const cartLineItems = useMemo(
    () =>
      cartItems
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          if (!product) {
            return null;
          }

          const quantityInCart = Math.max(1, Math.min(Number(item.quantity || 1), Number(product.quantity || 0)));
          if (quantityInCart <= 0) {
            return null;
          }

          return {
            product,
            quantity: quantityInCart,
            lineTotal: quantityInCart * Number(product.price || 0)
          };
        })
        .filter(Boolean),
    [cartItems, products]
  );

  const cartItemCount = useMemo(
    () => cartLineItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [cartLineItems]
  );

  const cartTotal = useMemo(
    () => cartLineItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
    [cartLineItems]
  );

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setQuantity('1');
    setPaymentMethod(currentUser?.preferredPaymentMethod || paymentMethods[0]);
    setPaymentReference('');
    setDeliveryMethod(deliveryMethods[0]);
    setNote('');
  }, [currentUser?.preferredPaymentMethod, selectedProduct]);

  useEffect(() => {
    setCartPaymentMethod(currentUser?.preferredPaymentMethod || paymentMethods[0]);
    setCartPaymentReference('');
    setCartDeliveryMethod(deliveryMethods[0]);
    setCartNote('');
  }, [currentUser?.preferredPaymentMethod, currentUser?.id]);

  const orderTotal = selectedProduct ? Number(quantity || 1) * Number(selectedProduct.price || 0) : 0;

  const submitOrder = async () => {
    const success = await placeOrder({
      productId: selectedProduct.id,
      quantity: Number(quantity || 1),
      paymentMethod,
      paymentReference,
      deliveryMethod,
      note
    });

    if (success) {
      setPaymentReference('');
      setSelectedProductId(null);
    }
  };

  const addProductToCart = async (product, quantityValue = 1) => {
    await addToCart(product.id, quantityValue);
  };

  const checkoutCart = async () => {
    if (currentUser?.role !== 'buyer') {
      notify('warning', 'Log in as a buyer to use the cart.');
      return;
    }

    if (cartLineItems.length === 0) {
      notify('warning', 'Your cart is empty.');
      return;
    }

    if (cartPaymentMethod === 'Secure Card Checkout' && cartLineItems.length > 1) {
      notify('warning', 'Stripe checkout handles one cart item at a time. Use a mobile payment method for multi-item carts.');
      return;
    }

    if (requiresPaymentReference(cartPaymentMethod) && cartPaymentReference.trim().length < 3) {
      notify('warning', 'Enter the mobile money transaction ID or bank transfer reference.');
      return;
    }

    for (const lineItem of cartLineItems) {
      const result = await placeOrder(
        {
          productId: lineItem.product.id,
          quantity: lineItem.quantity,
          paymentMethod: cartPaymentMethod,
          paymentReference: cartPaymentReference.trim(),
          deliveryMethod: cartDeliveryMethod,
          note: cartNote
        },
        {
          openCheckout: cartPaymentMethod === 'Secure Card Checkout',
          silent: true
        }
      );

      if (!result) {
        return;
      }
    }

    await clearCart();
    setCartNote('');
    setCartPaymentReference('');

    if (cartPaymentMethod === 'Secure Card Checkout') {
      notify('info', 'Your secure payment opened in a browser. Complete it to finish the cart checkout.');
    } else {
      notify('success', 'Your cart has been checked out successfully.');
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader
        eyebrow="Browse"
        title="Marketplace"
        subtitle="Browse fresh produce, search by name or farmer, and place direct orders."
      />

      <FeatureCarousel slides={heroSlides} />

      <DetailModal
        visible={Boolean(heroSlideInfo)}
        eyebrow={heroSlideInfo?.eyebrow}
        title={heroSlideInfo?.title || ''}
        subtitle={heroSlideInfo?.subtitle || ''}
        badgeLabel={heroSlideInfo?.badgeLabel}
        badgeTone={heroSlideInfo?.badgeTone}
        onClose={() => setHeroSlideKey(null)}
        actions={
          heroSlideInfo?.actionLabel ? (
            <Button
              label={heroSlideInfo.actionLabel}
              onPress={async () => {
                await heroSlideInfo.actionPress?.();
              }}
            />
          ) : null
        }
      >
        {heroSlideInfo ? (
          <View style={styles.insightStack}>
            {heroSlideInfo.rows.map(([label, value, note]) => (
              <Card key={label} style={styles.insightRowCard}>
                <Text style={styles.insightRowLabel}>{label}</Text>
                <Text style={styles.insightRowValue}>{value}</Text>
                {note ? <Text style={styles.insightRowNote}>{note}</Text> : null}
              </Card>
            ))}
          </View>
        ) : null}
      </DetailModal>

      <DetailModal
        visible={paymentGuideOpen}
        eyebrow={paymentGuide.eyebrow}
        title={paymentGuide.title}
        subtitle={paymentGuide.subtitle}
        badgeLabel={paymentGuide.badgeLabel}
        badgeTone={paymentGuide.badgeTone}
        onClose={() => setPaymentGuideOpen(false)}
      >
        <View style={styles.insightStack}>
          {paymentGuide.rows.map(([label, value, note]) => (
            <Card key={label} style={styles.insightRowCard}>
              <Text style={styles.insightRowLabel}>{label}</Text>
              <Text style={styles.insightRowValue}>{value}</Text>
              {note ? <Text style={styles.insightRowNote}>{note}</Text> : null}
            </Card>
          ))}
        </View>
      </DetailModal>

      <View style={styles.statsRow}>
        <StatCard
          label="Visible listings"
          value={String(visibleProducts.length)}
          hint="Ready to browse"
          icon="🛒"
          tone="primary"
          onPress={() => {
            setInsightKey('catalog');
            notify('info', 'Opened marketplace overview.');
          }}
        />
        <StatCard
          label="Featured picks"
          value={String(featuredProducts.length)}
          hint="Top produce"
          icon="✨"
          tone="accent"
          onPress={() => {
            setInsightKey('featured');
            notify('info', 'Opened featured produce details.');
          }}
        />
        <StatCard
          label="Average rating"
          value={marketplaceRating ? marketplaceRating.toFixed(1) : '—'}
          hint="Buyer feedback"
          icon="⭐"
          tone="info"
          onPress={() => {
            setInsightKey('rating');
            notify('info', 'Opened marketplace rating details.');
          }}
        />
      </View>

      {currentUser?.role === 'buyer' ? (
        <Card style={styles.cartPanel}>
          <SectionHeader
            eyebrow="Cart"
            title={`Your cart (${cartItemCount} item${cartItemCount === 1 ? '' : 's'})`}
            subtitle="Add products here first, then pay once you’re ready."
            action={
              <View style={styles.cartActionRow}>
                <Button
                  label="Payment guide"
                  variant="ghost"
                  size="sm"
                  onPress={() => setPaymentGuideOpen(true)}
                />
                {cartLineItems.length > 0 ? (
                  <Button
                    label="Clear cart"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      clearCart();
                      setCartNote('');
                    }}
                  />
                ) : null}
              </View>
            }
          />

          {cartLineItems.length === 0 ? (
            <EmptyState
              title="Your cart is empty"
              description="Tap Add to cart on any product card to start building your order."
              icon="🧺"
            />
          ) : (
            <>
              <View style={styles.cartList}>
                {cartLineItems.map((lineItem) => (
                  <Card key={lineItem.product.id} style={styles.cartItem}>
                    <View style={styles.cartItemTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cartItemTitle}>{lineItem.product.name}</Text>
                        <Text style={styles.cartItemMeta}>
                          {formatLeones(lineItem.product.price)} · {lineItem.product.unit} · {lineItem.product.location}
                        </Text>
                      </View>
                      <Badge label={`${lineItem.quantity} in cart`} tone="primary" />
                    </View>

                    <View style={styles.cartItemControls}>
                      <Button
                        label="−"
                        variant="secondary"
                        size="sm"
                        onPress={() => updateCartItemQuantity(lineItem.product.id, lineItem.quantity - 1)}
                        style={styles.quantityButton}
                      />
                      <Button
                        label="+"
                        variant="secondary"
                        size="sm"
                        onPress={() => updateCartItemQuantity(lineItem.product.id, lineItem.quantity + 1)}
                        style={styles.quantityButton}
                      />
                      <Button
                        label="Remove"
                        variant="ghost"
                        size="sm"
                        onPress={() => removeCartItem(lineItem.product.id)}
                      />
                    </View>

                    <Text style={styles.cartLineTotal}>
                      Line total: {formatLeones(lineItem.lineTotal)}
                    </Text>
                  </Card>
                ))}
              </View>

              <View style={styles.cartSummaryRow}>
                <View style={styles.cartSummaryBox}>
                  <Text style={styles.cartSummaryLabel}>Items</Text>
                  <Text style={styles.cartSummaryValue}>{cartItemCount}</Text>
                </View>
                <View style={styles.cartSummaryBox}>
                  <Text style={styles.cartSummaryLabel}>Estimated total</Text>
                  <Text style={styles.cartSummaryValue}>{formatLeones(cartTotal)}</Text>
                </View>
              </View>

              <View style={styles.optionGroup}>
                <Text style={styles.sectionLabel}>Payment method</Text>
                <View style={styles.chipRow}>
                  {paymentMethods.map((method) => (
                    <Chip
                      key={method}
                      label={method}
                      active={cartPaymentMethod === method}
                      onPress={() => setCartPaymentMethod(method)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.optionGroup}>
                <Text style={styles.sectionLabel}>Delivery method</Text>
                <View style={styles.chipRow}>
                  {deliveryMethods.map((method) => (
                    <Chip
                      key={method}
                      label={method}
                      active={cartDeliveryMethod === method}
                      onPress={() => setCartDeliveryMethod(method)}
                    />
                  ))}
                </View>
              </View>

              {requiresPaymentReference(cartPaymentMethod) ? (
                <Input
                  label="Payment reference"
                  placeholder="Transaction ID or bank transfer reference"
                  value={cartPaymentReference}
                  onChangeText={setCartPaymentReference}
                  helper="The farmer verifies this reference before confirming the order."
                />
              ) : null}

              <Input
                label="Cart note"
                placeholder="Any special instructions for the full cart"
                value={cartNote}
                onChangeText={setCartNote}
                multiline
                numberOfLines={3}
                style={styles.cartNoteField}
              />

              {cartPaymentMethod === 'Secure Card Checkout' && cartLineItems.length > 1 ? (
                <Callout
                  title="Card checkout limit"
                  description="Stripe checkout currently supports one cart item at a time. Use Mobile Money, Bank Transfer, or Cash on Delivery for a multi-item cart."
                  tone="warning"
                />
              ) : (
                <Callout
                  title="Cart checkout ready"
                  description={
                    requiresPaymentReference(cartPaymentMethod)
                      ? 'Your transaction reference will be attached to every order in this cart for seller verification.'
                      : 'Proceed when you’re happy with the products, quantities, and delivery choice.'
                  }
                  tone="info"
                />
              )}

              <Button
                label="Proceed to payment"
                onPress={checkoutCart}
                disabled={cartPaymentMethod === 'Secure Card Checkout' && cartLineItems.length > 1}
                style={styles.checkoutButton}
              />
            </>
          )}
        </Card>
      ) : null}

      <Card style={styles.panel}>
        <SearchField
          label="Search produce"
          placeholder="Rice, cassava, tomatoes, farm name..."
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filterGroup}>
          <Text style={styles.sectionLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {categoryOptions.map((option) => (
              <Chip
                key={option}
                label={option}
                active={category === option}
                onPress={() => setCategory(option)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.sectionLabel}>Sort by</Text>
          <View style={styles.chipRow}>
            {sortOptions.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                active={sortBy === option.id}
                onPress={() => setSortBy(option.id)}
              />
            ))}
          </View>
        </View>
      </Card>

      {featuredProducts.length > 0 ? (
        <Card style={styles.panel}>
          <SectionHeader eyebrow="Spotlight" title="Featured produce" subtitle="High-demand products from trusted farmers." />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {featuredProducts.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => {
                  notify('info', `Opened ${product.name}.`);
                  setSelectedProductId(product.id);
                }}
                style={({ pressed }) => [styles.featuredCard, pressed && { opacity: 0.92 }]}
              >
                <ProductMedia uri={product.imageUrl} title={product.name} category={product.category} />
                <Text style={styles.featuredTitle}>{product.name}</Text>
                <Text style={styles.featuredMeta}>{formatLeones(product.price)} / {product.unit}</Text>
                <Badge label={availabilityLabel(product)} tone={product.quantity > 0 ? 'success' : 'danger'} />
              </Pressable>
            ))}
          </ScrollView>
        </Card>
      ) : null}

      <SectionHeader
        eyebrow="Catalogue"
        title="All products"
        subtitle={visibleProducts.length ? `${visibleProducts.length} matches found.` : 'No products match your filters.'}
      />

      <View style={styles.grid}>
        {visibleProducts.length === 0 ? (
          <EmptyState
            title="No produce found"
            description="Try a wider search term or switch to another category to see more market listings."
            icon="🔎"
          />
        ) : (
          visibleProducts.map((product) => (
            <Pressable
              key={product.id}
              onPress={() => {
                notify('info', `Opened ${product.name}.`);
                setSelectedProductId(product.id);
              }}
              style={({ pressed }) => [
                styles.productCardWrap,
                { flexBasis: cardBasis },
                pressed && { opacity: 0.92 }
              ]}
            >
              <Card style={styles.productCard}>
                <ProductMedia uri={product.imageUrl} title={product.name} category={product.category} />

                <View style={styles.productHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productTitle}>{product.name}</Text>
                    <Text style={styles.productMeta}>
                      {product.farmerName} • {product.location}
                    </Text>
                  </View>
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{stars(product.farmerRating || marketplaceRating)}</Text>
                  </View>
                </View>

                <View style={styles.badgeRow}>
                  <Badge label={product.category} tone="primary" />
                  {product.isFeatured ? <Badge label="Featured" tone="accent" /> : null}
                  <Badge label={availabilityLabel(product)} tone={product.quantity > 0 ? 'success' : 'danger'} />
                </View>

                <Text style={styles.productDescription} numberOfLines={3}>
                  {product.description}
                </Text>

                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceLabel}>Price</Text>
                    <Text style={styles.priceValue}>{formatLeones(product.price)}</Text>
                  </View>
                  <View style={styles.quantityBox}>
                    <Text style={styles.priceLabel}>Stock</Text>
                    <Text style={styles.stockValue}>
                      {product.quantity} {product.unit}
                    </Text>
                  </View>
                </View>

                {currentUser?.role === 'buyer' ? (
                  <Button
                    label="Add to cart"
                    variant="accent"
                    onPress={() => addProductToCart(product, 1)}
                    style={styles.addButton}
                  />
                ) : null}

                <Button
                  label="View details"
                  variant="secondary"
                  onPress={() => {
                    notify('info', `Viewing ${product.name}.`);
                    setSelectedProductId(product.id);
                  }}
                  style={styles.viewButton}
                />
              </Card>
            </Pressable>
          ))
        )}
      </View>

      <Modal
        visible={Boolean(selectedProduct)}
        animationType="slide"
        transparent
        onRequestClose={() => {
          notify('info', 'Closed product details.');
          setSelectedProductId(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedProduct ? (
                <>
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                      <Text style={styles.modalSubtitle}>
                        {selectedProduct.farmerName} • {selectedProduct.location}
                      </Text>
                    </View>
                    <Button
                      label="Back"
                      variant="ghost"
                      onPress={() => {
                        notify('info', 'Closed product details.');
                        setSelectedProductId(null);
                      }}
                    />
                  </View>

                  <ProductMedia
                    uri={selectedProduct.imageUrl}
                    title={selectedProduct.name}
                    category={selectedProduct.category}
                    style={styles.modalImage}
                  />

                  <View style={styles.badgeRow}>
                    <Badge label={selectedProduct.category} tone="primary" />
                    {selectedProduct.isFeatured ? <Badge label="Featured" tone="accent" /> : null}
                    <Badge label={availabilityLabel(selectedProduct)} tone={selectedProduct.quantity > 0 ? 'success' : 'danger'} />
                  </View>

                  <Text style={styles.modalDescription}>{selectedProduct.description}</Text>

                  <View style={styles.modalStatsRow}>
                    <StatCard
                      label="Unit price"
                      value={formatLeones(selectedProduct.price)}
                      hint={selectedProduct.unit}
                      icon="💰"
                      tone="primary"
                    />
                    <StatCard
                      label="Stock"
                      value={`${selectedProduct.quantity}`}
                      hint={selectedProduct.unit}
                      icon="📦"
                      tone="accent"
                    />
                  </View>

                  <Card style={styles.modalSection}>
                    <SectionHeader
                      title="Farmer profile"
                      subtitle={`Rating ${selectedProduct.farmerRating?.toFixed(1) || '4.5'} / 5`}
                    />
                    <View style={styles.farmerRow}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{initialsFromName(selectedProduct.farmerName)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.farmerName}>{selectedProduct.farmerName}</Text>
                        <Text style={styles.farmerMeta}>{selectedProduct.location}</Text>
                      </View>
                      <Badge label={selectedProduct.isAvailable ? 'Open for orders' : 'Unavailable'} tone={selectedProduct.isAvailable ? 'success' : 'danger'} />
                    </View>
                  </Card>

                  {currentUser?.role === 'buyer' ? (
                    <Card style={styles.modalSection}>
                      <SectionHeader title="Place order" subtitle="Choose quantity, delivery, and payment method." />

                      <View style={styles.orderSummaryRow}>
                        <Input
                          label="Quantity"
                          placeholder="1"
                          value={quantity}
                          onChangeText={setQuantity}
                          keyboardType="number-pad"
                          style={styles.flex}
                        />
                        <View style={[styles.summaryBox, styles.flex]}>
                          <Text style={styles.summaryLabel}>Estimated total</Text>
                          <Text style={styles.summaryValue}>{formatLeones(orderTotal)}</Text>
                        </View>
                      </View>

                      <View style={styles.optionGroup}>
                        <Text style={styles.sectionLabel}>Payment method</Text>
                        <View style={styles.chipRow}>
                          {paymentMethods.map((method) => (
                            <Chip
                              key={method}
                              label={method}
                              active={paymentMethod === method}
                              onPress={() => setPaymentMethod(method)}
                            />
                          ))}
                        </View>
                      </View>

                      <View style={styles.optionGroup}>
                        <Text style={styles.sectionLabel}>Delivery method</Text>
                        <View style={styles.chipRow}>
                          {deliveryMethods.map((method) => (
                            <Chip
                              key={method}
                              label={method}
                              active={deliveryMethod === method}
                              onPress={() => setDeliveryMethod(method)}
                            />
                          ))}
                        </View>
                      </View>

                      {requiresPaymentReference(paymentMethod) ? (
                        <Input
                          label="Payment reference"
                          placeholder="Transaction ID or bank transfer reference"
                          value={paymentReference}
                          onChangeText={setPaymentReference}
                          helper="The farmer verifies this reference before confirming the order."
                        />
                      ) : null}

                      <Input
                        label="Order note"
                        placeholder="Delivery instructions or preferred pickup time"
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={3}
                        style={styles.noteField}
                      />

                      <Callout
                        title="Payments supported"
                        description={
                          requiresPaymentReference(paymentMethod)
                            ? 'Your submitted reference is recorded with the order and verified by the farmer.'
                            : 'Secure card checkout and cash on delivery are both handled through the live order workflow.'
                        }
                        tone="info"
                      />

                      <View style={styles.modalActionRow}>
                        <Button
                          label="Add to cart"
                          variant="secondary"
                          onPress={() => addProductToCart(selectedProduct, Number(quantity || 1))}
                          style={styles.flex}
                        />
                        <Button label="Buy now" onPress={submitOrder} style={styles.flex} />
                      </View>
                    </Card>
                  ) : (
                    <Callout
                      title="Buyer account required"
                      description="This listing is open for browsing. Log in as a buyer to place orders and make payments."
                      tone="warning"
                    />
                  )}

                  <Card style={styles.modalSection}>
                    <SectionHeader
                      title={`Reviews (${selectedReviews.length})`}
                      subtitle={selectedReviews.length ? 'Feedback from buyers on this product.' : 'No reviews yet.'}
                    />

                    {selectedReviews.length === 0 ? (
                      <EmptyState
                        title="No product reviews"
                        description="The first buyer feedback will appear here once an order is delivered and reviewed."
                        icon="⭐"
                      />
                    ) : (
                      selectedReviews.slice(0, 5).map((review) => (
                        <Card key={review.id} style={styles.reviewCard}>
                          <View style={styles.reviewHeader}>
                            <Text style={styles.reviewStars}>{stars(review.rating)}</Text>
                            <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString('en-GB')}</Text>
                          </View>
                          <Text style={styles.reviewComment}>{review.comment || 'No comment provided.'}</Text>
                        </Card>
                      ))
                    )}
                  </Card>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <DetailModal
        visible={Boolean(marketInsight)}
        eyebrow={marketInsight?.eyebrow}
        title={marketInsight?.title || ''}
        subtitle={marketInsight?.subtitle || ''}
        badgeLabel={marketInsight?.badgeLabel}
        badgeTone={marketInsight?.badgeTone}
        onClose={() => setInsightKey(null)}
        actions={
          marketInsight?.actionLabel ? (
            <Button
              label={marketInsight.actionLabel}
              onPress={async () => {
                await marketInsight.actionPress?.();
              }}
            />
          ) : null
        }
      >
        {marketInsight ? (
          <View style={styles.insightStack}>
            {marketInsight.rows.map(([label, value, note]) => (
              <Card key={label} style={styles.insightRowCard}>
                <Text style={styles.insightRowLabel}>{label}</Text>
                <Text style={styles.insightRowValue}>{value}</Text>
                {note ? <Text style={styles.insightRowNote}>{note}</Text> : null}
              </Card>
            ))}
          </View>
        ) : null}
      </DetailModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  panel: {
    gap: spacing.md
  },
  cartPanel: {
    gap: spacing.lg
  },
  cartActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  cartList: {
    gap: spacing.md
  },
  cartItem: {
    gap: spacing.md,
    backgroundColor: colors.surfaceSoft
  },
  cartItemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  cartItemTitle: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.bold
  },
  cartItemMeta: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 4
  },
  cartItemControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  quantityButton: {
    minWidth: 44
  },
  cartLineTotal: {
    color: colors.primaryDark,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold
  },
  cartSummaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  cartSummaryBox: {
    flex: 1,
    minWidth: 160,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    padding: spacing.md
  },
  cartSummaryLabel: {
    color: colors.muted,
    fontSize: typeScale.xs
  },
  cartSummaryValue: {
    color: colors.primaryDark,
    fontSize: typeScale.xl,
    fontWeight: weights.bold,
    marginTop: 4
  },
  filterGroup: {
    gap: spacing.sm
  },
  sectionLabel: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  featuredRow: {
    gap: spacing.md,
    paddingRight: spacing.md
  },
  featuredCard: {
    width: 180,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md
  },
  featuredTitle: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.bold
  },
  featuredMeta: {
    color: colors.muted,
    fontSize: typeScale.sm
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between'
  },
  productCardWrap: {
    width: '100%'
  },
  productCard: {
    gap: spacing.md
  },
  productHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start'
  },
  productTitle: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weights.bold
  },
  productMeta: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 4
  },
  ratingBadge: {
    alignItems: 'flex-end'
  },
  ratingText: {
    color: colors.accent,
    fontSize: typeScale.sm,
    fontWeight: weights.bold,
    letterSpacing: 1.1
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  productDescription: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-end'
  },
  priceLabel: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginBottom: 4
  },
  priceValue: {
    color: colors.primaryDark,
    fontSize: typeScale.xl,
    fontWeight: weights.bold
  },
  quantityBox: {
    alignItems: 'flex-end'
  },
  stockValue: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.semibold
  },
  viewButton: {
    alignSelf: 'flex-start'
  },
  addButton: {
    alignSelf: 'stretch'
  },
  checkoutButton: {
    alignSelf: 'stretch'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 10, 0.42)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    maxHeight: '94%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border
  },
  modalContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  modalHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start'
  },
  modalTitle: {
    color: colors.text,
    fontSize: typeScale.xl,
    fontWeight: weights.bold
  },
  modalSubtitle: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 4
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  modalImage: {
    borderRadius: 20
  },
  modalDescription: {
    color: colors.text,
    fontSize: typeScale.md,
    lineHeight: 22
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  modalSection: {
    gap: spacing.md
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: typeScale.md,
    fontWeight: weights.bold
  },
  farmerName: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.bold
  },
  farmerMeta: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 4
  },
  orderSummaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
    flexWrap: 'wrap'
  },
  flex: {
    flex: 1
  },
  summaryBox: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: typeScale.xs
  },
  summaryValue: {
    color: colors.primaryDark,
    fontSize: typeScale.lg,
    fontWeight: weights.bold,
    marginTop: 4
  },
  optionGroup: {
    gap: spacing.sm
  },
  noteField: {
    marginTop: 4
  },
  cartNoteField: {
    marginTop: 4
  },
  orderButton: {
    marginTop: spacing.xs
  },
  reviewCard: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  reviewStars: {
    color: colors.accent,
    fontSize: typeScale.sm,
    fontWeight: weights.bold,
    letterSpacing: 0.8
  },
  reviewDate: {
    color: colors.muted,
    fontSize: typeScale.xs
  },
  reviewComment: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  },
  insightStack: {
    gap: spacing.sm
  },
  insightRowCard: {
    gap: 6,
    backgroundColor: colors.surfaceSoft
  },
  insightRowLabel: {
    color: colors.muted,
    fontSize: typeScale.xs
  },
  insightRowValue: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.bold
  },
  insightRowNote: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  }
});
