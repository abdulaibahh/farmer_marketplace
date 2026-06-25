import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
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
import { Button, Card, Callout, Chip, DetailModal, FeatureCarousel, Input, SectionHeader, StatCard } from '../components/ui';

const loginAudiences = [
  { id: 'all', label: 'All accounts' },
  { id: 'buyer', label: 'Buyer' },
  { id: 'farmer', label: 'Farmer' },
  { id: 'admin', label: 'Administrator' }
];

const loginBackgroundImage = require('../../assets/login-background.png');
const accessBackgroundImage = require('../../assets/access-background.png');

export function AuthScreen({ initialAudience = 'all' }) {
  const { signIn, register, notify } = useMarketplace();
  const { width } = useWindowDimensions();
  const isWide = width >= 920;
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('buyer');
  const [loginAudience, setLoginAudience] = useState(initialAudience);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [phone, setPhone] = useState('');
  const [storeName, setStoreName] = useState('');
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectionMessage, setSelectionMessage] = useState('Choose a path above to see the sign-in form update.');
  const [journeyKey, setJourneyKey] = useState(null);

  const emailLooksValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

  useEffect(() => {
    if (!loginAudiences.some((audience) => audience.id === initialAudience)) {
      return;
    }
    setMode('login');
    setLoginAudience(initialAudience);
    if (initialAudience === 'admin') {
      setSelectionMessage('Administrator sign-in is ready. Use a provisioned admin account.');
    }
  }, [initialAudience]);

  const loginTitle =
    loginAudience === 'admin'
      ? 'Administrator sign in'
      : loginAudience === 'farmer'
        ? 'Farmer sign in'
        : loginAudience === 'buyer'
          ? 'Buyer sign in'
          : 'Sign in';

  const journeyDetails = {
    buyer: {
      eyebrow: 'Buyer journey',
      title: 'Shop fresh produce with a clear checkout flow.',
      subtitle: 'Use the marketplace to browse listings, build a cart, and pay with the method that works best for you.',
      badgeLabel: 'Buyer path',
      badgeTone: 'primary',
      points: [
        'Browse produce from trusted farmers.',
        'Add multiple items to your cart before checkout.',
        'Choose mobile money, bank transfer, cash on delivery, or card checkout.',
        'Track each order from the orders tab.'
      ],
      ctaLabel: 'Continue as buyer',
      nextMode: 'register',
      nextRole: 'buyer'
    },
    farmer: {
      eyebrow: 'Farmer journey',
      title: 'List produce, manage stock, and receive direct orders.',
      subtitle: 'Set up a seller profile, publish your produce, and keep everything updated from the seller dashboard.',
      badgeLabel: 'Farmer path',
      badgeTone: 'success',
      points: [
        'Create a farmer account with your location and store name.',
        'Add produce listings with stock, price, and images.',
        'Pause, restore, or update products at any time.',
        'Confirm and complete buyer orders from the dashboard.'
      ],
      ctaLabel: 'Continue as farmer',
      nextMode: 'register',
      nextRole: 'farmer'
    },
    login: {
      eyebrow: 'Secure sign-in',
      title: 'Return to your account and continue where you left off.',
      subtitle: 'Your saved session restores your marketplace data, cart, and payment preferences.',
      badgeLabel: 'Sign in',
      badgeTone: 'accent',
      points: [
        'Use the email address linked to your account.',
        'Your saved role restores the right dashboard automatically.',
        'Open orders, listings, and profile data after login.',
        'Use the same credentials on web and mobile.'
      ],
      ctaLabel: 'Go to sign in',
      nextMode: 'login',
      nextRole: null,
      nextAudience: 'all'
    },
    admin: {
      eyebrow: 'Administrator access',
      title: 'Moderate users, listings, orders, and marketplace reports.',
      subtitle: 'Administrator accounts are provisioned securely and use the same sign-in form without public registration.',
      badgeLabel: 'Admin portal',
      badgeTone: 'info',
      points: [
        'Review and suspend marketplace accounts.',
        'Remove or restore product listings.',
        'Monitor orders, revenue, payments, and buyer feedback.',
        'Admin accounts are created through the secure database provisioning script.'
      ],
      ctaLabel: 'Go to admin sign in',
      nextMode: 'login',
      nextRole: null,
      nextAudience: 'admin'
    }
  };

  const selectAuthFlow = (nextMode, nextRole, message, nextJourneyKey = null) => {
    setMode(nextMode);
    if (nextRole) {
      setRole(nextRole);
    }
    setSelectionMessage(message);
    setJourneyKey(nextJourneyKey);
    notify('info', message);
  };

  const selectLoginAudience = (audience) => {
    setMode('login');
    setLoginAudience(audience);
    const label = loginAudiences.find((candidate) => candidate.id === audience)?.label || 'Account';
    setSelectionMessage(
      audience === 'admin'
        ? 'Administrator sign-in selected. Use a provisioned admin email and password.'
        : `${label} sign-in selected. Enter the credentials for that account.`
    );
    notify('info', `${label} sign-in selected.`);
  };

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
        setSelectionMessage('Buyer journey details opened. Review the full path, then continue to the form.');
        setJourneyKey('buyer');
        notify('info', 'Opened buyer journey details.');
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
        setSelectionMessage('Farmer journey details opened. Review the full path, then continue to the form.');
        setJourneyKey('farmer');
        notify('info', 'Opened farmer journey details.');
      }
    },
    {
      id: 'admin',
      eyebrow: 'Admin portal',
      title: 'Moderate users, listings, and marketplace activity.',
      description: 'A dedicated workspace for provisioned platform administrators.',
      cta: 'Open admin sign in',
      tone: 'info',
      colors: [colors.info, colors.primaryDark],
      onPress: () => {
        setSelectionMessage('Administrator journey details opened. Review the access path, then continue to sign in.');
        setJourneyKey('admin');
        notify('info', 'Opened administrator access details.');
      }
    }
  ];

  const submit = async () => {
    if (submitting) {
      return;
    }

    if (!emailLooksValid(email)) {
      notify('warning', 'Please enter a valid email address, like name@example.com.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn({
          email,
          password,
          expectedRole: loginAudience === 'all' ? undefined : loginAudience
        });
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
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={loginBackgroundImage}
      resizeMode="cover"
      blurRadius={Platform.OS === 'web' ? 2 : 1}
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <View style={styles.backgroundTint} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ImageBackground
            source={loginBackgroundImage}
            resizeMode="cover"
            style={styles.hero}
            imageStyle={styles.heroImage}
          >
            <LinearGradient
              colors={['rgba(8, 40, 25, 0.93)', 'rgba(15, 83, 53, 0.72)', 'rgba(12, 55, 34, 0.88)']}
              locations={[0, 0.58, 1]}
              style={styles.heroOverlay}
            >
              <Text style={styles.kicker}>Farmer Marketplace</Text>
              <Text style={styles.title}>Connect farmers and buyers directly.</Text>
              <Text style={styles.subtitle}>
                A mobile commerce workspace for Sierra Leone with listing management, order tracking,
                secure payments, and admin moderation.
              </Text>
            </LinearGradient>
          </ImageBackground>

          <FeatureCarousel slides={heroSlides} />

          <View style={[styles.metricsRow, isWide && styles.metricsRowWide]}>
          <StatCard
            label="Buyer flow"
            value="Instant"
            hint="Tap to register"
            icon="🛍️"
            tone="primary"
            onPress={() => {
              setSelectionMessage('Buyer journey details opened. Review the full path, then continue to the form.');
              setJourneyKey('buyer');
              notify('info', 'Opened buyer journey details.');
            }}
          />
          <StatCard
            label="Farmer flow"
            value="Direct"
            hint="Tap to sell"
            icon="🌾"
            tone="accent"
            onPress={() => {
              setSelectionMessage('Farmer journey details opened. Review the full path, then continue to the form.');
              setJourneyKey('farmer');
              notify('info', 'Opened farmer journey details.');
            }}
          />
          <StatCard
            label="Admin portal"
            value="Protected"
            hint="Tap to manage"
            icon="🛡️"
            tone="info"
            onPress={() => {
              setSelectionMessage('Administrator journey details opened. Review the access path, then continue to sign in.');
              setJourneyKey('admin');
              notify('info', 'Opened administrator access details.');
            }}
          />
          </View>

          <ImageBackground
            source={accessBackgroundImage}
            resizeMode="cover"
            style={styles.panel}
            imageStyle={styles.panelBackgroundImage}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0.84)',
                'rgba(250,253,248,0.66)',
                'rgba(225,240,221,0.48)'
              ]}
              locations={[0, 0.52, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.panelOverlay}
            >
          <SectionHeader
            eyebrow="Access"
            title={mode === 'login' ? loginTitle : 'Create account'}
            subtitle={
              mode === 'login'
                ? loginAudience === 'admin'
                  ? 'Use the credentials for a provisioned administrator account.'
                  : 'Use your email and password to continue.'
                : 'Farmers and buyers can register from this screen.'
            }
            action={
              <Chip
                label={mode === 'login' ? 'Switch to register' : 'Switch to login'}
                onPress={() =>
                  selectAuthFlow(
                    mode === 'login' ? 'register' : 'login',
                    mode === 'login' ? role : null,
                    mode === 'login' ? 'Registration mode enabled.' : 'Sign-in mode enabled.',
                    mode === 'login' ? role : 'login'
                  )
                }
              />
            }
          />

          <Callout title="Selected path" description={selectionMessage} tone="info" />

          {mode === 'login' ? (
            <View style={styles.sectionGap}>
              <Text style={styles.fieldLabel}>Sign in as</Text>
              <View style={styles.chipRow}>
                {loginAudiences.map((audience) => (
                  <Chip
                    key={audience.id}
                    label={audience.label}
                    active={loginAudience === audience.id}
                    onPress={() => selectLoginAudience(audience.id)}
                  />
                ))}
              </View>
              {loginAudience === 'admin' ? (
                <Text style={styles.helperText}>
                  Administrator registration is disabled. Provision admin accounts with database/initial-admin.sql.
                </Text>
              ) : null}
            </View>
          ) : null}

          {mode === 'register' ? (
            <>
              <Input label="Full name" placeholder="Enter your full name" value={name} onChangeText={setName} />
              <Input
                label="Email address"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                helper="Use a real email address so we can sign you in safely."
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
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                helper="Use a real email address so the backend can validate your account."
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
            label={
              submitting
                ? 'Please wait…'
                : mode === 'login'
                  ? loginAudience === 'admin'
                    ? 'Sign in to admin portal'
                    : 'Sign in'
                  : 'Create account'
            }
            onPress={submit}
            disabled={submitting}
            style={styles.submitButton}
          />
            </LinearGradient>
          </ImageBackground>

          <DetailModal
          visible={Boolean(journeyKey && journeyDetails[journeyKey])}
          title={journeyDetails[journeyKey]?.title || ''}
          subtitle={journeyDetails[journeyKey]?.subtitle || ''}
          eyebrow={journeyDetails[journeyKey]?.eyebrow}
          badgeLabel={journeyDetails[journeyKey]?.badgeLabel}
          badgeTone={journeyDetails[journeyKey]?.badgeTone}
          onClose={() => setJourneyKey(null)}
          actions={
            <Button
              label={journeyDetails[journeyKey]?.ctaLabel || 'Continue'}
              onPress={() => {
                const journey = journeyDetails[journeyKey];
                if (!journey) {
                  setJourneyKey(null);
                  return;
                }

                setMode(journey.nextMode);
                if (journey.nextRole) {
                  setRole(journey.nextRole);
                }
                if (journey.nextAudience) {
                  setLoginAudience(journey.nextAudience);
                }
                setSelectionMessage(
                  journey.nextRole
                    ? `${journey.nextRole === 'buyer' ? 'Buyer' : 'Farmer'} registration is ready. Complete the form below.`
                    : journey.nextAudience === 'admin'
                      ? 'Administrator sign-in is ready. Enter your provisioned credentials below.'
                      : 'Sign in is ready. Enter your email and password below.'
                );
                setJourneyKey(null);
              }}
            />
          }
        >
          <View style={styles.detailPoints}>
            {journeyDetails[journeyKey]?.points?.map((point) => (
              <Card key={point} style={styles.detailPointCard}>
                <Text style={styles.detailPointText}>{point}</Text>
              </Card>
            ))}
          </View>
          </DetailModal>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#153F29',
    overflow: 'hidden'
  },
  backgroundImage: {
    opacity: 0.34
  },
  backgroundTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 241, 222, 0.72)'
  },
  root: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  content: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl
  },
  hero: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 210,
    justifyContent: 'center',
    backgroundColor: colors.heroStart
  },
  heroImage: {
    borderRadius: radius.lg
  },
  heroOverlay: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.xl,
    justifyContent: 'center'
  },
  kicker: {
    color: '#F2F4D7',
    fontSize: typeScale.xs,
    fontWeight: weights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    ...Platform.select({
      web: { textShadow: '0 1px 4px rgba(0,0,0,0.48)' },
      default: {
        textShadowColor: 'rgba(0,0,0,0.48)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4
      }
    })
  },
  title: {
    color: '#FFFFFF',
    fontSize: typeScale.xxl,
    fontWeight: weights.bold,
    lineHeight: 34,
    marginTop: 6,
    maxWidth: 720,
    ...Platform.select({
      web: { textShadow: '0 2px 8px rgba(0,0,0,0.7)' },
      default: {
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8
      }
    })
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: typeScale.md,
    lineHeight: 22,
    maxWidth: 820,
    ...Platform.select({
      web: { textShadow: '0 1px 6px rgba(0,0,0,0.75)' },
      default: {
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6
      }
    })
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  panelBackgroundImage: {
    borderRadius: radius.lg,
    width: '100%',
    height: '100%',
    opacity: 0.96
  },
  panelOverlay: {
    gap: spacing.md,
    padding: spacing.lg
  },
  detailPoints: {
    gap: spacing.sm
  },
  detailPointCard: {
    backgroundColor: colors.surfaceSoft,
    paddingVertical: spacing.md
  },
  detailPointText: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
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
