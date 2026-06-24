import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MarketplaceProvider, useMarketplace } from './src/context/MarketplaceContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { MarketplaceScreen } from './src/screens/MarketplaceScreen';
import { SellScreen } from './src/screens/SellScreen';
import { OrdersScreen } from './src/screens/OrdersScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { Badge, Button, Card, Chip, DetailModal, StatCard } from './src/components/ui';
import { colors, gradients, radius, spacing, typeScale, weights } from './src/theme';
import { formatLeones, roleLabel } from './src/utils/format';

const tabs = [
  {
    id: 'market',
    label: 'Market',
    icon: '🛒',
    roles: ['buyer', 'farmer', 'admin'],
    subtitle: 'Browse products'
  },
  {
    id: 'sell',
    label: 'Sell',
    icon: '🌾',
    roles: ['farmer'],
    subtitle: 'Manage listings'
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: '📦',
    roles: ['buyer', 'farmer', 'admin'],
    subtitle: 'Track activity'
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: '🛡️',
    roles: ['admin'],
    subtitle: 'Moderate marketplace'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: '👤',
    roles: ['buyer', 'farmer', 'admin'],
    subtitle: 'Account settings'
  }
];

function AppShell() {
  const { currentUser, toast, analytics, signOut, notify } = useMarketplace();
  const [activeTab, setActiveTab] = useState('market');
  const [navHistory, setNavHistory] = useState([]);
  const [lockedTabId, setLockedTabId] = useState(null);
  const [authEntryPath, setAuthEntryPath] = useState('all');
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const isCompact = width < 720;

  const accessibleTabs = useMemo(
    () => tabs.filter((tab) => tab.roles.includes(currentUser?.role)),
    [currentUser?.role]
  );
  const adminFallbackTab = currentUser?.role === 'admin' ? 'admin' : 'orders';

  const lockedTabInfo = useMemo(() => {
    if (!lockedTabId) {
      return null;
    }

    const lockedTab = tabs.find((tab) => tab.id === lockedTabId);
    if (!lockedTab) {
      return null;
    }

    const requiredRoles = lockedTab.roles.map((role) => roleLabel(role)).join(' or ');
    const currentRole = currentUser ? roleLabel(currentUser.role) : 'Guest';

    return {
      eyebrow: 'Restricted workspace',
      title: `${lockedTab.label} is locked`,
      subtitle: `This tab is visible for ${requiredRoles} accounts.`,
      badgeLabel: 'Locked',
      badgeTone: 'warning',
      rows: [
        ['Required access', requiredRoles, 'Sign in with a matching role to open this workspace.'],
        ['Your current role', currentRole, currentUser ? 'This account does not match the workspace permissions.' : 'You are not signed in yet.'],
        ['What it does', lockedTab.subtitle, 'The tab stays visible so you can see the full app structure.']
      ],
      actionLabel: lockedTab.id === 'admin' ? 'Switch to admin sign-in' : 'Open profile',
      actionPress: async () => {
        setLockedTabId(null);
        if (lockedTab.id === 'admin') {
          setAuthEntryPath('admin');
          await signOut();
          return;
        }
        setActiveTab('profile');
        notify('info', 'Opened Profile.');
      }
    };
  }, [currentUser, lockedTabId, notify, signOut]);

  useEffect(() => {
    setNavHistory([]);
    setLockedTabId(null);
    if (currentUser) {
      setAuthEntryPath('all');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (!accessibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(accessibleTabs[0]?.id || 'market');
    }
  }, [accessibleTabs, activeTab, currentUser]);

  const navigateToTab = (nextTab) => {
    const targetTab = tabs.find((tab) => tab.id === nextTab);

    if (!targetTab) {
      return;
    }

    if (!targetTab.roles.includes(currentUser?.role)) {
      setLockedTabId(targetTab.id);
      notify(
        'warning',
        `${targetTab.label} is available to ${targetTab.roles.map((role) => roleLabel(role)).join(' or ')} accounts.`
      );
      return;
    }

    if (nextTab === activeTab) {
      notify('info', `${targetTab.label} is already open.`);
      return;
    }

    setNavHistory((history) => [...history, activeTab]);
    setActiveTab(nextTab);
    notify('info', `Opened ${targetTab.label}.`);
  };

  const goBack = () => {
    setNavHistory((history) => {
      if (!history.length) {
        return history;
      }

      const previousTab = history[history.length - 1];
      const previousLabel = tabs.find((tab) => tab.id === previousTab)?.label || previousTab;
      setActiveTab(previousTab);
      notify('info', `Returned to ${previousLabel}.`);
      return history.slice(0, -1);
    });
  };

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="light" backgroundColor={colors.heroStart} />

      {toast ? (
        <View style={[styles.toast, toastPalette[toast.type] || toastPalette.info]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      ) : null}

      {!currentUser ? (
        <AuthScreen initialAudience={authEntryPath} />
      ) : (
        <View style={styles.appFrame}>
          {(() => {
            const activeTabConfig = accessibleTabs.find((tab) => tab.id === activeTab) || accessibleTabs[0];
              return (
                <View style={styles.centerShell}>
                  <View style={[styles.backdropLayer, styles.pointerEventsNone]}>
                    <LinearGradient
                      colors={['rgba(134, 212, 183, 0.24)', 'rgba(134, 212, 183, 0)']}
                      style={styles.backdropGlowLeft}
                    />
                    <LinearGradient
                      colors={['rgba(215, 156, 42, 0.18)', 'rgba(215, 156, 42, 0)']}
                      style={styles.backdropGlowRight}
                    />
                  </View>

                  <View style={[styles.topNav, isWide && styles.topNavWide]}>
                    <View style={styles.topNavBrandRow}>
                      {navHistory.length > 0 ? (
                        <Button label="Back" variant="ghost" size="sm" onPress={goBack} style={styles.topNavBackButton} />
                      ) : null}
                      <View style={styles.topNavBrandCopy}>
                        <Text style={styles.topNavEyebrow}>Farmer Marketplace</Text>
                        <Text style={styles.topNavTitle}>Live trade, clean design, fast checkout</Text>
                      </View>
                    </View>

                  {!isCompact ? (
                    <View style={styles.topNavChips}>
                      {tabs.map((tab) => {
                        const isLocked = !tab.roles.includes(currentUser?.role);
                        return (
                          <Chip
                            key={tab.id}
                            label={isLocked ? `${tab.label} 🔒` : tab.label}
                            active={tab.id === activeTab}
                            onPress={() => navigateToTab(tab.id)}
                            style={isLocked ? styles.lockedChip : null}
                          />
                        );
                      })}
                    </View>
                  ) : null}
                </View>

                <LinearGradient
                  colors={gradients.hero}
                  style={[styles.headerCard, isCompact && styles.headerCardCompact]}
                >
                  <View style={styles.headerTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appTitle}>Farmer Marketplace</Text>
                      {!isCompact ? (
                        <Text style={styles.appSubtitle}>
                          A polished direct-trade marketplace for Sierra Leone farmers, buyers, and administrators.
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.badgeStack}>
                      <Badge label={roleLabel(currentUser.role)} tone={currentUser.role === 'admin' ? 'accent' : 'primary'} />
                    </View>
                  </View>

                  {!isCompact ? (
                    <View style={styles.headerMetrics}>
                      <StatCard
                        label="Open market"
                        value={String(analytics.activeProducts)}
                        hint="Tap to browse"
                        icon="🛒"
                        tone="primary"
                        onPress={() => navigateToTab('market')}
                      />
                      <StatCard
                        label="Order revenue"
                        value={formatLeones(analytics.totalRevenue)}
                        hint="Tap to review"
                        icon="💰"
                        tone="accent"
                        onPress={() => navigateToTab('orders')}
                      />
                      <StatCard
                        label="Pending tasks"
                        value={String(analytics.pendingOrders)}
                        hint={currentUser.role === 'admin' ? 'Tap admin tools' : 'Tap orders'}
                        icon="⏳"
                        tone="info"
                        onPress={() => navigateToTab(adminFallbackTab)}
                      />
                    </View>
                  ) : null}

                  <View style={styles.currentUserRow}>
                    <View>
                      <Text style={styles.currentUserName}>{currentUser.name}</Text>
                      <Text style={styles.currentUserMeta}>
                        {currentUser.storeName || currentUser.location || 'Marketplace member'}
                      </Text>
                    </View>
                    <Button label="Sign out" variant="secondary" onPress={signOut} style={styles.signOutHint} />
                  </View>
                </LinearGradient>

                <View style={styles.screenWrap}>
                  {activeTabConfig?.id === 'market' ? <MarketplaceScreen /> : null}
                  {activeTabConfig?.id === 'sell' ? <SellScreen /> : null}
                  {activeTabConfig?.id === 'orders' ? <OrdersScreen /> : null}
                  {activeTabConfig?.id === 'admin' ? <AdminScreen /> : null}
                  {activeTabConfig?.id === 'profile' ? <ProfileScreen /> : null}
                  {!activeTabConfig ? (
                    <Card style={styles.emptyWorkspace}>
                      <Text style={styles.emptyWorkspaceTitle}>Workspace unavailable</Text>
                      <Text style={styles.emptyWorkspaceText}>
                        We could not load a tab for this account right now. Use Market to continue or sign out and try again.
                      </Text>
                      <View style={styles.emptyWorkspaceActions}>
                        <Button label="Open market" onPress={() => navigateToTab('market')} />
                        <Button label="Sign out" variant="secondary" onPress={signOut} />
                      </View>
                    </Card>
                  ) : null}
                </View>

                <View style={[styles.tabBar, isWide && styles.tabBarWide]}>
                  {accessibleTabs.map((tab) => {
                    const active = tab.id === activeTab;
                    return (
                      <Pressable
                        key={tab.id}
                        onPress={() => navigateToTab(tab.id)}
                        style={({ pressed, hovered, focused }) => [
                          styles.tabItem,
                          isCompact && styles.tabItemCompact,
                          active && styles.tabItemActive,
                          hovered && !active ? styles.tabItemHover : null,
                          focused ? styles.tabItemFocused : null,
                          pressed && { opacity: 0.92 }
                        ]}
                      >
                        <Text style={styles.tabIcon}>{tab.icon}</Text>
                        <Text
                          style={[
                            styles.tabLabel,
                            active && styles.tabLabelActive
                          ]}
                        >
                          {tab.label}
                        </Text>
                        {!isCompact ? (
                          <Text
                            style={[
                              styles.tabSubtitle,
                              active && styles.tabSubtitleActive
                            ]}
                          >
                            {tab.subtitle}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                <DetailModal
                  visible={Boolean(lockedTabInfo)}
                  eyebrow={lockedTabInfo?.eyebrow}
                  title={lockedTabInfo?.title || ''}
                  subtitle={lockedTabInfo?.subtitle || ''}
                  badgeLabel={lockedTabInfo?.badgeLabel}
                  badgeTone={lockedTabInfo?.badgeTone}
                  onClose={() => setLockedTabId(null)}
                  actions={
                    lockedTabInfo?.actionLabel ? (
                      <Button
                        label={lockedTabInfo.actionLabel}
                        onPress={lockedTabInfo.actionPress}
                        style={styles.lockedActionButton}
                      />
                    ) : null
                  }
                >
                  {lockedTabInfo ? (
                    <View style={styles.lockedStack}>
                      {lockedTabInfo.rows.map(([label, value, note]) => (
                        <Card key={label} style={styles.lockedRowCard}>
                          <Text style={styles.lockedRowLabel}>{label}</Text>
                          <Text style={styles.lockedRowValue}>{value}</Text>
                          {note ? <Text style={styles.lockedRowNote}>{note}</Text> : null}
                        </Card>
                      ))}
                    </View>
                  ) : null}
                </DetailModal>
              </View>
            );
          })()}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <MarketplaceProvider>
      <AppShell />
    </MarketplaceProvider>
  );
}

const toastPalette = {
  success: {
    backgroundColor: '#E4F7EF',
    borderColor: '#C8EBD7'
  },
  warning: {
    backgroundColor: '#FFF2DA',
    borderColor: '#F0D6A5'
  },
  danger: {
    backgroundColor: '#FBE4E4',
    borderColor: '#F0C1C1'
  },
  info: {
    backgroundColor: '#E7F0FD',
    borderColor: '#C7D9F6'
  }
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background
  },
  appFrame: {
    flex: 1,
    minHeight: 0
  },
  centerShell: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 1600,
    alignSelf: 'center',
    position: 'relative'
  },
  backdropLayer: {
    ...StyleSheet.absoluteFillObject
  },
  pointerEventsNone: {
    pointerEvents: 'none'
  },
  backdropGlowLeft: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 260
  },
  backdropGlowRight: {
    position: 'absolute',
    top: 120,
    right: -60,
    width: 320,
    height: 320,
    borderRadius: 320
  },
  topNav: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    gap: spacing.md
  },
  topNavWide: {
    marginBottom: spacing.md
  },
  topNavBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  topNavBackButton: {
    alignSelf: 'flex-start'
  },
  topNavBrandCopy: {
    flex: 1
  },
  topNavEyebrow: {
    color: colors.primaryDark,
    fontSize: typeScale.xs,
    fontWeight: weights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase'
  },
  topNavTitle: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.bold,
    marginTop: 4
  },
  topNavChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  lockedChip: {
    opacity: 0.75,
    borderStyle: 'dashed'
  },
  toast: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 20,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    maxWidth: '88%'
  },
  toastText: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold,
    textAlign: 'center'
  },
  headerCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radius.lg,
    gap: spacing.md,
    overflow: 'hidden'
  },
  headerCardCompact: {
    padding: spacing.md,
    gap: spacing.sm
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: typeScale.xl,
    fontWeight: weights.bold
  },
  appSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: typeScale.sm,
    marginTop: 4,
    lineHeight: 18
  },
  headerMetrics: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  currentUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md
  },
  currentUserName: {
    color: '#FFFFFF',
    fontSize: typeScale.md,
    fontWeight: weights.bold
  },
  currentUserMeta: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: typeScale.xs,
    marginTop: 4
  },
  signOutHint: {
    minWidth: 98
  },
  screenWrap: {
    flex: 1,
    minHeight: 0
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap'
  },
  tabBarWide: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderTopWidth: 0,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  tabItem: {
    flex: 1,
    minWidth: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 6
  },
  tabItemCompact: {
    minWidth: 0,
    paddingVertical: 7
  },
  tabItemHover: {
    borderColor: '#C6D4C9',
    backgroundColor: '#FBFCFB',
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  tabItemFocused: {
    borderColor: colors.primary
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabItemLocked: {
    opacity: 0.82,
    borderStyle: 'dashed'
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 3
  },
  tabIconLocked: {
    opacity: 0.82
  },
  tabLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: weights.bold
  },
  tabLabelActive: {
    color: '#FFFFFF'
  },
  tabLabelLocked: {
    color: colors.muted
  },
  tabSubtitle: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center'
  },
  tabSubtitleActive: {
    color: 'rgba(255,255,255,0.92)'
  },
  tabSubtitleLocked: {
    color: colors.muted
  },
  badgeStack: {
    gap: spacing.sm,
    alignItems: 'flex-end'
  },
  emptyWorkspace: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg
  },
  emptyWorkspaceTitle: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weights.bold
  },
  emptyWorkspaceText: {
    color: colors.muted,
    fontSize: typeScale.sm,
    lineHeight: 20
  },
  emptyWorkspaceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  lockedStack: {
    gap: spacing.sm
  },
  lockedRowCard: {
    gap: 6,
    backgroundColor: colors.surfaceSoft
  },
  lockedRowLabel: {
    color: colors.muted,
    fontSize: typeScale.xs
  },
  lockedRowValue: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold
  },
  lockedRowNote: {
    color: colors.text,
    fontSize: typeScale.sm,
    lineHeight: 20
  },
  lockedActionButton: {
    minWidth: 160
  }
});
