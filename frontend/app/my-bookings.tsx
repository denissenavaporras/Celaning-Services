import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, getDeviceId, Booking } from "@/src/lib/api";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: "Zahlung ausstehend", color: colors.warning, bg: "#FFF3E0" },
  paid: { label: "Bezahlt", color: colors.brandPrimary, bg: colors.brandSecondary },
  confirmed: { label: "Bestätigt", color: colors.brandPrimary, bg: colors.brandSecondary },
  in_progress: { label: "In Bearbeitung", color: colors.brandPrimary, bg: colors.brandTertiary },
  completed: { label: "Abgeschlossen", color: colors.success, bg: "#DFF6E3" },
  cancelled: { label: "Storniert", color: colors.error, bg: "#FFE3E1" },
};

export default function MyBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const id = await getDeviceId();
      const list = await api.customerBookings(id);
      setBookings(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openMaps(address: string) {
    const q = encodeURIComponent(address);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${q}`,
      android: `geo:0,0?q=${q}`,
      default: `https://www.google.com/maps/search/?api=1&query=${q}`,
    })!;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Meine Termine</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
        >
          {bookings.length === 0 ? (
            <View testID="empty-list" style={styles.empty}>
              <Ionicons name="calendar-clear-outline" size={48} color={colors.brandPrimary} />
              <Text style={styles.emptyTitle}>Noch keine Termine</Text>
              <Text style={styles.emptyText}>Buchen Sie Ihre erste Reinigung, um sie hier zu sehen.</Text>
              <Pressable testID="empty-book-btn" onPress={() => router.push("/book")} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Jetzt buchen</Text>
              </Pressable>
            </View>
          ) : (
            bookings.map((b) => (
              <View key={b.id} style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{b.service_name}</Text>
                    <Text style={styles.metaTxt}>
                      {new Date(b.scheduled_date + "T00:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" })} · {b.scheduled_time} Uhr
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: STATUS_META[b.status]?.bg }]}>
                    <Text style={[styles.pillTxt, { color: STATUS_META[b.status]?.color }]}>{STATUS_META[b.status]?.label || b.status}</Text>
                  </View>
                </View>
                <Text style={styles.addr}><Ionicons name="location" size={12} /> {b.address}</Text>
                <View style={styles.actions}>
                  <Pressable testID={`open-detail-${b.id}`} onPress={() => router.push({ pathname: "/success", params: { id: b.id } })} style={styles.actionGhost}>
                    <Text style={styles.actionGhostTxt}>Details</Text>
                  </Pressable>
                  <Pressable testID={`open-maps-${b.id}`} onPress={() => openMaps(b.address)} style={styles.actionSolid}>
                    <Ionicons name="navigate" size={14} color={colors.onBrandPrimary} />
                    <Text style={styles.actionSolidTxt}>Route</Text>
                  </Pressable>
                </View>
                {b.status === "pending_payment" && (
                  <Pressable
                    testID={`pay-${b.id}`}
                    onPress={() => router.push({ pathname: "/checkout", params: { id: b.id } })}
                    style={styles.payLink}
                  >
                    <Ionicons name="card" size={14} color={colors.warning} />
                    <Text style={styles.payLinkTxt}>Zahlung abschließen</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surface,
  },
  backBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", padding: spacing.xl, marginTop: 48 },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.md },
  emptyText: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm },
  emptyBtn: { marginTop: spacing.lg, backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.pill },
  emptyBtnText: { color: colors.onBrandPrimary, fontWeight: "700" },

  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.sm },
  name: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },
  metaTxt: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  pillTxt: { fontSize: 11, fontWeight: "700" },
  addr: { fontSize: typography.sizes.sm, color: colors.onSurfaceSecondary, marginBottom: spacing.md },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionGhost: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.brandSecondary, alignItems: "center" },
  actionGhostTxt: { color: colors.onBrandSecondary, fontWeight: "700", fontSize: typography.sizes.sm },
  actionSolid: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 },
  actionSolidTxt: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: typography.sizes.sm },
  payLink: { marginTop: spacing.sm, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, paddingVertical: 8 },
  payLinkTxt: { color: colors.warning, fontWeight: "700", fontSize: typography.sizes.sm },
});
