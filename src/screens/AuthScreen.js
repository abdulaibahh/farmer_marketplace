import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMarketplace } from '../context/MarketplaceContext';
import { paymentMethods } from '../data/catalog';
import { colors, gradients, radius, spacing, typeScale, weights } from '../theme';
import { roleLabel } from '../utils/format';
import { Button, Card, Chip, FeatureCarousel, Input, SectionHeader, StatCard } from '../components/ui';

export function AuthScreen() {
  const { signIn, register } = useMarketplace();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('buyer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [bio, setBio] = useState('');

  const heroSlides = [
    {
      id: 'buyer',
      eyebrow: 'Buyer path',
      title: 'Shop fresh produce from trusted farmers.',
      description: 'Browse seasonal harvests, compare prices, and checkout in minutes.',
      cta: 'Start as a buyer',
      tone: 'primary',
      colors: [colors.primaryDark, colors.primary],
      onPress: () => {
        setMode('register');
        setRole('buyer');
      }
    },
    {
      id: 'farmer',
      eyebrow: 'Farmer path',
      title: 'List produce, manage stock, and receive direct orders.',
      description: 'Turn the form below into a live storefront powered by PostgreSQL.',
      cta: 'Start as a farmer',
      tone: 'success',
      colors: [colors.heroStart, colors.heroEnd],
      onPress: () => {
        setMode('register');
        setRole('farmer');
      }
    },
    {
      id: 'checkout',
      eyebrow: 'Secure checkout',
      title: 'Stripe checkout with flexible payment options.',
      description: 'Built for a polished production experience from day one.',
      cta: 'Sign in now',
      tone: 'accent',
      colors: [colors.accent, '#A86710'],
      onPress: () => setMode('login')
    }
  ];

  const submit = async () => {
    if (mode === 'login') {
      await signIn({ email, password });
      return;
    }

    await register({
      name,
      email,
      password,
      role,
      location,
      phone,
      storeName,
      bio,
      preferredPaymentMethod: paymentMethods[0]
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={gradients.hero} style={styles.hero}>
          <Text style={styles.kicker}>Farmer Marketplace</Text>
          <Text style={styles.title}>Connect farmers and buyers directly.</Text>
          <Text style={styles.subtitle}>
            A mobile commerce workspace for Sierra Leone with listing management, order tracking,
            secure payments, and admin moderation.
          </Text>
        </LinearGradient>

        <FeatureCarousel slides={heroSlides} />

        <View style={[styles.metricsRow, isWide && styles.metricsRowWide]}>
          <StatCard
            label="Buyer flow"
            value="Instant"
            hint="Tap to register"
            icon="🛍️"
            tone="primary"
            onPress={() => {
              setMode('register');
              setRole('buyer');
            }}
          />
          <StatCard
            label="Farmer flow"
            value="Direct"
            hint="Tap to sell"
            icon="🌾"
            tone="accent"
            onPress={() => {
              setMode('register');
              setRole('farmer');
            }}
          />
          <StatCard
            label="Secure checkout"
            value="Live"
            hint="Tap to sign in"
            icon="💳"
            tone="info"
            onPress={() => setMode('login')}
          />
        </View>

        <Card style={styles.panel}>
          <SectionHeader
            eyebrow="Access"
            title={mode === 'login' ? 'Sign in' : 'Create account'}
            subtitle={
              mode === 'login'
                ? 'Use your email and password to continue.'
                : 'Farmers and buyers can register from this screen.'
            }
            action={
              <Chip
                label={mode === 'login' ? 'Switch to register' : 'Switch to login'}
                onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              />
            }
          />

          {mode === 'register' ? (
            <>
              <Input label="Full name" placeholder="Enter your full name" value={name} onChangeText={setName} />
              <Input
                label="Email address"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.field}
              />
              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.field}
              />

              <View style={styles.sectionGap}>
                <Text style={styles.fieldLabel}>Role</Text>
                <View style={styles.chipRow}>
                  {['buyer', 'farmer'].map((candidate) => (
                    <Chip
                      key={candidate}
                      label={roleLabel(candidate)}
                      active={role === candidate}
                      onPress={() => setRole(candidate)}
                    />
                  ))}
                </View>
                <Text style={styles.helperText}>Admin access is reserved for platform operators.</Text>
              </View>

              <View style={styles.row}>
                <Input
                  label="Location"
                  placeholder="City or district"
                  value={location}
                  onChangeText={setLocation}
                  style={styles.flex}
                />
                <Input
                  label="Phone"
                  placeholder="+232 ..."
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  style={styles.flex}
                />
              </View>

              {role === 'farmer' ? (
                <>
                  <Input
                    label="Store name"
                    placeholder="Your farm or business name"
                    value={storeName}
                    onChangeText={setStoreName}
                    style={styles.field}
                  />
                  <Input
                    label="Farm bio"
                    placeholder="Tell buyers what you grow and where you operate."
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                    style={styles.field}
                  />
                </>
              ) : (
                <Input
                  label="Buyer bio"
                  placeholder="Add a short note about what you purchase."
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={3}
                  style={styles.field}
                />
              )}
            </>
          ) : (
            <>
              <Input
                label="Email address"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
              />
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.field}
              />
            </>
          )}

          <Button
            label={mode === 'login' ? 'Sign in' : 'Create account'}
            onPress={submit}
            style={styles.submitButton}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  hero: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden'
  },
  kicker: {
    color: '#CFE9DB',
    fontSize: typeScale.xs,
    fontWeight: weights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  title: {
    color: '#FFFFFF',
    fontSize: typeScale.xxl,
    fontWeight: weights.bold,
    lineHeight: 34,
    marginTop: 6
  },
  subtitle: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: typeScale.md,
    lineHeight: 22
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  metricsRowWide: {
    gap: spacing.lg
  },
  panel: {
    gap: spacing.md
  },
  field: {
    marginTop: spacing.md
  },
  fieldLabel: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold,
    marginBottom: 8
  },
  helperText: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: 8,
    lineHeight: 16
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  sectionGap: {
    marginTop: spacing.md
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    flexWrap: 'wrap'
  },
  flex: {
    flex: 1
  },
  submitButton: {
    marginTop: spacing.lg
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm
  }
});
