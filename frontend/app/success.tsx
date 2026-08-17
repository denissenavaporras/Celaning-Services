import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Linking, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, getDeviceId, Booking } from "@/src/lib/api";

export default function Success() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const deviceId = await getDeviceId();
        const b = await api.getBooking(id, deviceId);
        setBooking(b);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function openMaps() {
    if (!booking) return;
    const q = encodeURIComponent(booking.address);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${q}`,
      android: `geo:0,0?q=${q}`,
      default: `https://www.google.com/maps/search/?api=1&query=${q}`,
    })!;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
    });
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator color={colors.brandPrimary} /></View>;
  if (!booking) return <View style={styles.loader}><Text>Termin nicht gefunden</Text></View>;

  const isPaid = ["paid", "confirmed", "in_progress", "completed"].includes(booking.status);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={styles.iconWrap}>
            <View style={[styles.iconCircle, { backgroundColor: isPaid ? colors.success : colors.warning }]}>
              <Ionicons name={isPaid ? "checkmark" : "time"} size={44} color="#fff" />
            </View>
          </View>
          <Text testID="success-title" style={styles.title}>
            {isPaid ? "Termin bestätigt!" : "Zahlung ausstehend"}
          </Text>
          <Text style={styles.subtitle}>
            {isPaid
              ? "Sie erhalten eine Benachrichtigung, sobald das Team unterwegs ist."
              : "Schließen Sie die Zahlung ab, um Ihren Termin zu sichern."}
          </Text>

          <View style={styles.card}>
            <View style={styles.rowH}>
              <View style={styles.iconBox}>
                <Ionicons name="sparkles" size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowSmall}>Service</Text>
                <Text style={styles.rowBig}>{booking.service_name}</Text>
              </View>
              <Text style={styles.priceTxt}>€{(booking.final_price ?? booking.service_price).toFixed(0)}</Text>
            </View>
            <View style={styles.dividerRow} />
            <View style={styles.rowH}>
              <View style={styles.iconBox}>
                <Ionicons name="calendar" size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowSmall}>Datum & Uhrzeit</Text>
                <Text style={styles.rowBig}>
                  {new Date(booking.scheduled_date + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })} · {booking.scheduled_time} Uhr
                </Text>
              </View>
            </View>
            <View style={styles.dividerRow} />
            <View style={styles.rowH}>
              <View style={styles.iconBox}>
                <Ionicons name="location" size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowSmall}>Adresse</Text>
                <Text style={styles.rowBig}>{booking.address}</Text>
              </View>
            </View>
            <View style={styles.dividerRow} />
            <View style={styles.rowH}>
              <View style={styles.iconBox}>
                <Ionicons name="person" size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowSmall}>Kunde</Text>
                <Text style={styles.rowBig}>{booking.customer_name}</Text>
                <Text style={styles.rowSmall}>{booking.customer_phone}</Text>
              </View>
            </View>
            {booking.payment_ref && (
              <>
                <View style={styles.dividerRow} />
                <View style={styles.rowH}>
                  <View style={styles.iconBox}>
                    <Ionicons name="card" size={20} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowSmall}>Zahlungsreferenz</Text>
                    <Text style={styles.rowBig}>{booking.payment_ref}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <Pressable testID="open-maps-btn" onPress={openMaps} style={styles.mapsBtn}>
            <Ionicons name="navigate" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.mapsText}>Route in Maps anzeigen</Text>
          </Pressable>

          {!isPaid && (
            <Pressable
              testID="go-checkout-btn"
              onPress={() => router.replace({ pathname: "/checkout", params: { id: booking.id } })}
              style={styles.altBtn}
            >
              <Text style={styles.altBtnText}>Jetzt bezahlen</Text>
            </Pressable>
          )}

          <Pressable testID="back-home-btn" onPress={() => router.replace("/")} style={styles.altBtnGhost}>
            <Text style={styles.altBtnGhostText}>Zurück zur Startseite</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  iconWrap: { alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.lg },
  iconCircle: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: typography.sizes.xxl, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  subtitle: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.xl },

  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  rowH: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowSmall: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary },
  rowBig: { fontSize: typography.sizes.base, color: colors.onSurface, fontWeight: "600", marginTop: 2 },
  priceTxt: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.brandPrimary },
  dividerRow: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },

  mapsBtn: {
    backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.pill,
    flexDirection: "row", justifyContent: "center", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg,
  },
  mapsText: { color: colors.onBrandPrimary, fontSize: typography.sizes.base, fontWeight: "700" },

  altBtn: { marginTop: spacing.md, backgroundColor: colors.brandSecondary, paddingVertical: 14, borderRadius: radius.pill, alignItems: "center" },
  altBtnText: { color: colors.onBrandSecondary, fontWeight: "700", fontSize: typography.sizes.base },
  altBtnGhost: { marginTop: spacing.md, paddingVertical: 14, alignItems: "center" },
  altBtnGhostText: { color: colors.onSurfaceTertiary, fontSize: typography.sizes.base, fontWeight: "600" },
});
