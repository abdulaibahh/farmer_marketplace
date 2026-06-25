import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing, typeScale, weights } from '../theme';
import { initialsFromName } from '../utils/format';

const buttonVariants = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    textColor: '#FFFFFF'
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    textColor: colors.text
  },
  accent: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    textColor: '#FFFFFF'
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
    textColor: '#FFFFFF'
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    textColor: colors.text
  }
};

export function Card({ children, style, onPress, disabled = false, accessibilityLabel }) {
  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered, focused }) => [
        styles.card,
        styles.cardPressable,
        hovered && !disabled ? styles.cardHover : null,
        focused ? styles.cardFocused : null,
        {
          opacity: disabled ? 0.55 : pressed ? 0.94 : 1,
          transform: pressed && !disabled
            ? [{ translateY: -1 }]
            : hovered && !disabled
              ? [{ translateY: -2 }]
              : [{ translateY: 0 }]
        },
        style
      ]}
    >
      {children}
    </Pressable>
  );
}

export function SectionHeader({ title, subtitle, action, eyebrow }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {!!eyebrow && <Text style={styles.sectionEyebrow}>{eyebrow}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  icon,
  style
}) {
  const palette = buttonVariants[variant] || buttonVariants.primary;
  const paddingVertical = size === 'sm' ? 8 : 12;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed, hovered, focused }) => [
        styles.button,
        hovered && !disabled ? styles.buttonHover : null,
        focused ? styles.buttonFocused : null,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          paddingVertical,
          opacity: disabled ? 0.45 : pressed ? 0.88 : 1
        },
        style
      ]}
    >
      {icon ? <Text style={[styles.buttonIcon, { color: palette.textColor }]}>{icon}</Text> : null}
      <Text style={[styles.buttonLabel, { color: palette.textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function Input({
  label,
  helper,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  editable = true,
  secureTextEntry = false,
  right,
  style,
  inputStyle,
  numberOfLines,
  ...rest
}) {
  return (
    <View style={style}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          keyboardType={keyboardType}
          editable={editable}
          secureTextEntry={secureTextEntry}
          numberOfLines={numberOfLines}
          {...rest}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            right ? { paddingRight: 56 } : null,
            inputStyle
          ]}
        />
        {right ? <View style={styles.inputRight}>{right}</View> : null}
      </View>
      {!!helper && <Text style={styles.inputHelper}>{helper}</Text>}
    </View>
  );
}

export function Badge({ label, tone = 'neutral', style }) {
  const palette = badgeTones[tone] || badgeTones.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: palette.background, borderColor: palette.border }, style]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active = false, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered, focused }) => [
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.9 : 1
        },
        hovered && !active ? styles.chipHover : null,
        focused ? styles.chipFocused : null,
        style
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'primary', onPress, accessibilityLabel }) {
  const palette = statTones[tone] || statTones.primary;
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={accessibilityLabel || label}
      style={[styles.statCard, onPress && styles.statCardPressable, { backgroundColor: palette.background, borderColor: palette.border }]}
    >
      <View style={styles.statTopRow}>
        <Text style={styles.statIcon}>{icon}</Text>
        <Text style={[styles.statHint, { color: palette.text }]}>{hint}</Text>
      </View>
      <Text style={[styles.statValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.text }]}>{label}</Text>
    </Card>
  );
}

