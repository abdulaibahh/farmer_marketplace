import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarketplace } from '../context/MarketplaceContext';
import { formatLeones, formatShortDate } from '../utils/format';
import { Badge, Button, Card, EmptyState, Input, SectionHeader, StatCard, Chip } from '../components/ui';
import { colors, radius, spacing, typeScale, weights } from '../theme';

function stars(count) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(count || 0))));
  return '★★★★★'.slice(0, rounded) + '☆☆☆☆☆'.slice(0, 5 - rounded);
}

export function OrdersScreen() {
  const { currentUser, orders, addReview, confirmOrder, deliverOrder } = useMarketplace();
  const [reviewTargetId, setReviewTargetId] = useState(null);
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');

  const scopedOrders = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (currentUser.role === 'buyer') {
      return orders.filter((order) => order.buyerId === currentUser.id);
    }

    if (currentUser.role === 'farmer') {
      return orders.filter((order) => order.farmerId === currentUser.id);
    }

    return orders;
  }, [currentUser, orders]);

  const totals = useMemo(() => {
    const totalValue = scopedOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);
    const pending = scopedOrders.filter((order) => order.status === 'pending').length;
    const confirmed = scopedOrders.filter((order) => order.status === 'confirmed').length;
    const delivered = scopedOrders.filter((order) => order.status === 'delivered').length;
    return { totalValue, pending, confirmed, delivered };
  }, [scopedOrders]);

  const openReview = (orderId) => {
    setReviewTargetId(orderId);
    setReviewRating('5');
    setReviewComment('');
  };

  const submitReview = async () => {
    const success = await addReview({
      orderId: reviewTargetId,
      rating: Number(reviewRating || 5),
      comment: reviewComment
    });

    if (success) {
      setReviewTargetId(null);
    }
  };

  if (!currentUser) {
    return null;
  }

  const isBuyer = currentUser.role === 'buyer';
  const isFarmer = currentUser.role === 'farmer';
  const title = currentUser.role === 'buyer' ? 'My orders' : currentUser.role === 'farmer' ? 'Sales orders' : 'All transactions';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SectionHeader
        title={title}
        subtitle={
          isBuyer
            ? 'Track purchases, delivery updates, and leave feedback when the order is completed.'
            : 'Monitor buyer requests, payment methods, and fulfillment progress.'
        }
      />

      <View style={styles.metricsRow}>
        <StatCard label="Pending" value={String(totals.pending)} hint="Awaiting action" icon="⏳" tone="warning" />
        <StatCard label="Confirmed" value={String(totals.confirmed)} hint="In progress" icon="✅" tone="accent" />
        <StatCard label="Delivered" value={String(totals.delivered)} hint="Completed" icon="🚚" tone="success" />
      </View>

      <StatCard
        label="Total order value"
        value={formatLeones(totals.totalValue)}
        hint={`${scopedOrders.length} tracked orders`}
        icon="💰"
        tone="info"
      />

      <SectionHeader
        title={isBuyer ? 'Purchase history' : 'Order feed'}
        subtitle={scopedOrders.length ? 'Most recent activity appears first.' : 'No orders to show yet.'}
      />

      <View style={styles.grid}>
        {scopedOrders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Place an order from the marketplace or wait for buyer requests to arrive."
            icon="📦"
          />
        ) : (
          scopedOrders.map((order) => (
            <Card key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderTitle}>{order.productName}</Text>
                  <Text style={styles.orderMeta}>
                    {isBuyer ? `Farmer: ${order.farmerName}` : `Buyer: ${order.buyerName}`} • {formatShortDate(order.createdAt)}
                  </Text>
                </View>
                <Badge
                  label={order.status}
                  tone={order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'warning' : 'info'}
                />
              </View>

              <View style={styles.badgeRow}>
                <Badge label={`${order.quantity} ${order.unit}`} tone="primary" />
                <Badge label={formatLeones(order.totalPrice)} tone="accent" />
                <Badge label={order.paymentMethod} tone={order.paymentStatus === 'paid' ? 'success' : 'warning'} />
                <Badge label={order.deliveryMethod} tone="info" />
              </View>

              <Text style={styles.orderNote}>{order.note || 'No special note supplied.'}</Text>

              {isBuyer && order.status === 'delivered' && !order.reviewed ? (
                reviewTargetId === order.id ? (
                  <Card style={styles.reviewCard}>
                    <SectionHeader title="Leave review" subtitle="Rate the seller and share a short comment." />
                    <View style={styles.chipRow}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Chip
                          key={score}
                          label={`${score}★`}
                          active={Number(reviewRating) === score}
                          onPress={() => setReviewRating(String(score))}
                        />
                      ))}
                    </View>
                    <Input
                      label="Comment"
                      placeholder="Describe quality, communication, and delivery."
                      value={reviewComment}
                      onChangeText={setReviewComment}
                      multiline
                      numberOfLines={3}
                    />
                    <View style={styles.buttonRow}>
                      <Button label="Submit review" onPress={submitReview} style={styles.flex} />
                      <Button
                        label="Cancel"
                        variant="secondary"
                        onPress={() => setReviewTargetId(null)}
                        style={styles.cancelButton}
                      />
                    </View>
                  </Card>
                ) : (
                  <Button label="Leave review" variant="accent" onPress={() => openReview(order.id)} />
                )
              ) : null}

              {!isBuyer ? (
                <View style={styles.buttonRow}>
                  {order.status === 'pending' ? (
                    <Button
                      label="Confirm"
                      onPress={() => confirmOrder(order.id)}
                      style={styles.flex}
                    />
                  ) : (
                    <Button
                      label={order.status === 'confirmed' ? 'Mark delivered' : 'Completed'}
                      variant={order.status === 'confirmed' ? 'accent' : 'secondary'}
                      onPress={() => (order.status === 'confirmed' ? deliverOrder(order.id) : null)}
                      disabled={order.status !== 'confirmed'}
                      style={styles.flex}
                    />
                  )}
                </View>
              ) : null}

              {isBuyer && order.status === 'delivered' && order.reviewed ? (
                <View style={styles.reviewSummary}>
                  <Text style={styles.reviewStars}>{stars(5)}</Text>
                  <Text style={styles.reviewText}>Thanks for helping the marketplace grow.</Text>
                </View>
              ) : null}
            </Card>
          ))
        )}
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
  grid: {
    gap: spacing.md
  },
  orderCard: {
    gap: spacing.md
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  orderTitle: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weights.bold
  },
  orderMeta: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 4
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  orderNote: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  },
  reviewCard: {
    gap: spacing.md,
    backgroundColor: colors.surfaceSoft
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  cancelButton: {
    minWidth: 92
  },
  reviewSummary: {
    paddingTop: spacing.sm,
    gap: spacing.xs
  },
  reviewStars: {
    color: colors.accent,
    fontSize: typeScale.sm,
    fontWeight: weights.bold
  },
  reviewText: {
    color: colors.muted,
    fontSize: typeScale.sm
  }
});
