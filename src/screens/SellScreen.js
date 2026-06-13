import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarketplace } from '../context/MarketplaceContext';
import { categoryOptions } from '../data/catalog';
import { availabilityLabel, averageScore, formatLeones, formatShortDate } from '../utils/format';
import {
  Badge,
  Button,
  Card,
  Callout,
  Chip,
  Divider,
  EmptyState,
  FieldRow,
  Input,
  SectionHeader,
  StatCard,
  ToggleField
} from '../components/ui';
import { colors, radius, spacing, typeScale, weights } from '../theme';

const unitOptions = ['kg', 'bag', 'bundle', 'crate', 'sack', 'basket'];

const emptyDraft = {
  id: null,
  name: '',
  category: categoryOptions[1],
  price: '',
  quantity: '',
  unit: unitOptions[1],
  location: '',
  imageUrl: '',
  description: '',
  isFeatured: false,
  isAvailable: true
};

export function SellScreen() {
  const {
    currentUser,
    products,
    orders,
    reviews,
    addProduct,
    updateProduct,
    toggleProductAvailability,
    confirmOrder,
    deliverOrder
  } = useMarketplace();

  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    if (!draft.id) {
      return;
    }

    const nextDraft = products.find((product) => product.id === draft.id);
    if (!nextDraft) {
      setDraft(emptyDraft);
    }
  }, [draft.id, products]);

  const farmerProducts = useMemo(
    () => products.filter((product) => product.farmerId === currentUser?.id),
    [currentUser?.id, products]
  );

  const farmerOrders = useMemo(
    () => orders.filter((order) => order.farmerId === currentUser?.id),
    [currentUser?.id, orders]
  );

  const farmerReviews = useMemo(
    () => reviews.filter((review) => review.sellerId === currentUser?.id),
    [currentUser?.id, reviews]
  );

  const farmRevenue = useMemo(
    () =>
      farmerOrders.reduce(
        (sum, order) => sum + (order.status === 'delivered' ? Number(order.totalPrice || 0) : 0),
        0
      ),
    [farmerOrders]
  );

  const pendingOrders = farmerOrders.filter((order) => order.status === 'pending');
  const confirmedOrders = farmerOrders.filter((order) => order.status === 'confirmed');
  const deliveredOrders = farmerOrders.filter((order) => order.status === 'delivered');
  const averageRating = averageScore(farmerReviews.map((review) => review.rating));

  if (currentUser?.role !== 'farmer') {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Seller dashboard"
          subtitle="Farmers manage product listings, receive orders, and track sales from this workspace."
        />
        <Callout
          title="Farmer account required"
          description="Log in with a farmer account to create listings and manage incoming orders from the live backend."
          tone="warning"
        />
        <View style={styles.metricsRow}>
          <StatCard label="Listings" value="—" hint="Sign in as farmer" icon="🌾" tone="primary" />
          <StatCard label="Orders" value="—" hint="Sign in as farmer" icon="📦" tone="accent" />
          <StatCard label="Revenue" value="—" hint="Sign in as farmer" icon="💰" tone="info" />
        </View>
      </ScrollView>
    );
  }

  const saveDraft = async () => {
    const payload = {
      name: draft.name.trim(),
      category: draft.category,
      price: Number(draft.price || 0),
      quantity: Number(draft.quantity || 0),
      unit: draft.unit,
      location: draft.location.trim(),
      imageUrl: draft.imageUrl.trim(),
      description: draft.description.trim(),
      isFeatured: Boolean(draft.isFeatured),
      isAvailable: Boolean(draft.isAvailable)
    };

    const success = draft.id ? await updateProduct(draft.id, payload) : await addProduct(payload);

    if (success) {
      setDraft(emptyDraft);
    }
  };

  const editProduct = (product) => {
    setDraft({
      id: product.id,
      name: product.name,
      category: product.category,
      price: String(product.price || ''),
      quantity: String(product.quantity || ''),
      unit: product.unit,
      location: product.location,
      imageUrl: product.imageUrl,
      description: product.description,
      isFeatured: Boolean(product.isFeatured),
      isAvailable: Boolean(product.isAvailable)
    });
  };

  const clearDraft = () => setDraft(emptyDraft);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SectionHeader
        eyebrow="Farmer tools"
        title="Seller dashboard"
        subtitle="Add new farm produce, update stock levels, and respond to buyer orders."
      />

      <View style={styles.metricsRow}>
        <StatCard
          label="Listings"
          value={String(farmerProducts.length)}
          hint="Your products"
          icon="🌾"
          tone="primary"
        />
        <StatCard
          label="Awaiting action"
          value={String(pendingOrders.length)}
          hint="Pending orders"
          icon="⏳"
          tone="accent"
        />
        <StatCard
          label="Revenue"
          value={formatLeones(farmRevenue)}
          hint={`Avg rating ${averageRating ? averageRating.toFixed(1) : '—'}`}
          icon="💰"
          tone="info"
        />
      </View>

      <Card style={styles.panel}>
        <SectionHeader
          title={draft.id ? 'Edit listing' : 'New product listing'}
          subtitle="Complete the form and save the product to publish it on the marketplace."
          action={draft.id ? <Chip label="Cancel edit" onPress={clearDraft} /> : null}
        />

        <Input
          label="Product name"
          placeholder="e.g. Fresh tomatoes"
          value={draft.name}
          onChangeText={(text) => setDraft((current) => ({ ...current, name: text }))}
        />

        <View style={styles.optionGroup}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipRow}>
            {categoryOptions.slice(1).map((option) => (
              <Chip
                key={option}
                label={option}
                active={draft.category === option}
                onPress={() => setDraft((current) => ({ ...current, category: option }))}
              />
            ))}
          </View>
        </View>

        <FieldRow style={{ marginTop: spacing.md }}>
          <Input
            label="Price"
            placeholder="125000"
            value={draft.price}
            onChangeText={(text) => setDraft((current) => ({ ...current, price: text }))}
            keyboardType="number-pad"
            style={styles.flex}
          />
          <Input
            label="Quantity"
            placeholder="40"
            value={draft.quantity}
            onChangeText={(text) => setDraft((current) => ({ ...current, quantity: text }))}
            keyboardType="number-pad"
            style={styles.flex}
          />
        </FieldRow>

        <View style={styles.optionGroup}>
          <Text style={styles.sectionLabel}>Unit</Text>
          <View style={styles.chipRow}>
            {unitOptions.map((option) => (
              <Chip
                key={option}
                label={option}
                active={draft.unit === option}
                onPress={() => setDraft((current) => ({ ...current, unit: option }))}
              />
            ))}
          </View>
        </View>

        <FieldRow style={{ marginTop: spacing.md }}>
          <Input
            label="Location"
            placeholder="District or city"
            value={draft.location}
            onChangeText={(text) => setDraft((current) => ({ ...current, location: text }))}
            style={styles.flex}
          />
          <Input
            label="Image URL"
            placeholder="https://..."
            value={draft.imageUrl}
            onChangeText={(text) => setDraft((current) => ({ ...current, imageUrl: text }))}
            style={styles.flex}
          />
        </FieldRow>

        <Input
          label="Product description"
          placeholder="Describe quality, source, and packing details."
          value={draft.description}
          onChangeText={(text) => setDraft((current) => ({ ...current, description: text }))}
          multiline
          numberOfLines={4}
          style={styles.field}
        />

        <View style={styles.switchRow}>
          <ToggleField
            label="Mark as featured"
            helper="Featured products are highlighted in the marketplace."
            value={draft.isFeatured}
            onValueChange={(value) => setDraft((current) => ({ ...current, isFeatured: value }))}
          />
          <Divider />
          <ToggleField
            label="Available for orders"
            helper="Turn this off when stock is temporarily out."
            value={draft.isAvailable}
            onValueChange={(value) => setDraft((current) => ({ ...current, isAvailable: value }))}
          />
        </View>

        <View style={styles.buttonRow}>
          <Button
            label={draft.id ? 'Update listing' : 'Add listing'}
            onPress={saveDraft}
            style={styles.flex}
          />
          <Button label="Clear" variant="secondary" onPress={clearDraft} style={styles.clearButton} />
        </View>
      </Card>

      <SectionHeader
        eyebrow="Inventory"
        title="Your listings"
        subtitle={farmerProducts.length ? 'Tap edit to change price, stock, or details.' : 'No listings yet.'}
      />

      <View style={styles.grid}>
        {farmerProducts.length === 0 ? (
          <EmptyState
            title="Nothing listed yet"
            description="Add your first produce listing using the form above."
            icon="🌱"
          />
        ) : (
          farmerProducts.map((product) => (
            <Card
              key={product.id}
              style={styles.productCard}
              onPress={() => editProduct(product)}
              accessibilityLabel={`Edit ${product.name}`}
            >
              <View style={styles.productTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productTitle}>{product.name}</Text>
                  <Text style={styles.productMeta}>
                    {product.category} • {product.location} • {formatShortDate(product.createdAt)}
                  </Text>
                </View>
                <Badge
                  label={availabilityLabel(product)}
                  tone={product.isAvailable ? 'success' : 'danger'}
                />
              </View>

              <View style={styles.badgeRow}>
                <Badge label={formatLeones(product.price)} tone="primary" />
                <Badge label={`${product.quantity} ${product.unit}`} tone="info" />
                {product.isFeatured ? <Badge label="Featured" tone="accent" /> : null}
                {product.isVisible ? <Badge label="Visible" tone="success" /> : <Badge label="Hidden" tone="danger" />}
              </View>

              <Text style={styles.productDescription} numberOfLines={2}>
                {product.description}
              </Text>

              <View style={styles.buttonRow}>
                <Button
                  label="Edit"
                  variant="secondary"
                  onPress={() => editProduct(product)}
                  style={styles.flex}
                />
                <Button
                  label={product.isAvailable ? 'Pause' : 'Resume'}
                  variant="accent"
                  onPress={() => toggleProductAvailability(product.id, !product.isAvailable)}
                  style={styles.flex}
                />
              </View>
            </Card>
          ))
        )}
      </View>

      <SectionHeader
        eyebrow="Orders"
        title="Incoming orders"
        subtitle={farmerOrders.length ? 'Confirm or complete orders as they move through the system.' : 'No orders yet.'}
      />

      <View style={styles.grid}>
        {farmerOrders.length === 0 ? (
          <EmptyState
            title="No incoming orders"
            description="Buyer orders will appear here once products are listed and purchased."
            icon="📬"
          />
        ) : (
          farmerOrders.map((order) => (
            <Card
              key={order.id}
              style={styles.orderCard}
              onPress={() => (order.status === 'pending' ? confirmOrder(order.id) : order.status === 'confirmed' ? deliverOrder(order.id) : null)}
              accessibilityLabel={`${order.status === 'pending' ? 'Confirm' : order.status === 'confirmed' ? 'Deliver' : 'View'} ${order.productName}`}
            >
              <View style={styles.productTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productTitle}>{order.productName}</Text>
                  <Text style={styles.productMeta}>
                    Buyer: {order.buyerName} • {order.quantity} {order.unit}
                  </Text>
                </View>
                <Badge label={order.status} tone={order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'info'} />
              </View>

              <View style={styles.badgeRow}>
                <Badge label={formatLeones(order.totalPrice)} tone="primary" />
                <Badge label={order.paymentMethod} tone={order.paymentStatus === 'paid' ? 'success' : 'warning'} />
                <Badge label={order.deliveryMethod} tone="info" />
              </View>

              <Text style={styles.orderNote}>{order.note || 'No special delivery note.'}</Text>

              <View style={styles.buttonRow}>
                {order.status === 'pending' ? (
                  <Button
                    label="Confirm order"
                    onPress={() => confirmOrder(order.id)}
                    style={styles.flex}
                  />
                ) : (
                  <Button
                    label={order.status === 'confirmed' ? 'Mark delivered' : 'Completed'}
                    onPress={() => (order.status === 'confirmed' ? deliverOrder(order.id) : null)}
                    variant={order.status === 'confirmed' ? 'accent' : 'secondary'}
                    disabled={order.status !== 'confirmed'}
                    style={styles.flex}
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </View>

      <SectionHeader eyebrow="Performance" title="Sales history" subtitle="Completed orders and revenue built from your farm listings." />
      <View style={styles.metricsRow}>
        <StatCard label="Confirmed" value={String(confirmedOrders.length)} hint="In progress" icon="✅" tone="accent" />
        <StatCard label="Delivered" value={String(deliveredOrders.length)} hint="Completed" icon="🚚" tone="success" />
        <StatCard label="Reviews" value={String(farmerReviews.length)} hint="Buyer feedback" icon="⭐" tone="info" />
      </View>
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
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  panel: {
    gap: spacing.md
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
  optionGroup: {
    gap: spacing.sm
  },
  field: {
    marginTop: spacing.md
  },
  switchRow: {
    gap: spacing.sm
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  flex: {
    flex: 1
  },
  clearButton: {
    minWidth: 92
  },
  grid: {
    gap: spacing.md
  },
  productCard: {
    gap: spacing.md
  },
  productTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
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
  orderCard: {
    gap: spacing.md,
    backgroundColor: colors.surfaceSoft
  },
  orderNote: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  }
});
