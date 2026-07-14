import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, getDeviceId, Booking } from "@/src/lib/api";

const HERO_IMG =
  "https://images.pexels.com/photos/5998138/pexels-photo-5998138.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: "Zahlung ausstehend", color: colors.warning, bg: "#FFF3E0" },
  paid: { label: "Bezahlt", color: colors.brandPrimary, bg: colors.brandSecondary },
  confirmed: { label: "Bestätigt", color: colors.brandPrimary, bg: colors.brandSecondary },
  in_progress: { label: "In Bearbeitung", color: colors.brandPrimary, bg: colors.brandTertiary },
  completed: { label: "Abgeschlossen", color: colors.success, bg: "#DFF6E3" },
  cancelled: { label: "Storniert", color: colors.error, bg: "#FFE3E1" },
};

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const id = await getDeviceId();
      const list = await api.customerBookings(id);
      setBookings(list);
    } catch (e) {
      console.log("load bookings err", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const upcoming = bookings.filter((b) => !["cancelled", "completed"].includes(b.status));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={HERO_IMG} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
          <LinearGradient
            colors={["rgba(0,0,0,0.05)", "rgba(44,51,37,0.55)", "rgba(44,51,37,0.92)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView edges={["top"]} style={styles.heroContent}>
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroBrand}>Cleaning Service Wels</Text>
                <Text style={styles.heroSubtitle}>Reinigung + Kinderbetreuung von Dennisse Nava</Text>
              </View>
              <Pressable
                testID="admin-shortcut-btn"
                onPress={() => router.push("/admin/login")}
                style={styles.adminChip}
              >
                <Ionicons name="briefcase-outline" size={16} color={colors.onSurfaceInverse} />
                <Text style={styles.adminChipText}>Admin</Text>
              </Pressable>
            </View>
            <View style={styles.heroBottom}>
              <Text style={styles.heroTitle}>Sauberes Zuhause und{"\n"}glückliche Kinder in Wels</Text>
              <Text style={styles.heroSub}>Verfügbar Mo–So von 14:00 bis 19:00 Uhr</Text>
              <Pressable
                testID="book-new-btn"
                onPress={() => router.push("/book")}
                style={({ pressed }) => [styles.ctaPrimary, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.ctaPrimaryText}>Termin buchen</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* Upcoming bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nächste Termine</Text>
            {bookings.length > 0 && (
              <Pressable testID="see-all-btn" onPress={() => router.push("/my-bookings")}>
                <Text style={styles.linkText}>Alle anzeigen</Text>
              </Pressable>
            )}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
          ) : upcoming.length === 0 ? (
            <View testID="empty-bookings" style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={40} color={colors.brandPrimary} />
              <Text style={styles.emptyTitle}>Noch keine Termine</Text>
              <Text style={styles.emptyText}>Buchen Sie Ihre erste Reinigung in weniger als einer Minute.</Text>
            </View>
          ) : (
            upcoming.map((b) => (
              <Pressable
                key={b.id}
                testID={`booking-card-${b.id}`}
                onPress={() => router.push({ pathname: "/success", params: { id: b.id } })}
                style={({ pressed }) => [styles.bookingCard, pressed && { opacity: 0.95 }]}
              >
                <View style={styles.bookingRow}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>{b.scheduled_date.slice(-2)}</Text>
                    <Text style={styles.dateMon}>
                      {new Date(b.scheduled_date).toLocaleDateString("de-DE", { month: "short" }).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingTitle}>{b.service_name}</Text>
                    <Text style={styles.bookingMeta}>
                      <Ionicons name="time-outline" size={12} /> {b.scheduled_time}  ·  €{(b.final_price ?? b.service_price).toFixed(0)}
                    </Text>
                    <Text numberOfLines={1} style={styles.bookingAddr}>
                      <Ionicons name="location-outline" size={12} /> {b.address}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_META[b.status]?.bg || colors.brandTertiary }]}>
                    <Text style={[styles.statusText, { color: STATUS_META[b.status]?.color || colors.brandPrimary }]}>
                      {STATUS_META[b.status]?.label || b.status}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* About Dennisse */}
        <View style={styles.section}>
          <Pressable
            testID="about-card"
            onPress={() => router.push("/info")}
            style={styles.aboutCard}
          >
            <View style={styles.aboutAvatar}>
              <Ionicons name="person" size={26} color={colors.onBrandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutName}>Ich bin Dennisse Nava Porras</Text>
              <Text style={styles.aboutBody}>
                5 Jahre Erfahrung mit Haushalten und Kindern in Wels. Ökologische Produkte, Erste-Hilfe-Ausbildung und Frühförderung.
              </Text>
              <Text style={styles.aboutLink}>Pakete & Angebote entdecken →</Text>
            </View>
          </Pressable>
        </View>

        {/* Value props */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Warum uns wählen?</Text>
          <View style={styles.featuresRow}>
            <View style={styles.featureCard}>
              <Ionicons name="shield-checkmark" size={22} color={colors.brandPrimary} />
              <Text style={styles.featureTitle}>Geprüft</Text>
              <Text style={styles.featureText}>Erste Hilfe + Haftpflicht</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="card" size={22} color={colors.brandPrimary} />
              <Text style={styles.featureTitle}>Sichere Zahlung</Text>
              <Text style={styles.featureText}>Online vor dem Service</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="leaf" size={22} color={colors.brandPrimary} />
              <Text style={styles.featureTitle}>Umweltfreundlich</Text>
              <Text style={styles.featureText}>Ohne Chemie, kinderfreundlich</Text>
            </View>
          </View>
        </View>

        {/* Legal footer */}
        <View style={styles.section}>
          <Pressable
            testID="home-faq-link"
            onPress={() => router.push("/faq")}
            style={styles.footerLink}
          >
            <Ionicons name="help-circle-outline" size={16} color={colors.onSurfaceTertiary} />
            <Text style={styles.footerLinkText}>Häufige Fragen (FAQ)</Text>
          </Pressable>
          <Pressable
            testID="home-privacy-link"
            onPress={() => router.push("/privacy")}
            style={styles.footerLink}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.onSurfaceTertiary} />
            <Text style={styles.footerLinkText}>Datenschutzerklärung (DSGVO)</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          testID="my-bookings-btn"
          onPress={() => router.push("/my-bookings")}
          style={styles.bottomBtnSecondary}
        >
          <Ionicons name="list-outline" size={18} color={colors.onBrandSecondary} />
          <Text style={styles.bottomBtnSecondaryText}>Meine Termine</Text>
        </Pressable>
        <Pressable
          testID="book-sticky-btn"
          onPress={() => router.push("/book")}
          style={styles.bottomBtnPrimary}
        >
          <Ionicons name="add-circle" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.bottomBtnPrimaryText}>Neuer Termin</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 340,
    backgroundColor: colors.surfaceInverse,
    overflow: "hidden",
  },
  heroContent: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: "space-between" },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: spacing.sm },
  heroBrand: { color: colors.onSurfaceInverse, fontSize: typography.sizes.xl, fontWeight: "700" },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: typography.sizes.base, marginTop: 2 },
  adminChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  adminChipText: { color: colors.onSurfaceInverse, fontSize: typography.sizes.sm, fontWeight: "600" },
  heroBottom: { paddingBottom: spacing.xl },
  heroTitle: { color: colors.onSurfaceInverse, fontSize: typography.sizes.xxl, fontWeight: "800", lineHeight: 32 },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: typography.sizes.sm, marginTop: 6, fontWeight: "600" },
  ctaPrimary: {
    marginTop: spacing.md,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ctaPrimaryText: { color: colors.onBrandPrimary, fontSize: typography.sizes.lg, fontWeight: "700" },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sectionTitle: { color: colors.onSurface, fontSize: typography.sizes.xl, fontWeight: "700" },
  linkText: { color: colors.brandPrimary, fontSize: typography.sizes.base, fontWeight: "600" },

  emptyCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.sm },
  emptyText: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, textAlign: "center" },

  bookingCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dateBox: {
    width: 54,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: { color: colors.brandPrimary, fontSize: typography.sizes.xl, fontWeight: "800" },
  dateMon: { color: colors.brandPrimary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  bookingTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },
  bookingMeta: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  bookingAddr: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  statusText: { fontSize: 11, fontWeight: "700" },

  featuresRow: { flexDirection: "row", gap: spacing.md },
  featureCard: {
    flex: 1,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  featureTitle: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.onBrandTertiary, marginTop: 4 },
  featureText: { fontSize: 11, color: colors.onBrandTertiary },

  aboutCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  aboutAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutName: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onBrandTertiary },
  aboutBody: { fontSize: typography.sizes.sm, color: colors.onBrandTertiary, marginTop: 4, lineHeight: 18 },
  aboutLink: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.brandPrimary, marginTop: spacing.sm },

  footerLink: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, paddingVertical: spacing.md,
  },
  footerLinkText: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, fontWeight: "600" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
  },
  bottomBtnSecondary: {
    flex: 1,
    backgroundColor: colors.brandSecondary,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  bottomBtnSecondaryText: { color: colors.onBrandSecondary, fontSize: typography.sizes.base, fontWeight: "700" },
  bottomBtnPrimary: {
    flex: 1.4,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  bottomBtnPrimaryText: { color: colors.onBrandPrimary, fontSize: typography.sizes.base, fontWeight: "700" },
});