export function FeatureCarousel({ slides, style }) {
  const { width } = useWindowDimensions();
  const slideWidth = Math.min(420, Math.max(280, width - spacing.lg * 2));

  return (
    <ScrollView
      horizontal
      pagingEnabled
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      snapToInterval={slideWidth + spacing.md}
      snapToAlignment="start"
      style={styles.carouselViewport}
      contentContainerStyle={[styles.carouselRow, style]}
    >
      {slides.map((slide) => {
        const textColor = slide.textColor || '#FFFFFF';
        const mutedColor = slide.mutedTextColor || 'rgba(255,255,255,0.84)';
        const accentColor = slide.accentTextColor || '#FFFFFF';

        return (
          <Pressable
            key={slide.id || slide.title}
            accessibilityRole="button"
            accessibilityLabel={slide.accessibilityLabel || slide.title}
            onPress={slide.onPress}
            style={({ pressed }) => [
              styles.carouselWrap,
              { width: slideWidth },
              pressed && { opacity: 0.95, transform: [{ translateY: -2 }] }
            ]}
          >
            <LinearGradient colors={slide.colors || [colors.surface, colors.surfaceSoft]} style={styles.carouselCard}>
              <View style={styles.carouselHeader}>
                {slide.eyebrow ? <Badge label={slide.eyebrow} tone={slide.tone || 'primary'} /> : <View />}
                {slide.tag ? <Text style={[styles.carouselTag, { color: mutedColor }]}>{slide.tag}</Text> : null}
              </View>

              <Text style={[styles.carouselTitle, { color: textColor }]}>{slide.title}</Text>
              <Text style={[styles.carouselDescription, { color: mutedColor }]}>{slide.description}</Text>

              {Array.isArray(slide.stats) && slide.stats.length > 0 ? (
                <View style={styles.carouselStats}>
                  {slide.stats.map((stat) => (
                    <View key={`${slide.id || slide.title}-${stat.label}`} style={styles.carouselStat}>
                      <Text style={styles.carouselStatValue}>{stat.value}</Text>
                      <Text style={styles.carouselStatLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.carouselFooter}>
                <Text style={[styles.carouselCta, { color: accentColor }]}>{slide.cta || 'Open'}</Text>
                <Text style={[styles.carouselArrow, { color: accentColor }]}>→</Text>
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function AvatarCircle({ name, size = 56, style }) {
  const initials = useMemo(() => initialsFromName(name), [name]);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        style
      ]}
    >
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

export function ToggleField({ label, value, onValueChange, helper }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {!!helper && <Text style={styles.toggleHelper}>{helper}</Text>}
      </View>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

export function EmptyState({ title, description, actionLabel, onAction, icon = '🌾' }) {
  return (
    <Card style={styles.emptyCard}>
      <View style={styles.emptyIconBadge}>
        <Text style={styles.emptyIcon}>{icon}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {actionLabel ? <Button label={actionLabel} onPress={onAction} style={{ marginTop: spacing.md }} /> : null}
    </Card>
  );
}

export function ProductMedia({ uri, title, category, style }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const fallbackLabel = category || initialsFromName(title || 'Product');

  if (!uri || loadFailed) {
    return (
      <View style={[styles.mediaFrame, styles.mediaFallback, style]}>
        <Text style={styles.mediaFallbackLabel}>{fallbackLabel}</Text>
        <Text style={styles.mediaFallbackTitle}>{title}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.mediaFrame, style]}>
      <Image
        source={{ uri }}
        style={styles.mediaImage}
        onError={() => setLoadFailed(true)}
        resizeMode="cover"
      />
      <View style={styles.mediaOverlay} />
      <View style={styles.mediaBadgeWrap}>
        <Badge label={category || 'Produce'} tone="success" />
      </View>
    </View>
  );
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

export function FieldRow({ children, style }) {
  return <View style={[styles.fieldRow, style]}>{children}</View>;
}

export function Callout({ title, description, tone = 'neutral' }) {
  const palette = badgeTones[tone] || badgeTones.neutral;
  return (
    <View style={[styles.callout, { backgroundColor: palette.background, borderColor: palette.border, borderLeftColor: palette.text }]}>
      <Text style={[styles.calloutTitle, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.calloutDescription, { color: palette.text }]}>{description}</Text>
    </View>
  );
}

export function DetailModal({
  visible,
  title,
  subtitle,
  eyebrow,
  badgeLabel,
  badgeTone = 'primary',
  onClose,
  children,
  actions
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <Modal visible={visible} transparent animationType={isDesktop ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View
        style={[
          styles.detailBackdrop,
          Platform.OS === 'web' && styles.detailBackdropWeb,
          isDesktop && styles.detailBackdropDesktop
        ]}
      >
        <View
          accessibilityRole="dialog"
          accessibilityLabel={`${title} dialog`}
          style={[styles.detailSheet, isDesktop && styles.detailSheetDesktop]}
        >
          <ScrollView
            contentContainerStyle={[styles.detailContent, isDesktop && styles.detailContentDesktop]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                {!!eyebrow && <Text style={styles.detailEyebrow}>{eyebrow}</Text>}
                {!!badgeLabel && <Badge label={badgeLabel} tone={badgeTone} style={styles.detailBadge} />}
                <Text style={styles.detailTitle}>{title}</Text>
                {!!subtitle && <Text style={styles.detailSubtitle}>{subtitle}</Text>}
              </View>
              <Button label="Close" variant="ghost" size="sm" onPress={onClose} />
            </View>

            {children}

            {actions ? <View style={styles.detailActions}>{actions}</View> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function SearchField(props) {
  return <Input {...props} inputStyle={styles.searchInput} />;
}

const badgeTones = {
  neutral: {
    background: colors.surfaceSoft,
    border: colors.borderSoft,
    text: colors.text
  },
  primary: {
    background: '#E4F2E4',
    border: '#C4E0C4',
    text: colors.primaryDark
  },
  success: {
    background: '#E4F7EF',
    border: '#C8EBD7',
    text: colors.success
  },
  warning: {
    background: colors.accentSoft,
    border: '#F0D69A',
    text: colors.warning
  },
  danger: {
    background: '#F9E4E4',
    border: '#F0C1C1',
    text: colors.danger
  },
  info: {
    background: '#E6F0FD',
    border: '#C7D9F6',
    text: colors.info
  }
};

const statTones = {
  primary: {
    background: '#EAF5EA',
    border: '#D5E8D6',
    text: colors.primaryDark
  },
  accent: {
    background: '#FFF3D8',
    border: '#F0D6A5',
    text: '#8C5A00'
  },
  info: {
    background: '#E8F0FD',
    border: '#CAD9F8',
    text: colors.info
  },
  success: {
    background: '#E4F7EF',
    border: '#C8EBD7',
    text: colors.success
  },
  danger: {
    background: '#F9E4E4',
    border: '#F0C1C1',
    text: colors.danger
  }
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4
  },
  cardPressable: {
    cursor: 'pointer'
  },
  cardHover: {
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    borderColor: '#C8D7CD'
  },
  cardFocused: {
    borderColor: colors.primary,
    shadowOpacity: 0.2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingLeft: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary
  },
  sectionEyebrow: {
    color: colors.primaryDark,
    fontSize: typeScale.xs,
    fontWeight: weights.bold,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typeScale.xl,
    fontWeight: weights.bold
  },
  sectionSubtitle: {
    color: colors.muted,
    marginTop: 4,
    fontSize: typeScale.sm,
    lineHeight: 18
  },
  button: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  buttonHover: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  buttonFocused: {
    borderColor: colors.primary
  },
  buttonLabel: {
    fontSize: typeScale.md,
    fontWeight: weights.semibold
  },
  buttonIcon: {
    fontSize: typeScale.md
  },
  inputLabel: {
    color: colors.text,
    fontSize: typeScale.sm,
    fontWeight: weights.semibold,
    marginBottom: 6
  },
  inputWrap: {
    position: 'relative'
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typeScale.md
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top'
  },
  inputRight: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center'
  },
  inputHelper: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: 6
  },
  searchInput: {
    backgroundColor: colors.surfaceSoft
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  badgeText: {
    fontSize: typeScale.xs,
    fontWeight: weights.semibold
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 8
  },
  chipHover: {
    backgroundColor: '#F8FBF8',
    borderColor: '#C9D9CE',
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  chipFocused: {
    borderColor: colors.primary
  },
  chipText: {
    fontSize: typeScale.sm,
    fontWeight: weights.semibold
  },
  statCard: {
    flex: 1,
    minWidth: 156
  },
  statCardPressable: {
    cursor: 'pointer'
  },
  statTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  statIcon: {
    fontSize: 18
  },
  statHint: {
    fontSize: typeScale.xs,
    fontWeight: weights.semibold
  },
  statValue: {
    fontSize: typeScale.xxl,
    fontWeight: weights.bold,
    marginBottom: 2
  },
  statLabel: {
    fontSize: typeScale.sm,
    fontWeight: weights.medium
  },
  carouselRow: {
    gap: spacing.md,
    paddingVertical: spacing.xs
  },
  carouselViewport: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0
  },
  carouselWrap: {
    minHeight: 212
  },
  carouselCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 212
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md
  },
  carouselTag: {
    color: colors.muted,
    fontSize: typeScale.xs,
    fontWeight: weights.semibold
  },
  carouselTitle: {
    color: colors.text,
    fontSize: typeScale.xl,
    fontWeight: weights.bold,
    lineHeight: 30,
    marginTop: spacing.md
  },
  carouselDescription: {
    color: colors.muted,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  carouselStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md
  },
  carouselStat: {
    minWidth: 88,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  carouselStatValue: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.bold
  },
  carouselStatLabel: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: 2
  },
  carouselFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg
  },
  carouselCta: {
    color: colors.primaryDark,
    fontSize: typeScale.sm,
    fontWeight: weights.bold
  },
  carouselArrow: {
    color: colors.primaryDark,
    fontSize: typeScale.lg,
    fontWeight: weights.bold
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)'
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: typeScale.lg,
    fontWeight: weights.bold
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  toggleLabel: {
    color: colors.text,
    fontSize: typeScale.md,
    fontWeight: weights.semibold
  },
  toggleHelper: {
    color: colors.muted,
    fontSize: typeScale.xs,
    marginTop: 3,
    lineHeight: 16
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    backgroundColor: '#FCFDFB'
  },
  emptyIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: spacing.md
  },
  emptyIcon: {
    fontSize: 32
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typeScale.lg,
    fontWeight: weights.bold,
    textAlign: 'center'
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: typeScale.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSoft
  },
  mediaFrame: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSoft,
    position: 'relative'
  },
  mediaFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md
  },
  mediaOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
    backgroundColor: 'rgba(13, 31, 22, 0.18)'
  },
  mediaBadgeWrap: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm
  },
  mediaFallbackLabel: {
    color: colors.primaryDark,
    fontSize: typeScale.xl,
    fontWeight: weights.bold,
    letterSpacing: 0.8,
    textAlign: 'center'
  },
  mediaFallbackTitle: {
    color: colors.muted,
    fontSize: typeScale.sm,
    marginTop: 6,
    textAlign: 'center'
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg
  },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  callout: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 4
  },
  calloutTitle: {
    fontSize: typeScale.md,
    fontWeight: weights.bold,
    marginBottom: 4
  },
  calloutDescription: {
    fontSize: typeScale.sm,
    lineHeight: 20
  },
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 22, 15, 0.45)',
    justifyContent: 'flex-end'
  },
  detailBackdropWeb: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000
  },
  detailBackdropDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl
  },
  detailSheet: {
    maxHeight: '92%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.border
  },
  detailSheetDesktop: {
    width: '100%',
    maxWidth: 960,
    maxHeight: '86%',
    borderRadius: 28,
    shadowColor: colors.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8
  },
  detailContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  detailContentDesktop: {
    padding: spacing.xxl
  },
  detailHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start'
  },
  detailEyebrow: {
    color: colors.primaryDark,
    fontSize: typeScale.xs,
    fontWeight: weights.bold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  detailBadge: {
    marginBottom: spacing.sm
  },
  detailTitle: {
    color: colors.text,
    fontSize: typeScale.xl,
    fontWeight: weights.bold
  },
  detailSubtitle: {
    color: colors.muted,
    fontSize: typeScale.sm,
    lineHeight: 20,
    marginTop: 6
  },
  detailActions: {
    gap: spacing.sm
  }
});
