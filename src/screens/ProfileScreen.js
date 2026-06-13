import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMarketplace } from '../context/MarketplaceContext';
import { paymentMethods } from '../data/catalog';
import { averageScore, roleLabel } from '../utils/format';
import { AvatarCircle, Badge, Button, Card, Callout, Chip, Input, SectionHeader, StatCard } from '../components/ui';
import { colors, radius, spacing, typeScale, weights } from '../theme';

export function ProfileScreen() {
  const { currentUser, products, orders, reviews, updateProfile, signOut } = useMarketplace();
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

  if (!currentUser) {
    return null;
  }

  const role = currentUser.role;
  const sellerReviews = reviews.filter((review) => review.sellerId === currentUser.id);
  const buyerOrders = orders.filter((order) => order.buyerId === currentUser.id);
  const farmerProducts = products.filter((product) => product.farmerId === currentUser.id);
  const averageRating = averageScore(sellerReviews.map((review) => review.rating));
  const orderCount =
    role === 'buyer'
      ? buyerOrders.length
      : role === 'farmer'
        ? orders.filter((order) => order.farmerId === currentUser.id).length
        : orders.length;
  const listingCount = role === 'farmer' ? farmerProducts.length : role === 'admin' ? products.length : 0;
  const ratingValue = role === 'farmer' ? averageRating : role === 'admin' ? averageScore(reviews.map((review) => review.rating)) : 0;

  const update = async () => {
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
        />
        <StatCard
          label="Listing count"
          value={String(listingCount)}
          hint={role === 'farmer' ? 'Your products' : role === 'admin' ? 'All products' : 'Browse only'}
          icon="🌾"
          tone="primary"
        />
        <StatCard
          label="Average rating"
          value={ratingValue ? ratingValue.toFixed(1) : '—'}
          hint={role === 'farmer' ? 'Buyer feedback' : role === 'admin' ? 'Marketplace average' : 'Not available'}
          icon="⭐"
          tone="info"
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
          onPress={async () => {
            if (currentUser.phone) {
              await Linking.openURL(`tel:${currentUser.phone.replace(/\s+/g, '')}`);
            } else {
              await Linking.openURL(`mailto:${currentUser.email}`);
            }
          }}
          accessibilityLabel="Contact account owner"
        >
          <Text style={styles.summaryLabel}>Contact</Text>
          <Text style={styles.summaryValue}>{currentUser.phone || 'No phone added'}</Text>
        </Card>
        <Card
          style={styles.summaryCard}
          onPress={async () => {
            if (currentUser.location) {
              await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentUser.location)}`);
            }
          }}
          accessibilityLabel="Open location in maps"
        >
          <Text style={styles.summaryLabel}>Location</Text>
          <Text style={styles.summaryValue}>{currentUser.location || 'No location added'}</Text>
        </Card>
        <Card
          style={styles.summaryCard}
          onPress={update}
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
