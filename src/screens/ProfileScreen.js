import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarketplace } from '../context/MarketplaceContext';
import { paymentMethods } from '../data/catalog';
import { averageScore, roleLabel } from '../utils/format';
import { AvatarCircle, Badge, Button, Card, Callout, Chip, DetailModal, Input, SectionHeader, StatCard } from '../components/ui';
import { colors, radius, spacing, typeScale, weights } from '../theme';

export function ProfileScreen() {
  const { currentUser, products, orders, reviews, updateProfile, signOut, notify } = useMarketplace();
  const [detailKey, setDetailKey] = useState(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [bio, setBio] = useState('');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState(paymentMethods[0]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setName(currentUser.name || '');
    setLocation(currentUser.location || '');
    setPhone(currentUser.phone || '');
    setStoreName(currentUser.storeName || '');
    setBio(currentUser.bio || '');
    setPreferredPaymentMethod(currentUser.preferredPaymentMethod || paymentMethods[0]);
  }, [currentUser]);

  const role = currentUser?.role;
  const sellerReviews = reviews.filter((review) => review.sellerId === currentUser?.id);
  const buyerOrders = orders.filter((order) => order.buyerId === currentUser?.id);
  const farmerProducts = products.filter((product) => product.farmerId === currentUser?.id);
  const averageRating = averageScore(sellerReviews.map((review) => review.rating));
  const orderCount =
    role === 'buyer'
      ? buyerOrders.length
      : role === 'farmer'
        ? orders.filter((order) => order.farmerId === currentUser.id).length
        : orders.length;
  const listingCount = role === 'farmer' ? farmerProducts.length : role === 'admin' ? products.length : 0;
  const ratingValue = role === 'farmer' ? averageRating : role === 'admin' ? averageScore(reviews.map((review) => review.rating)) : 0;
  const detailInfo = useMemo(() => {
    if (!currentUser || !detailKey) {
      return null;
    }

    if (detailKey === 'contact') {
      return {
        eyebrow: 'Account details',
        title: 'Contact information',
        subtitle: 'Use these details to reach the account owner quickly.',
        badgeLabel: 'Contact',
        badgeTone: 'primary',
        rows: [
          ['Name', currentUser.name],
          ['Phone', currentUser.phone || 'No phone added'],
          ['Email', currentUser.email],
          ['Store', currentUser.storeName || 'No store name added']
        ],
        actionLabel: currentUser.phone ? 'Call now' : 'Send email',
        actionPress: async () => {
          if (currentUser.phone) {
            await Linking.openURL(`tel:${currentUser.phone.replace(/\s+/g, '')}`);
          } else {
            await Linking.openURL(`mailto:${currentUser.email}`);
          }
        }
      };
    }

    if (detailKey === 'location') {
      return {
        eyebrow: 'Account details',
        title: 'Location information',
        subtitle: 'Open the stored location in maps or update it in the form below.',
        badgeLabel: 'Location',
        badgeTone: 'info',
        rows: [
          ['Location', currentUser.location || 'No location added'],
          ['Role', roleLabel(role)],
          ['Status', currentUser.isActive ? 'Active' : 'Suspended']
        ],
        actionLabel: currentUser.location ? 'Open in maps' : 'Close',
        actionPress: async () => {
          if (currentUser.location) {
            await Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentUser.location)}`
            );
          }
        }
      };
    }

    if (detailKey === 'orders') {
      const scopedOrders =
        role === 'buyer'
          ? buyerOrders
          : role === 'farmer'
            ? orders.filter((order) => order.farmerId === currentUser.id)
            : orders;

      return {
        eyebrow: 'Account snapshot',
        title: 'Orders summary',
        subtitle: 'Your order activity across the marketplace.',
        badgeLabel: 'Orders',
        badgeTone: 'accent',
        rows: [
          ['Order count', String(orderCount), role === 'buyer' ? 'Purchases made from your account.' : role === 'farmer' ? 'Sales handled from your farm dashboard.' : 'All tracked orders in the marketplace.'],
          ['Pending', String(scopedOrders.filter((order) => order.status === 'pending').length), 'Orders waiting for the next action.'],
          ['Delivered', String(scopedOrders.filter((order) => order.status === 'delivered').length), 'Completed transactions ready for review.']
        ]
      };
    }

    if (detailKey === 'listings') {
      return {
        eyebrow: 'Account snapshot',
        title: 'Listing summary',
        subtitle: 'Products and catalogue visibility tied to this account.',
        badgeLabel: 'Listings',
        badgeTone: 'primary',
        rows: [
          ['Listing count', String(listingCount), role === 'farmer' ? 'Your products currently published.' : role === 'admin' ? 'All products in the marketplace.' : 'Buyers browse public listings only.'],
          ['Visible listings', role === 'farmer' ? String(farmerProducts.filter((product) => product.isVisible).length) : String(products.filter((product) => product.isVisible).length), 'Items currently shown to buyers.'],
          ['Featured listings', role === 'farmer' ? String(farmerProducts.filter((product) => product.isFeatured).length) : String(products.filter((product) => product.isFeatured).length), 'Listings highlighted in the store.']
        ]
      };
    }

    if (detailKey === 'rating') {
      return {
        eyebrow: 'Account snapshot',
        title: 'Rating summary',
        subtitle: 'Buyer feedback and trust signals for this profile.',
        badgeLabel: 'Ratings',
        badgeTone: 'success',
        rows: [
          ['Average rating', role === 'buyer' ? '—' : ratingValue ? ratingValue.toFixed(1) : '—', role === 'buyer' ? 'Buyer profiles do not collect seller feedback.' : 'Average score across reviews.'],
          ['Review count', role === 'farmer' ? String(sellerReviews.length) : role === 'admin' ? String(reviews.length) : '—', role === 'farmer' ? 'Reviews for this seller account.' : role === 'admin' ? 'All marketplace reviews.' : 'Not available for buyers.'],
          ['Trust level', role === 'buyer' ? 'Buyer account' : ratingValue >= 4 ? 'Strong' : 'Growing', role === 'buyer' ? 'Ratings are based on completed purchases.' : 'Use reliable service and clear communication to improve this score.']
        ]
      };
    }

    return {
      eyebrow: 'Account details',
      title: 'Payment preference',
      subtitle: 'Review the payment method linked to your account.',
      badgeLabel: 'Payment',
      badgeTone: 'success',
      rows: [
        ['Preferred method', currentUser.preferredPaymentMethod || '—'],
        ['Role', roleLabel(role)],
        ['Verified', currentUser.isVerified ? 'Yes' : 'No']
      ],
      actionLabel: 'Save payment preference',
      actionPress: async () => {
        await updateProfile({
          name,
          location,
          phone,
          storeName,
          bio,
          preferredPaymentMethod
        });
      }
    };
  }, [
    bio,
    buyerOrders,
    currentUser,
    detailKey,
    farmerProducts,
    listingCount,
    location,
    name,
    orderCount,
    phone,
    preferredPaymentMethod,
    products,
    ratingValue,
    role,
    sellerReviews.length,
    storeName,
    updateProfile,
    reviews.length
  ]);

  if (!currentUser) {
    return null;
  }

  const openDetail = (key) => {
    setDetailKey(key);
    notify('info', `Opened ${key} details.`);
  };

  const update = async () => {
    notify('info', 'Saving profile changes.');
    await updateProfile({
      name,
      location,
      phone,
      storeName,
      bio,
      preferredPaymentMethod
    });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SectionHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Keep your contact details, market preferences, and store identity up to date."
      />

      <Card style={styles.heroCard}>
        <View style={styles.headerRow}>
          <AvatarCircle name={currentUser.name} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{currentUser.name}</Text>
            <View style={styles.badgeRow}>
              <Badge label={roleLabel(role)} tone={role === 'admin' ? 'accent' : 'primary'} />
              <Badge label={currentUser.isVerified ? 'Verified' : 'Unverified'} tone={currentUser.isVerified ? 'success' : 'warning'} />
              <Badge label={currentUser.isActive ? 'Active' : 'Suspended'} tone={currentUser.isActive ? 'success' : 'danger'} />
            </View>
            <Text style={styles.meta}>{currentUser.email}</Text>
          </View>
        </View>

        <Callout
          title="Secure authentication"
          description="Your profile is synced to the PostgreSQL-backed authentication and checkout services that power the live marketplace."
          tone="info"
        />
      </Card>

      <View style={styles.metricsRow}>
        <StatCard
          label="Orders"
          value={String(orderCount)}
          hint={role === 'buyer' ? 'Purchases made' : role === 'farmer' ? 'Sales handled' : 'Platform orders'}
          icon="📦"
          tone="accent"
          onPress={() => openDetail('orders')}
        />
        <StatCard
          label="Listing count"
          value={String(listingCount)}
          hint={role === 'farmer' ? 'Your products' : role === 'admin' ? 'All products' : 'Browse only'}
          icon="🌾"
          tone="primary"
          onPress={() => openDetail('listings')}
        />
        <StatCard
          label="Average rating"
          value={ratingValue ? ratingValue.toFixed(1) : '—'}
          hint={role === 'farmer' ? 'Buyer feedback' : role === 'admin' ? 'Marketplace average' : 'Not available'}
          icon="⭐"
          tone="info"
          onPress={() => openDetail('rating')}
        />
      </View>

      <Card style={styles.formCard}>
        <SectionHeader title="Account details" subtitle="Edit the fields below and save your profile." />

        <Input label="Full name" value={name} onChangeText={setName} />
        <Input
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="City or district"
          style={styles.field}
        />
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+232 ..." style={styles.field} />

        {role === 'farmer' ? (
          <Input
            label="Store name"
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Your business name"
            style={styles.field}
          />
        ) : null}

        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Tell the market a little about yourself."
          multiline
          numberOfLines={4}
          style={styles.field}
        />

        {role === 'buyer' ? (
          <View style={styles.optionGroup}>
            <Text style={styles.sectionLabel}>Preferred payment method</Text>
            <View style={styles.chipRow}>
              {paymentMethods.map((method) => (
                <Chip
                  key={method}
                  label={method}
                  active={preferredPaymentMethod === method}
                  onPress={() => setPreferredPaymentMethod(method)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <Button label="Save profile" onPress={update} style={styles.saveButton} />
      </Card>

      <SectionHeader eyebrow="Snapshot" title="Account summary" subtitle="Useful at a glance for handoffs and reporting." />

      <View style={styles.summaryGrid}>
        <Card
          style={styles.summaryCard}
          onPress={() => openDetail('contact')}
          accessibilityLabel="Contact account owner"
        >
          <Text style={styles.summaryLabel}>Contact</Text>
          <Text style={styles.summaryValue}>{currentUser.phone || 'No phone added'}</Text>
        </Card>
        <Card
          style={styles.summaryCard}
          onPress={() => openDetail('location')}
          accessibilityLabel="Open location in maps"
        >
          <Text style={styles.summaryLabel}>Location</Text>
          <Text style={styles.summaryValue}>{currentUser.location || 'No location added'}</Text>
        </Card>
        <Card
          style={styles.summaryCard}
          onPress={() => openDetail('payment')}
          accessibilityLabel="Save payment settings"
        >
          <Text style={styles.summaryLabel}>Payment</Text>
          <Text style={styles.summaryValue}>{currentUser.preferredPaymentMethod || '—'}</Text>
        </Card>
      </View>

      <Card style={styles.detailsCard}>
        <SectionHeader eyebrow="Bio" title="Profile note" subtitle="A short description helps the marketplace stay human and trustworthy." />
        <Text style={styles.detailsText}>{currentUser.bio || 'No bio has been added yet.'}</Text>
      </Card>

      <Button label="Sign out" variant="danger" onPress={signOut} />

      <DetailModal
        visible={Boolean(detailInfo)}
        eyebrow={detailInfo?.eyebrow}
        title={detailInfo?.title || ''}
        subtitle={detailInfo?.subtitle || ''}
        badgeLabel={detailInfo?.badgeLabel}
        badgeTone={detailInfo?.badgeTone}
        onClose={() => setDetailKey(null)}
        actions={
          detailInfo?.actionLabel ? (
            <Button
              label={detailInfo.actionLabel}
              onPress={async () => {
                await detailInfo.actionPress?.();
                setDetailKey(null);
              }}
            />
          ) : null
        }
      >
        {detailInfo ? (
          <View style={styles.detailStack}>
            {detailInfo.rows.map(([label, value]) => (
              <Card key={label} style={styles.detailRowCard}>
                <Text style={styles.detailRowLabel}>{label}</Text>
                <Text style={styles.detailRowValue}>{value}</Text>
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
  heroCard: {
    gap: spacing.md
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center'
  },
  name: {
    color: colors.text,
    fontSize: typeScale.xl,
    fontWeight: weights.bold
  },
  meta: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 6
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  formCard: {
    gap: spacing.md
  },
  field: {
    marginTop: spacing.md
  },
  optionGroup: {
    gap: spacing.sm,
    marginTop: spacing.md
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
  saveButton: {
    marginTop: spacing.md
  },
  summaryGrid: {
    gap: spacing.md,
    flexWrap: 'wrap',
    flexDirection: 'row'
  },
  detailStack: {
    gap: spacing.sm
  },
  detailRowCard: {
    gap: 6,
    backgroundColor: colors.surfaceSoft
  },
  detailRowLabel: {
    color: colors.muted,
    fontSize: typeScale.xs
  },
  detailRowValue: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold
  },
  summaryCard: {
    gap: 6,
    flex: 1,
    minWidth: 180
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: typeScale.xs
  },
  summaryValue: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.semibold
  },
  detailsCard: {
    gap: spacing.md
  },
  detailsText: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  }
});
