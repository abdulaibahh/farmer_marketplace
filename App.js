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
import { Badge, Button } from './src/components/ui';
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
  const { currentUser, toast, analytics, signOut } = useMarketplace();
  const [activeTab, setActiveTab] = useState('market');
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const availableTabs = useMemo(
    () => tabs.filter((tab) => tab.roles.includes(currentUser?.role)),
    [currentUser?.role]
  );

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'market');
    }
  }, [activeTab, availableTabs, currentUser]);

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="light" backgroundColor={colors.heroStart} />

      {toast ? (
        <View style={[styles.toast, toastPalette[toast.type] || toastPalette.info]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      ) : null}

      {!currentUser ? (
        <AuthScreen />
      ) : (
        <View style={styles.appFrame}>
          {(() => {
            const activeTabConfig = availableTabs.find((tab) => tab.id === activeTab) || availableTabs[0];
            return (
              <View style={styles.centerShell}>
                <LinearGradient colors={gradients.hero} style={styles.headerCard}>
                  <View style={styles.headerTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appTitle}>Farmer Marketplace</Text>
                      <Text style={styles.appSubtitle}>
                        A polished direct-trade marketplace for Sierra Leone farmers, buyers, and administrators.
                      </Text>
                    </View>
                    <View style={styles.badgeStack}>
                      <Badge label={roleLabel(currentUser.role)} tone={currentUser.role === 'admin' ? 'accent' : 'primary'} />
                    </View>
                  </View>

                  <View style={styles.headerMetrics}>
                    <View style={styles.headerMetric}>
                      <Text style={styles.metricLabel}>Active listings</Text>
                      <Text style={styles.metricValue}>{analytics.activeProducts}</Text>
                    </View>
                    <View style={styles.headerMetric}>
                      <Text style={styles.metricLabel}>Revenue</Text>
                      <Text style={styles.metricValue}>{formatLeones(analytics.totalRevenue)}</Text>
                    </View>
                    <View style={styles.headerMetric}>
                      <Text style={styles.metricLabel}>Pending</Text>
                      <Text style={styles.metricValue}>{analytics.pendingOrders}</Text>
                    </View>
                  </View>

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
                </View>

                <View style={[styles.tabBar, isWide && styles.tabBarWide]}>
                  {availableTabs.map((tab) => {
                    const active = tab.id === activeTab;
                    return (
                      <Pressable
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={({ pressed }) => [styles.tabItem, active && styles.tabItemActive, pressed && { opacity: 0.92 }]}
                      >
                        <Text style={styles.tabIcon}>{tab.icon}</Text>
                        <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                        <Text style={[styles.tabSubtitle, active && styles.tabSubtitleActive]}>{tab.subtitle}</Text>
                      </Pressable>
                    );
                  })}
                </View>
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
    flex: 1
  },
  centerShell: {
    flex: 1,
    width: '100%',
    maxWidth: 1240,
    alignSelf: 'center'
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
  headerMetric: {
    flex: 1,
    minWidth: 136,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.md,
    padding: spacing.md
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typeScale.xs
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: typeScale.md,
    fontWeight: weights.bold,
    marginTop: 4
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
    flex: 1
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
  tabItemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 3
  },
  tabLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: weights.bold
  },
  tabLabelActive: {
    color: '#FFFFFF'
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
  badgeStack: {
    gap: spacing.sm,
    alignItems: 'flex-end'
  }
});
