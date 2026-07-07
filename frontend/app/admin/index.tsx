import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  RefreshControl, Linking, Platform, Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, Booking } from "@/src/lib/api";
import { storage } from "@/src/utils/storage";

function getNextDays(count: number) {
  const out: { iso: string; day: string; num: string; mon: string }[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    const iso = nd.toISOString().slice(0, 10);
    const day = nd.toLocaleDateString("es", { weekday: "short" }).slice(0, 3).toUpperCase();
    const num = String(nd.getDate()).padStart(2, "0");
    const mon = nd.toLocaleDateString("es", { month: "short" }).toUpperCase();
    out.push({ iso, day, num, mon });
  }
  return out;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: "Pendiente pago", color: colors.warning, bg: "#FFF3E0" },
  paid: { label: "Pagado", color: colors.brandPrimary, bg: colors.brandSecondary },
  confirmed: { label: "Confirmado", color: colors.brandPrimary, bg: colors.brandSecondary },
  in_progress: { label: "En progreso", color: colors.brandPrimary, bg: colors.brandTertiary },
  completed: { label: "Completado", color: colors.success, bg: "#DFF6E3" },
  cancelled: { label: "Cancelado", color: colors.error, bg: "#FFE3E1" },
};

const NEXT_STATUS: Record<string, string> = {
  paid: "confirmed",
  confirmed: "in_progress",
  in_progress: "completed",
};

const STATUS_ACTION: Record<string, string> = {
  paid: "Confirmar",
  confirmed: "Iniciar",
  in_progress: "Completar",
};

