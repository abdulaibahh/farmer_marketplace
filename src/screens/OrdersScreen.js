import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarketplace } from '../context/MarketplaceContext';
import { formatLeones, formatShortDate } from '../utils/format';
import { Badge, Button, Card, Chip, DetailModal, EmptyState, Input, SectionHeader, StatCard } from '../components/ui';
import { colors, radius, spacing, typeScale, weights } from '../theme';

function stars(count) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(count || 0))));
  return '★★★★★'.slice(0, rounded) + '☆☆☆☆☆'.slice(0, 5 - rounded);
}

export function OrdersScreen() {
  const { currentUser, orders, addReview, confirmOrder, deliverOrder, notify } = useMarketplace();
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [insightKey, setInsightKey] = useState(null);
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

  const selectedOrder = useMemo(
    () => scopedOrders.find((order) => order.id === selectedOrderId) || null,
    [scopedOrders, selectedOrderId]
  );

  const insightInfo = useMemo(() => {
    if (!insightKey) {
      return null;
    }

    const pendingOrder = scopedOrders.find((order) => order.status === 'pending') || null;
    const confirmedOrder = scopedOrders.find((order) => order.status === 'confirmed') || null;
    const deliveredOrder = scopedOrders.find((order) => order.status === 'delivered') || null;
    const focusOrder =
      insightKey === 'pending'
        ? pendingOrder
        : insightKey === 'confirmed'
          ? confirmedOrder
          : insightKey === 'delivered'
            ? deliveredOrder
            : scopedOrders[0] || null;

    if (insightKey === 'pending') {
      return {
        eyebrow: 'Transactions',
        title: 'Pending orders',
        subtitle: 'Orders waiting for confirmation or fulfilment.',
        badgeLabel: 'Pending',
        badgeTone: 'warning',
        rows: [
          ['Pending orders', String(totals.pending), 'These orders still need attention.'],
          ['Oldest pending', pendingOrder ? pendingOrder.productName : 'None', pendingOrder ? `${pendingOrder.buyerName} • ${formatShortDate(pendingOrder.createdAt)}` : 'Everything is up to date right now.'],
          ['Next step', pendingOrder ? 'Open the order details' : 'No action required', pendingOrder ? 'Review payment and delivery details before confirming.' : 'Use this view to monitor incoming requests.']
        ],
        actionLabel: pendingOrder ? 'Open next pending order' : null,
        actionPress: () => {
          if (!pendingOrder) {
            setInsightKey(null);
            return;
          }

          openOrderDetails(pendingOrder.id);
          setInsightKey(null);
        }
      };
    }

    if (insightKey === 'confirmed') {
      return {
        eyebrow: 'Transactions',
        title: 'Confirmed orders',
        subtitle: 'Orders already approved and moving toward delivery.',
        badgeLabel: 'Confirmed',
        badgeTone: 'info',
        rows: [
          ['Confirmed orders', String(totals.confirmed), 'These are in progress.'],
          ['Current focus', confirmedOrder ? confirmedOrder.productName : 'None', confirmedOrder ? `${confirmedOrder.buyerName} • ${formatLeones(confirmedOrder.totalPrice)}` : 'No confirmed order needs action.'],
          ['Workload', `${totals.pending + totals.confirmed} active`, 'Pending and confirmed orders share the current queue.']
        ],
        actionLabel: confirmedOrder ? 'Open confirmed order' : null,
        actionPress: () => {
          if (!confirmedOrder) {
            setInsightKey(null);
            return;
          }

          openOrderDetails(confirmedOrder.id);
          setInsightKey(null);
        }
      };
    }

    if (insightKey === 'delivered') {
      return {
        eyebrow: 'Transactions',
        title: 'Delivered orders',
        subtitle: 'Completed orders and finished transactions.',
        badgeLabel: 'Delivered',
        badgeTone: 'success',
        rows: [
          ['Delivered orders', String(totals.delivered), 'These orders have been completed.'],
          ['Latest delivery', deliveredOrder ? deliveredOrder.productName : 'None', deliveredOrder ? `${deliveredOrder.buyerName} • ${formatShortDate(deliveredOrder.createdAt)}` : 'No completed order yet.'],
          ['Feedback ready', deliveredOrder ? (deliveredOrder.reviewed ? 'Already reviewed' : 'Awaiting review') : 'No deliveries yet', deliveredOrder ? 'Delivered orders can be reviewed by the buyer.' : 'Once delivered, review prompts become available.']
        ],
        actionLabel: deliveredOrder ? 'Open delivered order' : null,
        actionPress: () => {
          if (!deliveredOrder) {
            setInsightKey(null);
            return;
          }

          openOrderDetails(deliveredOrder.id);
          setInsightKey(null);
        }
      };
    }

    return {
      eyebrow: 'Transactions',
      title: 'Total order value',
      subtitle: 'All tracked orders and the revenue they represent.',
      badgeLabel: 'Value',
      badgeTone: 'accent',
      rows: [
        ['Tracked orders', String(scopedOrders.length), 'Every order currently visible in this workspace.'],
        ['Combined value', formatLeones(totals.totalValue), 'Based on the total price of each visible order.'],
        ['Average order value', scopedOrders.length ? formatLeones(totals.totalValue / scopedOrders.length) : '—', 'Useful for checking basket size trends.']
      ],
      actionLabel: focusOrder ? 'Open latest order' : null,
      actionPress: () => {
        if (!focusOrder) {
          setInsightKey(null);
          return;
        }

        openOrderDetails(focusOrder.id);
        setInsightKey(null);
      }
    };
  }, [insightKey, openOrderDetails, scopedOrders, totals]);

  const openReview = (orderId) => {
    setReviewTargetId(orderId);
    setSelectedOrderId(orderId);
    setReviewRating('5');
    setReviewComment('');
    notify('info', 'Review form opened.');
  };

  const openOrderDetails = (orderId) => {
    setSelectedOrderId(orderId);
    setReviewTargetId(null);
    notify('info', 'Order details opened.');
  };

  const submitReview = async () => {
    const success = await addReview({
      orderId: reviewTargetId,
      rating: Number(reviewRating || 5),
      comment: reviewComment
    });

    if (success) {
      setReviewTargetId(null);
      setSelectedOrderId(null);
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
        eyebrow="Transactions"
        title={title}
        subtitle={
          isBuyer
            ? 'Track purchases, delivery updates, and leave feedback when the order is completed.'
            : 'Monitor buyer requests, payment methods, and fulfillment progress.'
        }
      />

      <View style={styles.metricsRow}>
        <StatCard
          label="Pending"
          value={String(totals.pending)}
          hint="Awaiting action"
          icon="⏳"
          tone="warning"
          onPress={() => {
            setInsightKey('pending');
            notify('info', 'Opened pending order details.');
          }}
        />
        <StatCard
          label="Confirmed"
          value={String(totals.confirmed)}
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
          value={String(totals.delivered)}
          hint="Completed"
          icon="🚚"
          tone="success"
          onPress={() => {
            setInsightKey('delivered');
            notify('info', 'Opened delivered order details.');
          }}
        />
      </View>

      <StatCard
        label="Total order value"
        value={formatLeones(totals.totalValue)}
        hint={`${scopedOrders.length} tracked orders`}
        icon="💰"
        tone="info"
        onPress={() => {
          setInsightKey('total');
          notify('info', 'Opened total order value details.');
        }}
      />

      <SectionHeader
        eyebrow="History"
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
            <Card
              key={order.id}
              style={styles.orderCard}
              onPress={() => {
                notify('info', `Opened ${order.productName}.`);
                openOrderDetails(order.id);
              }}
              accessibilityLabel={`${order.productName} order`}
            >
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

              {isBuyer && order.status === 'delivered' && !order.reviewed && selectedOrderId !== order.id ? (
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

      <DetailModal
        visible={Boolean(selectedOrder)}
        eyebrow="Order details"
        title={selectedOrder?.productName || ''}
        subtitle={
          selectedOrder
            ? `${selectedOrder.quantity} ${selectedOrder.unit} • ${isBuyer ? `Farmer: ${selectedOrder.farmerName}` : `Buyer: ${selectedOrder.buyerName}`}`
            : ''
        }
        badgeLabel={selectedOrder?.status || ''}
        badgeTone={selectedOrder?.status === 'delivered' ? 'success' : selectedOrder?.status === 'pending' ? 'warning' : 'info'}
        onClose={() => {
          setSelectedOrderId(null);
          setReviewTargetId(null);
        }}
      >
        {selectedOrder ? (
          <View style={styles.detailStack}>
            <Card style={styles.detailSummaryCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Counterpart</Text>
                <Text style={styles.detailValue}>
                  {isBuyer ? selectedOrder.farmerName : selectedOrder.buyerName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>
                  {selectedOrder.quantity} {selectedOrder.unit}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total</Text>
                <Text style={styles.detailValue}>{formatLeones(selectedOrder.totalPrice)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment</Text>
                <Text style={styles.detailValue}>{selectedOrder.paymentMethod}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Delivery</Text>
                <Text style={styles.detailValue}>{selectedOrder.deliveryMethod}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{formatShortDate(selectedOrder.createdAt)}</Text>
              </View>
            </Card>

            <Card style={styles.detailSummaryCard}>
              <Text style={styles.detailLabel}>Note</Text>
              <Text style={styles.detailNote}>{selectedOrder.note || 'No special note supplied.'}</Text>
            </Card>

            {isBuyer && selectedOrder.status === 'delivered' && !selectedOrder.reviewed ? (
              reviewTargetId === selectedOrder.id ? (
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
                <Button label="Leave review" variant="accent" onPress={() => openReview(selectedOrder.id)} />
              )
            ) : null}

            {!isBuyer ? (
              <View style={styles.buttonRow}>
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
            ) : null}
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
  grid: {
    gap: spacing.md
  },
  orderCard: {
    gap: spacing.md
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
