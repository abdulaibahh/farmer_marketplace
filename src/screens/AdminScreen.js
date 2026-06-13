import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarketplace } from '../context/MarketplaceContext';
import { availabilityLabel, averageScore, formatLeones, formatShortDate, roleLabel } from '../utils/format';
import { Badge, Button, Card, EmptyState, SectionHeader, StatCard } from '../components/ui';
import { colors, spacing, typeScale, weights } from '../theme';

export function AdminScreen() {
  const { currentUser, users, products, orders, reviews, analytics, removeProduct, restoreProduct, toggleUserStatus } = useMarketplace();

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
        <StatCard label="Users" value={String(analytics.totalUsers)} hint={`${suspendedUsers.length} suspended`} icon="👥" tone="primary" />
        <StatCard label="Revenue" value={formatLeones(totalRevenue)} hint={`${completedOrders} completed`} icon="💰" tone="accent" />
        <StatCard label="Active products" value={String(analytics.activeProducts)} hint="Public listings" icon="📣" tone="success" />
      </View>

      <StatCard
        label="Top product"
        value={analytics.topProductName}
        hint={`Average order value ${formatLeones(analytics.averageOrderValue)}`}
        icon="🏆"
        tone="info"
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
              if (user.id !== currentUser.id) {
                toggleUserStatus(user.id);
              }
            }}
            accessibilityLabel={`${user.isActive ? 'Suspend' : 'Restore'} ${user.name}`}
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
              onPress={() => (product.isVisible ? removeProduct(product.id) : restoreProduct(product.id))}
              accessibilityLabel={`${product.isVisible ? 'Remove' : 'Restore'} ${product.name}`}
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
        <StatCard label="Pending orders" value={String(analytics.pendingOrders)} hint="Needs attention" icon="⏳" tone="warning" />
        <StatCard label="Farmers" value={String(analytics.farmers)} hint="Seller accounts" icon="🌾" tone="primary" />
        <StatCard label="Buyers" value={String(analytics.buyers)} hint="Customer accounts" icon="🛍️" tone="accent" />
      </View>

      <Card style={styles.reportCard}>
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

      <Card style={styles.reportCard}>
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

      <Card style={styles.reportCard}>
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