export default function AdminAgenda() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const days = useMemo(() => getNextDays(14), []);
  const [selectedDate, setSelectedDate] = useState<string>(days[0].iso);
  const [showAll, setShowAll] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<{ total_bookings: number; today_bookings: number; paid_bookings: number; revenue: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await storage.secureGet<string>("admin_token", "");
      if (!token) {
        router.replace("/admin/login");
        return;
      }
      const [b, s] = await Promise.all([
        api.adminBookings(showAll ? {} : { date: selectedDate }),
        api.adminStats(),
      ]);
      setBookings(b);
      setStats(s);
    } catch (e: any) {
      if ((e.message || "").toLowerCase().includes("token") || (e.message || "").toLowerCase().includes("autorizado")) {
        await storage.secureRemove("admin_token");
        router.replace("/admin/login");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, showAll]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  useEffect(() => { setLoading(true); load(); }, [selectedDate, showAll]);

  function openMaps(address: string) {
    const q = encodeURIComponent(address);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${q}`,
      android: `geo:0,0?q=${q}`,
      default: `https://www.google.com/maps/search/?api=1&query=${q}`,
    })!;
    Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
  }

  async function logout() {
    await storage.secureRemove("admin_token");
    router.replace("/");
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.updateStatus(id, status);
      setSelected(null);
      load();
    } catch (e) { /* ignore */ }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View>
          <Text style={styles.headerBrand}>Panel de agenda</Text>
          <Text style={styles.headerSmall}>Todas tus citas en un lugar</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable testID="admin-services-btn" onPress={() => router.push("/admin/services")} style={styles.headerBtn}>
            <Ionicons name="pricetags-outline" size={20} color={colors.onSurface} />
          </Pressable>
          <Pressable testID="logout-btn" onPress={logout} style={styles.headerBtn}>
            <Ionicons name="log-out-outline" size={20} color={colors.onSurface} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brandPrimary} />}
      >
        {/* Stats */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats.today_bookings}</Text>
              <Text style={styles.statLabel}>Hoy</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{stats.total_bookings}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>€{stats.revenue.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Ingresos</Text>
            </View>
          </View>
        )}

        {/* Date strip */}
        <View style={styles.stripHeader}>
          <Text style={styles.stripTitle}>{showAll ? "Todas las citas" : "Agenda del día"}</Text>
          <Pressable testID="toggle-all-btn" onPress={() => setShowAll((v) => !v)}>
            <Text style={styles.linkTxt}>{showAll ? "Ver por día" : "Ver todas"}</Text>
          </Pressable>
        </View>

        {!showAll && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
          >
            {days.map((d) => {
              const sel = selectedDate === d.iso;
              return (
                <Pressable
                  key={d.iso}
                  testID={`admin-day-${d.iso}`}
                  onPress={() => setSelectedDate(d.iso)}
                  style={[styles.dayChip, sel && styles.dayChipSel]}
                >
                  <Text style={[styles.dayChipDay, sel && styles.chipTextSel]}>{d.day}</Text>
                  <Text style={[styles.dayChipNum, sel && styles.chipTextSel]}>{d.num}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* List */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          {loading ? (
            <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
          ) : bookings.length === 0 ? (
            <View testID="empty-agenda" style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={colors.brandPrimary} />
              <Text style={styles.emptyText}>No hay limpiezas agendadas.</Text>
            </View>
          ) : (
            bookings.map((b) => (
              <Pressable
                key={b.id}
                testID={`admin-booking-${b.id}`}
                onPress={() => setSelected(b)}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeTxt}>{b.scheduled_time}</Text>
                    <Text style={styles.timeDate}>{new Date(b.scheduled_date + "T00:00:00").toLocaleDateString("es", { day: "2-digit", month: "short" })}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{b.customer_name}</Text>
                    <Text style={styles.cardMeta}>{b.service_name} · €{b.service_price.toFixed(0)}</Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      <Ionicons name="call-outline" size={11} /> {b.customer_phone}
                    </Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: STATUS_META[b.status]?.bg }]}>
                    <Text style={[styles.pillTxt, { color: STATUS_META[b.status]?.color }]}>{STATUS_META[b.status]?.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardAddr} numberOfLines={1}>
                  <Ionicons name="location" size={12} /> {b.address}
                </Text>
                <View style={styles.rowActions}>
                  <Pressable
                    testID={`route-${b.id}`}
                    onPress={() => openMaps(b.address)}
                    style={styles.routeBtn}
                  >
                    <Ionicons name="navigate" size={14} color={colors.onBrandPrimary} />
                    <Text style={styles.routeText}>Ver ruta</Text>
                  </Pressable>
                  <Pressable
                    testID={`call-${b.id}`}
                    onPress={() => Linking.openURL(`tel:${b.customer_phone}`)}
                    style={styles.callBtn}
                  >
                    <Ionicons name="call" size={14} color={colors.onBrandSecondary} />
                    <Text style={styles.callText}>Llamar</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* Booking Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={styles.modalHandle} />
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selected.service_name}</Text>
                <Text style={styles.modalSubtitle}>Cita de {selected.customer_name}</Text>

                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={18} color={colors.brandPrimary} />
                  <Text style={styles.detailText}>
                    {new Date(selected.scheduled_date + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "2-digit", month: "long" })} · {selected.scheduled_time}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="location" size={18} color={colors.brandPrimary} />
                  <Text style={styles.detailText}>{selected.address}</Text>
                </View>
                {selected.notes && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text" size={18} color={colors.brandPrimary} />
                    <Text style={styles.detailText}>{selected.notes}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={18} color={colors.brandPrimary} />
                  <Text style={styles.detailText}>{selected.customer_phone}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={18} color={colors.brandPrimary} />
                  <Text style={styles.detailText}>€{selected.service_price.toFixed(2)} — {STATUS_META[selected.status]?.label}</Text>
                </View>

                <View style={{ height: spacing.lg }} />

                <Pressable testID="modal-route-btn" onPress={() => openMaps(selected.address)} style={styles.modalPrimary}>
                  <Ionicons name="navigate" size={18} color={colors.onBrandPrimary} />
                  <Text style={styles.modalPrimaryTxt}>Abrir ruta en mapas</Text>
                </Pressable>

                {NEXT_STATUS[selected.status] && (
                  <Pressable
                    testID="modal-next-status-btn"
                    onPress={() => updateStatus(selected.id, NEXT_STATUS[selected.status])}
                    style={styles.modalSecondary}
                  >
                    <Text style={styles.modalSecondaryTxt}>{STATUS_ACTION[selected.status]} cita</Text>
                  </Pressable>
                )}

                {selected.status !== "cancelled" && selected.status !== "completed" && (
                  <Pressable
                    testID="modal-cancel-btn"
                    onPress={() => updateStatus(selected.id, "cancelled")}
                    style={styles.modalDanger}
                  >
                    <Text style={styles.modalDangerTxt}>Cancelar cita</Text>
                  </Pressable>
                )}

                <Pressable testID="modal-close-btn" onPress={() => setSelected(null)} style={styles.modalGhost}>
                  <Text style={styles.modalGhostTxt}>Cerrar</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surface,
  },
  headerBrand: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.onSurface },
  headerSmall: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary },
  headerBtn: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },

  statsRow: { flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  statCard: { flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.brandTertiary, alignItems: "center" },
  statNum: { fontSize: typography.sizes.xxl, fontWeight: "800", color: colors.brandPrimary },
  statLabel: { fontSize: typography.sizes.sm, color: colors.onBrandTertiary, marginTop: 2 },

  stripHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg, marginBottom: spacing.md, alignItems: "center" },
  stripTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },
  linkTxt: { color: colors.brandPrimary, fontWeight: "700", fontSize: typography.sizes.sm },

  dayChip: {
    width: 60, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center",
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexShrink: 0,
  },
  dayChipSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dayChipDay: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceTertiary, letterSpacing: 1 },
  dayChipNum: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  chipTextSel: { color: colors.onBrandPrimary },

  empty: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.onSurfaceTertiary, fontSize: typography.sizes.base },

  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  timeBox: {
    width: 62, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: colors.brandTertiary, alignItems: "center",
  },
  timeTxt: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.brandPrimary },
  timeDate: { fontSize: 10, fontWeight: "700", color: colors.onBrandTertiary, letterSpacing: 1 },
  cardName: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },
  cardMeta: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  cardAddr: { fontSize: typography.sizes.sm, color: colors.onSurfaceSecondary, marginTop: spacing.sm },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  pillTxt: { fontSize: 10, fontWeight: "700" },

  rowActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  routeBtn: {
    flex: 1, backgroundColor: colors.brandPrimary, paddingVertical: 10, borderRadius: radius.pill,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4,
  },
  routeText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: typography.sizes.sm },
  callBtn: {
    flex: 1, backgroundColor: colors.brandSecondary, paddingVertical: 10, borderRadius: radius.pill,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4,
  },
  callText: { color: colors.onBrandSecondary, fontWeight: "700", fontSize: typography.sizes.sm },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, maxHeight: "88%",
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.md },
  modalTitle: { fontSize: typography.sizes.xxl, fontWeight: "800", color: colors.onSurface },
  modalSubtitle: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, marginTop: 2, marginBottom: spacing.lg },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  detailText: { flex: 1, fontSize: typography.sizes.base, color: colors.onSurface },
  modalPrimary: {
    backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.pill,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
  },
  modalPrimaryTxt: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.base },
  modalSecondary: {
    backgroundColor: colors.brandSecondary, paddingVertical: 14, borderRadius: radius.pill,
    alignItems: "center", marginTop: spacing.sm,
  },
  modalSecondaryTxt: { color: colors.onBrandSecondary, fontWeight: "800", fontSize: typography.sizes.base },
  modalDanger: {
    borderWidth: 1, borderColor: colors.error, paddingVertical: 14, borderRadius: radius.pill,
    alignItems: "center", marginTop: spacing.sm,
  },
  modalDangerTxt: { color: colors.error, fontWeight: "700", fontSize: typography.sizes.base },
  modalGhost: { paddingVertical: 14, alignItems: "center", marginTop: spacing.sm },
  modalGhostTxt: { color: colors.onSurfaceTertiary, fontWeight: "600" },
});
