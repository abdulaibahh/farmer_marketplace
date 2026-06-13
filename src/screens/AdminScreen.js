import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarketplace } from '../context/MarketplaceContext';
import { availabilityLabel, averageScore, formatLeones, formatShortDate, roleLabel } from '../utils/format';
import { Badge, Button, Card, DetailModal, EmptyState, SectionHeader, StatCard } from '../components/ui';
import { colors, spacing, typeScale, weights } from '../theme';

export function AdminScreen() {
  const {
    currentUser,
    users,
    products,
    orders,
    reviews,
    analytics,
    removeProduct,
    restoreProduct,
    toggleUserStatus,
    notify
  } = useMarketplace();
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [insightKey, setInsightKey] = useState(null);

  const productRatings = useMemo(
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

  const paymentBreakdown = useMemo(() => {
    const counts = orders.reduce(
      (accumulator, order) => {
        accumulator[order.paymentMethod] = (accumulator[order.paymentMethod] || 0) + 1;
        return accumulator;
      },
      {}
    );
    return Object.entries(counts)
      .map(([method, count]) => ({ method, count }))
      .sort((left, right) => right.count - left.count);
  }, [orders]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [selectedUserId, users]
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  );
  const insightInfo = useMemo(() => {
    if (!insightKey) {
      return null;
    }

    const topPaymentMethod = paymentBreakdown[0] || null;
    const topRatedProduct = productRatings
      .filter(({ reviewCount }) => reviewCount > 0)
      .sort((left, right) => right.rating - left.rating || right.reviewCount - left.reviewCount)[0] || null;
    const firstPendingOrder = orders.find((order) => order.status === 'pending') || null;
    const firstFarmer = users.find((user) => user.role === 'farmer') || null;
    const firstBuyer = users.find((user) => user.role === 'buyer') || null;

    switch (insightKey) {
      case 'users':
        return {
          eyebrow: 'Moderation',
          title: 'User overview',
          subtitle: 'Platform accounts, active statuses, and verification coverage.',
          badgeLabel: 'Users',
          badgeTone: 'primary',
          rows: [
            ['Total users', String(analytics.totalUsers), 'All accounts currently synced to the backend.'],
            ['Suspended users', String(suspendedUsers.length), 'Accounts that need attention.'],
            ['Verified users', String(users.filter((user) => user.isVerified).length), 'Trusted profiles across the marketplace.']
          ]
        };
      case 'revenue':
        return {
          eyebrow: 'Moderation',
          title: 'Revenue overview',
          subtitle: 'Completed orders and the value they contribute to the marketplace.',
          badgeLabel: 'Revenue',
          badgeTone: 'accent',
          rows: [
            ['Total revenue', formatLeones(totalRevenue), 'Earned from delivered orders.'],
            ['Completed orders', String(completedOrders), 'Orders that are fully finished.'],
            ['Average order value', formatLeones(analytics.averageOrderValue), 'Useful for tracking basket size.']
          ]
        };
      case 'active-products':
        return {
          eyebrow: 'Moderation',
          title: 'Product visibility',
          subtitle: 'How many listings are public versus hidden.',
          badgeLabel: 'Products',
          badgeTone: 'success',
          rows: [
            ['Active products', String(analytics.activeProducts), 'Currently public and visible.'],
            ['Hidden listings', String(hiddenListings.length), 'Listings awaiting restore or review.'],
            ['Featured listings', String(products.filter((product) => product.isFeatured).length), 'Promoted items with extra visibility.']
          ]
        };
      case 'top-product':
        return {
          eyebrow: 'Moderation',
          title: 'Top product',
          subtitle: 'The listing generating the strongest activity right now.',
          badgeLabel: 'Top pick',
          badgeTone: 'info',
          rows: [
            ['Top product', analytics.topProductName || 'No product yet', 'A quick signal for what buyers are choosing most.'],
            ['Average order value', formatLeones(analytics.averageOrderValue), 'Useful when comparing high-value listings.'],
            ['Highest rated listing', topRatedProduct ? topRatedProduct.product.name : 'No rated product', topRatedProduct ? `${topRatedProduct.rating.toFixed(1)} rating · ${topRatedProduct.reviewCount} review${topRatedProduct.reviewCount === 1 ? '' : 's'}` : 'Reviews will appear once buyers complete deliveries.']
          ]
        };
      case 'pending-orders':
        return {
          eyebrow: 'Reports',
          title: 'Pending orders',
          subtitle: 'Open orders that still need attention from buyers or sellers.',
          badgeLabel: 'Pending',
          badgeTone: 'warning',
          rows: [
            ['Pending orders', String(analytics.pendingOrders), 'These orders still require action.'],
            ['Oldest pending', firstPendingOrder ? firstPendingOrder.productName : 'None', firstPendingOrder ? `${firstPendingOrder.buyerName} • ${formatLeones(firstPendingOrder.totalPrice)}` : 'No pending order is queued.'],
            ['Next step', firstPendingOrder ? 'Open the order card below' : 'No action required', firstPendingOrder ? 'Review the live order feed for more detail.' : 'The queue is clear right now.']
          ]
        };
      case 'farmers':
        return {
          eyebrow: 'Reports',
          title: 'Farmer accounts',
          subtitle: 'Seller profiles currently active in the marketplace.',
          badgeLabel: 'Farmers',
          badgeTone: 'primary',
          rows: [
            ['Farmer accounts', String(analytics.farmers), 'Seller profiles powering the marketplace.'],
            ['Example seller', firstFarmer ? firstFarmer.name : 'None', firstFarmer ? `${firstFarmer.storeName || 'No store name'} • ${firstFarmer.location || 'No location'}` : 'Create or restore a seller account to populate this list.'],
            ['Platform role', 'Seller moderation', 'Keep product listings and order flow healthy.']
          ]
        };
      case 'buyers':
        return {
          eyebrow: 'Reports',
          title: 'Buyer accounts',
          subtitle: 'Customer profiles using the marketplace to place orders.',
          badgeLabel: 'Buyers',
          badgeTone: 'accent',
          rows: [
            ['Buyer accounts', String(analytics.buyers), 'Accounts that can browse and pay.'],
            ['Example buyer', firstBuyer ? firstBuyer.name : 'None', firstBuyer ? `${firstBuyer.email} • ${firstBuyer.location || 'No location'}` : 'The buyer audience will grow as accounts register.'],
            ['Order potential', String(orders.filter((order) => order.buyerId === firstBuyer?.id).length || 0), 'How many tracked orders the sample buyer has placed.']
          ]
        };
      case 'payments':
        return {
          eyebrow: 'Reports',
          title: 'Payment methods',
          subtitle: 'How buyers prefer to settle orders right now.',
          badgeLabel: 'Payments',
          badgeTone: 'info',
          kind: 'payments',
          rows: [
            ['Tracked orders', String(orders.length), 'All orders included in the payment report.'],
            ['Most used method', topPaymentMethod ? topPaymentMethod.method : '—', topPaymentMethod ? `${topPaymentMethod.count} order${topPaymentMethod.count === 1 ? '' : 's'}` : 'No payment data yet.']
          ]
        };
      case 'feedback':
        return {
          eyebrow: 'Reports',
          title: 'Product feedback',
          subtitle: 'Average ratings and review counts across the catalogue.',
          badgeLabel: 'Feedback',
          badgeTone: 'success',
          kind: 'feedback',
          rows: [
            ['Rated products', String(productRatings.filter(({ reviewCount }) => reviewCount > 0).length), 'Listings with at least one review.'],
            ['Top reviewed', topRatedProduct ? topRatedProduct.product.name : '—', topRatedProduct ? `${topRatedProduct.reviewCount} review${topRatedProduct.reviewCount === 1 ? '' : 's'}` : 'Reviews will appear once buyers complete deliveries.']
          ]
        };
      default:
        return {
          eyebrow: 'Reports',
          title: 'Recent transactions',
          subtitle: 'Latest order feed for audit and monitoring.',
          badgeLabel: 'Transactions',
          badgeTone: 'neutral',
          kind: 'transactions',
          rows: [
            ['Recent orders', String(Math.min(orders.length, 5)), 'The latest transactions visible in this feed.'],
            ['Completed revenue', formatLeones(totalRevenue), 'Use this view to audit live business activity.']
          ]
        };
    }
  }, [
    analytics.averageOrderValue,
    analytics.buyers,
    analytics.farmers,
    analytics.pendingOrders,
    analytics.topProductName,
    analytics.totalRevenue,
    analytics.totalUsers,
    completedOrders,
    hiddenListings.length,
    insightKey,
    orders,
    paymentBreakdown,
    productRatings,
    products,
    suspendedUsers.length,
    users,
    totalRevenue
  ]);

  if (currentUser?.role !== 'admin') {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Admin console"
          subtitle="Manage users, moderate listings, and review transaction reports."
        />
        <EmptyState
          title="Admin access only"
          description="Use a provisioned admin account to open this workspace."
          icon="🛡️"
        />
      </ScrollView>
    );
  }

  const hiddenListings = products.filter((product) => !product.isVisible);
  const suspendedUsers = users.filter((user) => !user.isActive);
  const totalRevenue = analytics.totalRevenue;
  const completedOrders = analytics.completedOrders;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SectionHeader
        eyebrow="Moderation"
        title="Admin console"
        subtitle="Monitor users, listings, and transactions while keeping the marketplace clean and reliable."
      />

      <View style={styles.metricsRow}>
        <StatCard
          label="Users"
          value={String(analytics.totalUsers)}
          hint={`${suspendedUsers.length} suspended`}
          icon="👥"
          tone="primary"
          onPress={() => {
            setInsightKey('users');
            notify('info', 'Opened user overview.');
          }}
        />
        <StatCard
          label="Revenue"
          value={formatLeones(totalRevenue)}
          hint={`${completedOrders} completed`}
          icon="💰"
          tone="accent"
          onPress={() => {
            setInsightKey('revenue');
            notify('info', 'Opened revenue overview.');
          }}
        />
        <StatCard
          label="Active products"
          value={String(analytics.activeProducts)}
          hint="Public listings"
          icon="📣"
          tone="success"
          onPress={() => {
            setInsightKey('active-products');
            notify('info', 'Opened product visibility details.');
          }}
        />
      </View>

      <StatCard
        label="Top product"
        value={analytics.topProductName}
        hint={`Average order value ${formatLeones(analytics.averageOrderValue)}`}
        icon="🏆"
        tone="info"
        onPress={() => {
          setInsightKey('top-product');
          notify('info', 'Opened top product details.');
        }}
      />

      <SectionHeader
        eyebrow="People"
        title="User management"
        subtitle="Suspend inactive profiles or restore access when the issue has been resolved."
      />

      <View style={styles.grid}>
        {users.map((user) => (
          <Card
            key={user.id}
            style={styles.userCard}
            onPress={() => {
              notify('info', `Opened ${user.name}.`);
              setSelectedUserId(user.id);
            }}
            accessibilityLabel={`View ${user.name}`}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{user.name}</Text>
                <Text style={styles.cardMeta}>{user.email} • {user.location}</Text>
              </View>
              <Badge label={user.isActive ? 'Active' : 'Suspended'} tone={user.isActive ? 'success' : 'danger'} />
            </View>

            <View style={styles.badgeRow}>
              <Badge label={roleLabel(user.role)} tone={user.role === 'admin' ? 'accent' : 'primary'} />
              {user.isVerified ? <Badge label="Verified" tone="success" /> : <Badge label="Unverified" tone="warning" />}
            </View>

            <Text style={styles.cardBody}>{user.bio || 'No profile bio added yet.'}</Text>

            <Button
              label={user.isActive ? 'Suspend' : 'Restore'}
              variant={user.isActive ? 'danger' : 'secondary'}
              onPress={() => toggleUserStatus(user.id)}
              disabled={user.id === currentUser.id}
            />
          </Card>
        ))}
      </View>

      <SectionHeader
        eyebrow="Listings"
        title="Listing moderation"
        subtitle={`${hiddenListings.length} listings are currently hidden from the marketplace.`}
      />

      <View style={styles.grid}>
        {products.length === 0 ? (
          <EmptyState
            title="No listings to review"
            description="Once farmers publish produce, you can moderate the marketplace here."
            icon="🧺"
          />
        ) : (
          products.map((product) => (
          <Card
            key={product.id}
            style={styles.productCard}
            onPress={() => {
              notify('info', `Opened ${product.name}.`);
              setSelectedProductId(product.id);
            }}
            accessibilityLabel={`View ${product.name}`}
          >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{product.name}</Text>
                  <Text style={styles.cardMeta}>
                    {product.farmerName} • {product.category} • {formatShortDate(product.createdAt)}
                  </Text>
                </View>
                <Badge label={availabilityLabel(product)} tone={product.isVisible ? 'success' : 'danger'} />
              </View>

              <View style={styles.badgeRow}>
                <Badge label={formatLeones(product.price)} tone="primary" />
                <Badge label={`${product.quantity} ${product.unit}`} tone="info" />
                {product.isFeatured ? <Badge label="Featured" tone="accent" /> : null}
                {product.isVisible ? <Badge label="Public" tone="success" /> : <Badge label="Hidden" tone="danger" />}
              </View>

              <View style={styles.actionRow}>
                {product.isVisible ? (
                  <Button
                    label="Remove"
                    variant="danger"
                    onPress={() => removeProduct(product.id)}
                    style={styles.flex}
                  />
                ) : (
                  <Button
                    label="Restore"
                    variant="secondary"
                    onPress={() => restoreProduct(product.id)}
                    style={styles.flex}
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </View>

      <SectionHeader
        eyebrow="Reports"
        title="Marketplace reports"
        subtitle="Quick snapshots for transaction monitoring and business reviews."
      />

      <View style={styles.metricsRow}>
        <StatCard
          label="Pending orders"
          value={String(analytics.pendingOrders)}
          hint="Needs attention"
          icon="⏳"
          tone="warning"
          onPress={() => {
            setInsightKey('pending-orders');
            notify('info', 'Opened pending order details.');
          }}
        />
        <StatCard
          label="Farmers"
          value={String(analytics.farmers)}
          hint="Seller accounts"
          icon="🌾"
          tone="primary"
          onPress={() => {
            setInsightKey('farmers');
            notify('info', 'Opened farmer account details.');
          }}
        />
        <StatCard
          label="Buyers"
          value={String(analytics.buyers)}
          hint="Customer accounts"
          icon="🛍️"
          tone="accent"
          onPress={() => {
            setInsightKey('buyers');
            notify('info', 'Opened buyer account details.');
          }}
        />
      </View>

      <Card
        style={styles.reportCard}
        onPress={() => {
          setInsightKey('payments');
          notify('info', 'Opened payment method details.');
        }}
      >
        <SectionHeader title="Payment methods" subtitle="How buyers prefer to settle their orders." />
        {paymentBreakdown.length === 0 ? (
          <EmptyState title="No payment data" description="Orders will populate this report over time." icon="💳" />
        ) : (
          paymentBreakdown.map((item) => (
            <View key={item.method} style={styles.reportRow}>
              <Text style={styles.reportLabel}>{item.method}</Text>
              <Text style={styles.reportValue}>{item.count}</Text>
            </View>
          ))
        )}
      </Card>

      <Card
        style={styles.reportCard}
        onPress={() => {
          setInsightKey('feedback');
          notify('info', 'Opened product feedback details.');
        }}
      >
        <SectionHeader title="Product feedback" subtitle="Average ratings and review counts across the catalogue." />
        {productRatings.slice(0, 5).map(({ product, rating, reviewCount }) => (
          <View key={product.id} style={styles.reportRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportLabel}>{product.name}</Text>
              <Text style={styles.reportNote}>{reviewCount} review{reviewCount === 1 ? '' : 's'}</Text>
            </View>
            <Text style={styles.reportValue}>{rating ? rating.toFixed(1) : '—'}</Text>
          </View>
        ))}
      </Card>

      <Card
        style={styles.reportCard}
        onPress={() => {
          setInsightKey('transactions');
          notify('info', 'Opened recent transaction details.');
        }}
      >
        <SectionHeader title="Recent transactions" subtitle="Latest order feed for audit and monitoring." />
        {orders.slice(0, 5).map((order) => (
          <View key={order.id} style={styles.transactionRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reportLabel}>{order.productName}</Text>
              <Text style={styles.reportNote}>
                {order.buyerName} • {order.status} • {formatShortDate(order.createdAt)}
              </Text>
            </View>
            <Text style={styles.reportValue}>{formatLeones(order.totalPrice)}</Text>
          </View>
        ))}
      </Card>

      <DetailModal
        visible={Boolean(selectedUser)}
        eyebrow="People"
        title={selectedUser?.name || ''}
        subtitle={`${selectedUser?.email || ''} • ${selectedUser?.location || 'No location added'}`}
        badgeLabel={selectedUser ? roleLabel(selectedUser.role) : ''}
        badgeTone={selectedUser?.role === 'admin' ? 'accent' : 'primary'}
        onClose={() => setSelectedUserId(null)}
        actions={
          selectedUser && selectedUser.id !== currentUser.id ? (
            <Button
              label={selectedUser.isActive ? 'Suspend user' : 'Restore user'}
              variant={selectedUser.isActive ? 'danger' : 'secondary'}
              onPress={() => toggleUserStatus(selectedUser.id)}
            />
          ) : null
        }
      >
        {selectedUser ? (
          <View style={styles.detailStack}>
            <Card style={styles.detailSummaryCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Role</Text>
                <Text style={styles.detailValue}>{roleLabel(selectedUser.role)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={styles.detailValue}>{selectedUser.isActive ? 'Active' : 'Suspended'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Verified</Text>
                <Text style={styles.detailValue}>{selectedUser.isVerified ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{selectedUser.phone || 'No phone added'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Store</Text>
                <Text style={styles.detailValue}>{selectedUser.storeName || 'No store name added'}</Text>
              </View>
            </Card>

            <Card style={styles.detailSummaryCard}>
              <Text style={styles.detailLabel}>Bio</Text>
              <Text style={styles.detailNote}>{selectedUser.bio || 'No profile bio added yet.'}</Text>
            </Card>
          </View>
        ) : null}
      </DetailModal>

      <DetailModal
        visible={Boolean(selectedProduct)}
        eyebrow="Listings"
        title={selectedProduct?.name || ''}
        subtitle={`${selectedProduct?.farmerName || ''} • ${selectedProduct?.location || 'No location added'}`}
        badgeLabel={selectedProduct ? availabilityLabel(selectedProduct) : ''}
        badgeTone={selectedProduct?.isVisible ? 'success' : 'danger'}
        onClose={() => setSelectedProductId(null)}
        actions={
          selectedProduct ? (
            <Button
              label={selectedProduct.isVisible ? 'Remove listing' : 'Restore listing'}
              variant={selectedProduct.isVisible ? 'danger' : 'secondary'}
              onPress={() => (selectedProduct.isVisible ? removeProduct(selectedProduct.id) : restoreProduct(selectedProduct.id))}
            />
          ) : null
        }
      >
        {selectedProduct ? (
          <View style={styles.detailStack}>
            <Card style={styles.detailSummaryCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{selectedProduct.category}</Text>
              </View>
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
            {insightInfo.kind === 'payments' ? (
              <Card style={styles.insightListCard}>
                {paymentBreakdown.length === 0 ? (
                  <Text style={styles.insightEmptyText}>No payment data yet.</Text>
                ) : (
                  paymentBreakdown.map((item) => (
                    <View key={item.method} style={styles.insightListRow}>
                      <Text style={styles.insightListLabel}>{item.method}</Text>
                      <Text style={styles.insightListValue}>{item.count}</Text>
                    </View>
                  ))
                )}
              </Card>
            ) : insightInfo.kind === 'feedback' ? (
              <Card style={styles.insightListCard}>
                {productRatings.slice(0, 5).map(({ product, rating, reviewCount }) => (
                  <View key={product.id} style={styles.insightListRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.insightListLabel}>{product.name}</Text>
                      <Text style={styles.insightListNote}>{reviewCount} review{reviewCount === 1 ? '' : 's'}</Text>
                    </View>
                    <Text style={styles.insightListValue}>{rating ? rating.toFixed(1) : '—'}</Text>
                  </View>
                ))}
              </Card>
            ) : insightInfo.kind === 'transactions' ? (
              <Card style={styles.insightListCard}>
                {orders.slice(0, 5).map((order) => (
                  <View key={order.id} style={styles.insightListRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.insightListLabel}>{order.productName}</Text>
                      <Text style={styles.insightListNote}>
                        {order.buyerName} • {order.status} • {formatShortDate(order.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.insightListValue}>{formatLeones(order.totalPrice)}</Text>
                  </View>
                ))}
              </Card>
            ) : (
              insightInfo.rows.map(([label, value, note]) => (
                <Card key={label} style={styles.insightRowCard}>
                  <Text style={styles.insightRowLabel}>{label}</Text>
                  <Text style={styles.insightRowValue}>{value}</Text>
                  {note ? <Text style={styles.insightRowNote}>{note}</Text> : null}
                </Card>
              ))
            )}
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
  },
  insightListCard: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceSoft
  },
  insightListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start'
  },
  insightListLabel: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold
  },
  insightListValue: {
    color: colors.primaryDark,
    fontSize: typeScale.sm,
    fontWeight: weights.bold
  },
  insightListNote: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: 4
  },
  insightEmptyText: {
    color: colors.muted,
    fontSize: typeScale.sm
  },
  grid: {
    gap: spacing.md
  },
  userCard: {
    gap: spacing.md
  },
  productCard: {
    gap: spacing.md
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  cardTitle: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weights.bold
  },
  cardMeta: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 4
  },
  cardBody: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md
  },
  flex: {
    flex: 1
  },
  reportCard: {
    gap: spacing.sm
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm
  },
  reportLabel: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold
  },
  reportNote: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: 3
  },
  reportValue: {
    color: colors.primaryDark,
    fontSize: typeScale.md,
    fontWeight: weights.bold
  }
});
