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
import { categoryOptions, deliveryMethods, paymentMethods } from '../data/catalog';
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
  const { currentUser, products, reviews, analytics, placeOrder } = useMarketplace();
  const { width } = useWindowDimensions();
  const columns = width >= 1100 ? 3 : width >= 720 ? 2 : 1;
  const cardBasis = columns === 3 ? '31.5%' : columns === 2 ? '48.5%' : '100%';
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [deliveryMethod, setDeliveryMethod] = useState(deliveryMethods[0]);
  const [note, setNote] = useState('');

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

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const selectedReviews = useMemo(
    () => reviews.filter((review) => review.productId === selectedProduct?.id),
    [reviews, selectedProduct?.id]
  );

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setQuantity('1');
    setPaymentMethod(currentUser?.preferredPaymentMethod || paymentMethods[0]);
    setDeliveryMethod(deliveryMethods[0]);
    setNote('');
  }, [currentUser?.preferredPaymentMethod, selectedProduct]);

  const orderTotal = selectedProduct ? Number(quantity || 1) * Number(selectedProduct.price || 0) : 0;
  const rating = averageScore(selectedReviews.map((review) => review.rating));

  const submitOrder = async () => {
    const success = await placeOrder({
      productId: selectedProduct.id,
      quantity: Number(quantity || 1),
      paymentMethod,
      deliveryMethod,
      note
    });

    if (success) {
      setSelectedProductId(null);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader
        title="Marketplace"
        subtitle="Browse fresh produce, search by name or farmer, and place direct orders."
      />

      <View style={styles.statsRow}>
        <StatCard
          label="Visible listings"
          value={String(visibleProducts.length)}
          hint="Ready to browse"
          icon="🛒"
          tone="primary"
        />
        <StatCard
          label="Featured picks"
          value={String(featuredProducts.length)}
          hint="Top produce"
          icon="✨"
          tone="accent"
        />
        <StatCard
          label="Average rating"
          value={rating ? rating.toFixed(1) : '—'}
          hint="Buyer feedback"
          icon="⭐"
          tone="info"
        />
      </View>

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
          <SectionHeader title="Featured produce" subtitle="High-demand products from trusted farmers." />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {featuredProducts.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => setSelectedProductId(product.id)}
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
              onPress={() => setSelectedProductId(product.id)}
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
                    <Text style={styles.ratingText}>{stars(product.farmerRating || rating)}</Text>
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

                <Button
                  label="View details"
                  variant="secondary"
                  onPress={() => setSelectedProductId(product.id)}
                  style={styles.viewButton}
                />
              </Card>
            </Pressable>
          ))
        )}
      </View>

      <Modal visible={Boolean(selectedProduct)} animationType="slide" transparent onRequestClose={() => setSelectedProductId(null)}>
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
                    <Button label="Close" variant="ghost" onPress={() => setSelectedProductId(null)} />
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
                        description="Mobile money, bank transfer, and cash on delivery are all available in the marketplace flow."
                        tone="info"
                      />

                      <Button label="Place order" onPress={submitOrder} style={styles.orderButton} />
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
  }
});
