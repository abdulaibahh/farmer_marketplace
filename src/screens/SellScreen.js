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
  DetailModal,
  Input,
  ProductMedia,
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
    deliverOrder,
    notify
  } = useMarketplace();

  const [draft, setDraft] = useState(emptyDraft);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [insightKey, setInsightKey] = useState(null);

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
  const selectedProduct = useMemo(
    () => farmerProducts.find((product) => product.id === selectedProductId) || null,
    [farmerProducts, selectedProductId]
  );
  const selectedOrder = useMemo(
    () => farmerOrders.find((order) => order.id === selectedOrderId) || null,
    [farmerOrders, selectedOrderId]
  );
  const isFarmer = currentUser?.role === 'farmer';

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
  const insightInfo = useMemo(() => {
    if (!insightKey) {
      return null;
    }

    if (!isFarmer) {
      switch (insightKey) {
        case 'access-listings':
          return {
            eyebrow: 'Farmer access',
            title: 'Listings dashboard',
            subtitle: 'This workspace unlocks once you sign in with a farmer account.',
            badgeLabel: 'Locked',
            badgeTone: 'warning',
            rows: [
              ['Role needed', 'Farmer account', 'Use a seller login to publish listings.'],
              ['What you can do', 'Add, edit, and pause products', 'Manage your storefront from one place.'],
              ['Tip', 'Switch accounts to continue', 'The same account can still browse the market as a buyer if it has the right role.']
            ]
          };
        case 'access-orders':
          return {
            eyebrow: 'Farmer access',
            title: 'Incoming orders',
            subtitle: 'Buyer requests appear here after you publish products.',
            badgeLabel: 'Locked',
            badgeTone: 'warning',
            rows: [
              ['What appears here', 'Confirmations and delivery updates', 'Track every buyer request from this dashboard.'],
              ['Why it is locked', 'Seller actions need a farmer role', 'A buyer account cannot confirm or deliver orders.'],
              ['Next step', 'Sign in as a farmer', 'Publish a product first, then orders will begin to flow in.']
            ]
          };
        default:
          return {
            eyebrow: 'Farmer access',
            title: 'Sales reporting',
            subtitle: 'Revenue and performance insights are available after you publish listings.',
            badgeLabel: 'Locked',
            badgeTone: 'warning',
            rows: [
              ['Revenue', 'Unavailable for buyers', 'Seller revenue only appears for farmer accounts.'],
              ['Reviews', 'Unlocked after delivery', 'Buyer feedback helps build trust.'],
              ['Action', 'Switch to a farmer account', 'You can then manage the storefront and monitor sales.']
            ]
          };
      }
    }

    const firstListing = farmerProducts[0] || null;
    const firstPendingOrder = pendingOrders[0] || null;
    const firstConfirmedOrder = confirmedOrders[0] || null;
    const firstDeliveredOrder = deliveredOrders[0] || null;

    switch (insightKey) {
      case 'listings':
        return {
          eyebrow: 'Farmer tools',
          title: 'Your listings',
          subtitle: 'A quick summary of the products published from this account.',
          badgeLabel: 'Listings',
          badgeTone: 'primary',
          rows: [
            ['Total listings', String(farmerProducts.length), 'Products currently attached to your farm.'],
            ['Visible listings', String(farmerProducts.filter((product) => product.isVisible).length), 'Products buyers can browse right now.'],
            ['Featured items', String(farmerProducts.filter((product) => product.isFeatured).length), 'Listings promoted near the top of the market.']
          ],
          actionLabel: firstListing ? 'Open first listing' : null,
          actionPress: () => {
            if (!firstListing) {
              setInsightKey(null);
              return;
            }

            notify('info', `Viewing ${firstListing.name}.`);
            setSelectedProductId(firstListing.id);
            setInsightKey(null);
          }
        };
      case 'pending':
        return {
          eyebrow: 'Farmer tools',
          title: 'Awaiting action',
          subtitle: 'Buyer orders that still need confirmation or completion.',
          badgeLabel: 'Pending',
          badgeTone: 'accent',
          rows: [
            ['Pending orders', String(pendingOrders.length), 'Orders waiting for the next action.'],
            ['Latest request', firstPendingOrder ? firstPendingOrder.productName : 'None', firstPendingOrder ? `${firstPendingOrder.buyerName} • ${formatLeones(firstPendingOrder.totalPrice)}` : 'No buyer has requested a product yet.'],
            ['What to do next', firstPendingOrder ? 'Confirm the order or review the note' : 'Keep publishing fresh produce', firstPendingOrder ? 'Open the order details to act on it.' : 'More listings usually lead to more orders.']
          ],
          actionLabel: firstPendingOrder ? 'Open first pending order' : null,
          actionPress: () => {
            if (!firstPendingOrder) {
              setInsightKey(null);
              return;
            }

            notify('info', `Viewing ${firstPendingOrder.productName}.`);
            setSelectedOrderId(firstPendingOrder.id);
            setInsightKey(null);
          }
        };
      case 'revenue':
        return {
          eyebrow: 'Farmer tools',
          title: 'Revenue overview',
          subtitle: 'Completed sales and the trust they generate.',
          badgeLabel: 'Revenue',
          badgeTone: 'info',
          rows: [
            ['Completed revenue', formatLeones(farmRevenue), 'Only delivered orders contribute to revenue.'],
            ['Delivered orders', String(deliveredOrders.length), 'Closed and completed transactions.'],
            ['Average rating', averageRating ? averageRating.toFixed(1) : '—', 'Buyer feedback after delivery.']
          ],
          actionLabel: firstDeliveredOrder ? 'Open delivered order' : null,
          actionPress: () => {
            if (!firstDeliveredOrder) {
              setInsightKey(null);
              return;
            }

            notify('info', `Viewing ${firstDeliveredOrder.productName}.`);
            setSelectedOrderId(firstDeliveredOrder.id);
            setInsightKey(null);
          }
        };
      case 'confirmed':
        return {
          eyebrow: 'Farmer tools',
          title: 'Confirmed orders',
          subtitle: 'Orders that are already approved and moving through fulfilment.',
          badgeLabel: 'Confirmed',
          badgeTone: 'accent',
          rows: [
            ['Confirmed orders', String(confirmedOrders.length), 'Buyers have already approved these requests.'],
            ['Next delivery', firstConfirmedOrder ? firstConfirmedOrder.productName : 'None', firstConfirmedOrder ? `${firstConfirmedOrder.buyerName} • ${firstConfirmedOrder.deliveryMethod}` : 'No confirmed orders need action.'],
            ['Outstanding total', formatLeones(confirmedOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)), 'This amount becomes revenue once delivered.']
          ],
          actionLabel: firstConfirmedOrder ? 'Open confirmed order' : null,
          actionPress: () => {
            if (!firstConfirmedOrder) {
              setInsightKey(null);
              return;
            }

            notify('info', `Viewing ${firstConfirmedOrder.productName}.`);
            setSelectedOrderId(firstConfirmedOrder.id);
            setInsightKey(null);
          }
        };
      case 'delivered':
        return {
          eyebrow: 'Farmer tools',
          title: 'Delivered orders',
          subtitle: 'Completed orders that now contribute to farm revenue.',
          badgeLabel: 'Delivered',
          badgeTone: 'success',
          rows: [
            ['Delivered orders', String(deliveredOrders.length), 'All fulfilled and closed transactions.'],
            ['Revenue collected', formatLeones(farmRevenue), 'Delivered orders add to the payout total.'],
            ['Latest delivery', firstDeliveredOrder ? firstDeliveredOrder.productName : 'None', firstDeliveredOrder ? `${firstDeliveredOrder.buyerName} • ${formatShortDate(firstDeliveredOrder.createdAt)}` : 'No deliveries have been completed yet.']
          ],
          actionLabel: firstDeliveredOrder ? 'Open delivered order' : null,
          actionPress: () => {
            if (!firstDeliveredOrder) {
              setInsightKey(null);
              return;
            }

            notify('info', `Viewing ${firstDeliveredOrder.productName}.`);
            setSelectedOrderId(firstDeliveredOrder.id);
            setInsightKey(null);
          }
        };
      default:
        return {
          eyebrow: 'Farmer tools',
          title: 'Buyer feedback',
          subtitle: 'How shoppers rated the last completed orders.',
          badgeLabel: 'Reviews',
          badgeTone: 'info',
          rows: [
            ['Reviews', String(farmerReviews.length), 'Delivered orders can now be reviewed by buyers.'],
            ['Average rating', averageRating ? averageRating.toFixed(1) : '—', 'A higher score helps convert new shoppers.'],
            ['Trust signal', averageRating >= 4 ? 'Strong' : 'Buildable', 'Use clean images and reliable fulfilment to improve ratings.']
          ]
        };
    }
  }, [
    averageRating,
    confirmedOrders,
    deliveredOrders,
    farmerProducts,
    farmerReviews.length,
    farmRevenue,
    insightKey,
    isFarmer,
    pendingOrders
  ]);

  if (currentUser?.role !== 'farmer') {
    return (
      <>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Seller dashboard"
          subtitle="Farmers manage product listings, receive orders, and track sales from this workspace."
        />
        <Callout
          title="Farmer account required"
          description="Log in with a farmer account to create listings and manage incoming orders from the seller workspace."
          tone="warning"
        />
        <View style={styles.metricsRow}>
          <StatCard
            label="Listings"
            value="—"
            hint="Sign in as farmer"
            icon="🌾"
            tone="primary"
            onPress={() => {
              setInsightKey('access-listings');
              notify('info', 'Opened farmer access details.');
            }}
          />
          <StatCard
            label="Orders"
            value="—"
            hint="Sign in as farmer"
            icon="📦"
            tone="accent"
            onPress={() => {
              setInsightKey('access-orders');
              notify('info', 'Opened farmer access details.');
            }}
          />
          <StatCard
            label="Revenue"
            value="—"
            hint="Sign in as farmer"
            icon="💰"
            tone="info"
            onPress={() => {
              setInsightKey('access-revenue');
              notify('info', 'Opened farmer access details.');
            }}
          />
        </View>
      </ScrollView>
      <DetailModal
        visible={Boolean(insightInfo)}
        eyebrow={insightInfo?.eyebrow}
        title={insightInfo?.title || ''}
        subtitle={insightInfo?.subtitle || ''}
        badgeLabel={insightInfo?.badgeLabel}
        badgeTone={insightInfo?.badgeTone}
        onClose={() => setInsightKey(null)}
      >
        {insightInfo ? (
          <View style={styles.insightStack}>
            {insightInfo.rows.map(([label, value, note]) => (
              <Card key={label} style={styles.insightRowCard}>
                <Text style={styles.insightRowLabel}>{label}</Text>
                <Text style={styles.insightRowValue}>{value}</Text>
                {note ? <Text style={styles.insightRowNote}>{note}</Text> : null}
              </Card>
            ))}
          </View>
        ) : null}
      </DetailModal>
      </>
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
    notify('info', `Editing ${product.name}.`);
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

  const clearDraft = () => {
    setDraft(emptyDraft);
    notify('info', 'Draft cleared.');
  };

  const openProductDetails = (product) => {
    setSelectedProductId(product.id);
    notify('info', `Viewing ${product.name}.`);
  };

  const openOrderDetails = (order) => {
    setSelectedOrderId(order.id);
    notify('info', `Viewing ${order.productName}.`);
  };

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
          onPress={() => {
            setInsightKey('listings');
            notify('info', 'Opened listing details.');
          }}
        />
        <StatCard
          label="Awaiting action"
          value={String(pendingOrders.length)}
          hint="Pending orders"
          icon="⏳"
          tone="accent"
          onPress={() => {
            setInsightKey('pending');
            notify('info', 'Opened order queue details.');
          }}
        />
        <StatCard
          label="Revenue"
          value={formatLeones(farmRevenue)}
          hint={`Avg rating ${averageRating ? averageRating.toFixed(1) : '—'}`}
          icon="💰"
          tone="info"
          onPress={() => {
            setInsightKey('revenue');
            notify('info', 'Opened revenue details.');
          }}
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
              onPress={() => openProductDetails(product)}
              accessibilityLabel={`View ${product.name}`}
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
              onPress={() => openOrderDetails(order)}
              accessibilityLabel={`View ${order.productName}`}
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
        <StatCard
          label="Confirmed"
          value={String(confirmedOrders.length)}
          hint="In progress"
          icon="✅"
          tone="accent"
          onPress={() => {
            setInsightKey('confirmed');
            notify('info', 'Opened confirmed order details.');
          }}
        />
        <StatCard
          label="Delivered"
          value={String(deliveredOrders.length)}
          hint="Completed"
          icon="🚚"
          tone="success"
          onPress={() => {
            setInsightKey('delivered');
            notify('info', 'Opened delivered order details.');
          }}
        />
        <StatCard
          label="Reviews"
          value={String(farmerReviews.length)}
          hint="Buyer feedback"
          icon="⭐"
          tone="info"
          onPress={() => {
            setInsightKey('reviews');
            notify('info', 'Opened buyer feedback details.');
          }}
        />
      </View>

      <DetailModal
        visible={Boolean(selectedProduct)}
        eyebrow="Listing details"
        title={selectedProduct?.name || ''}
        subtitle={`${selectedProduct?.category || ''} • ${selectedProduct?.location || 'No location added'}`}
        badgeLabel={selectedProduct ? availabilityLabel(selectedProduct) : ''}
        badgeTone={selectedProduct?.isAvailable ? 'success' : 'danger'}
        onClose={() => setSelectedProductId(null)}
        actions={
          selectedProduct ? (
            <View style={styles.detailActionRow}>
              <Button
                label="Edit listing"
                variant="secondary"
                onPress={() => {
                  editProduct(selectedProduct);
                  setSelectedProductId(null);
                }}
                style={styles.flex}
              />
              <Button
                label={selectedProduct.isAvailable ? 'Pause' : 'Resume'}
                variant="accent"
                onPress={() => toggleProductAvailability(selectedProduct.id, !selectedProduct.isAvailable)}
                style={styles.flex}
              />
            </View>
          ) : null
        }
      >
        {selectedProduct ? (
          <View style={styles.detailStack}>
            <ProductMedia uri={selectedProduct.imageUrl} title={selectedProduct.name} category={selectedProduct.category} />

            <Card style={styles.detailSummaryCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price</Text>
                <Text style={styles.detailValue}>{formatLeones(selectedProduct.price)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stock</Text>
                <Text style={styles.detailValue}>
                  {selectedProduct.quantity} {selectedProduct.unit}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Featured</Text>
                <Text style={styles.detailValue}>{selectedProduct.isFeatured ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Visible</Text>
                <Text style={styles.detailValue}>{selectedProduct.isVisible ? 'Public' : 'Hidden'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{formatShortDate(selectedProduct.createdAt)}</Text>
              </View>
            </Card>

            <Card style={styles.detailSummaryCard}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailNote}>{selectedProduct.description || 'No description added.'}</Text>
            </Card>
          </View>
        ) : null}
      </DetailModal>

      <DetailModal
        visible={Boolean(selectedOrder)}
        eyebrow="Order details"
        title={selectedOrder?.productName || ''}
        subtitle={`${selectedOrder?.quantity || ''} ${selectedOrder?.unit || ''} • Buyer: ${selectedOrder?.buyerName || '—'}`}
        badgeLabel={selectedOrder?.status || ''}
        badgeTone={selectedOrder?.status === 'delivered' ? 'success' : selectedOrder?.status === 'pending' ? 'warning' : 'info'}
        onClose={() => setSelectedOrderId(null)}
        actions={
          selectedOrder ? (
            <View style={styles.detailActionRow}>
              {selectedOrder.status === 'pending' ? (
                <Button
                  label="Confirm order"
                  onPress={() => confirmOrder(selectedOrder.id)}
                  style={styles.flex}
                />
              ) : (
                <Button
                  label={selectedOrder.status === 'confirmed' ? 'Mark delivered' : 'Completed'}
                  variant={selectedOrder.status === 'confirmed' ? 'accent' : 'secondary'}
                  onPress={() => (selectedOrder.status === 'confirmed' ? deliverOrder(selectedOrder.id) : null)}
                  disabled={selectedOrder.status !== 'confirmed'}
                  style={styles.flex}
                />
              )}
            </View>
          ) : null
        }
      >
        {selectedOrder ? (
          <View style={styles.detailStack}>
            <Card style={styles.detailSummaryCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment</Text>
                <Text style={styles.detailValue}>{selectedOrder.paymentMethod}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Delivery</Text>
                <Text style={styles.detailValue}>{selectedOrder.deliveryMethod}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text style={styles.detailValue}>{formatLeones(selectedOrder.totalPrice)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{formatShortDate(selectedOrder.createdAt)}</Text>
              </View>
            </Card>

            <Card style={styles.detailSummaryCard}>
              <Text style={styles.detailLabel}>Customer note</Text>
              <Text style={styles.detailNote}>{selectedOrder.note || 'No special delivery note.'}</Text>
            </Card>
          </View>
        ) : null}
      </DetailModal>

      <DetailModal
        visible={Boolean(insightInfo)}
        eyebrow={insightInfo?.eyebrow}
        title={insightInfo?.title || ''}
        subtitle={insightInfo?.subtitle || ''}
        badgeLabel={insightInfo?.badgeLabel}
        badgeTone={insightInfo?.badgeTone}
        onClose={() => setInsightKey(null)}
        actions={
          insightInfo?.actionLabel ? (
            <Button
              label={insightInfo.actionLabel}
              onPress={async () => {
                await insightInfo.actionPress?.();
              }}
            />
          ) : null
        }
      >
        {insightInfo ? (
          <View style={styles.insightStack}>
            {insightInfo.rows.map(([label, value, note]) => (
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
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  detailStack: {
    gap: spacing.md
  },
  detailSummaryCard: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  detailLabel: {
    color: colors.muted,
    fontSize: typeScale.xs
  },
  detailValue: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold,
    textAlign: 'right',
    flexShrink: 1
  },
  detailNote: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  },
  detailActionRow: {
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
