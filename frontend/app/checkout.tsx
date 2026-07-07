import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, Booking } from "@/src/lib/api";

export default function Checkout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("12/28");
  const [cvc, setCvc] = useState("123");

  useEffect(() => {
    if (!id) return;
    api.getBooking(id)
      .then(setBooking)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function formatCard(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 16);
    return d.replace(/(\d{4})(?=\d)/g, "$1 ");
  }
  function formatExp(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length < 3) return d;
    return `${d.slice(0, 2)}/${d.slice(2)}`;
  }

  async function pay() {
    if (!booking) return;
    setError("");
    setPaying(true);
    try {
      await api.payBooking(booking.id, {
        card_number: cardNumber,
        card_holder: holder.trim(),
        exp,
        cvc,
      });
      router.replace({ pathname: "/success", params: { id: booking.id } });
    } catch (e: any) {
      setError(e.message || "Error en el pago");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brandPrimary} />
      </View>
    );
  }
  if (!booking) {
    return (
      <View style={styles.loader}>
        <Text>{error || "Cita no encontrada"}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Pago seguro</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Order summary */}
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Resumen de tu cita</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Servicio</Text>
              <Text style={styles.rowValue}>{booking.service_name}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fecha</Text>
              <Text style={styles.rowValue}>
                {new Date(booking.scheduled_date + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "2-digit", month: "long" })}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Hora</Text>
              <Text style={styles.rowValue}>{booking.scheduled_time}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Dirección</Text>
              <Text numberOfLines={2} style={[styles.rowValue, { flex: 1, textAlign: "right", marginLeft: spacing.md }]}>
                {booking.address}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>€{booking.service_price.toFixed(2)} EUR</Text>
            </View>
          </View>

          {/* Card form */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="lock-closed" size={16} color={colors.brandPrimary} />
              <Text style={styles.cardHeaderText}>Pago simulado — modo demo</Text>
            </View>

            <Text style={styles.inputLabel}>Número de tarjeta</Text>
            <TextInput
              testID="card-number"
              value={cardNumber}
              onChangeText={(v) => setCardNumber(formatCard(v))}
              keyboardType="number-pad"
              placeholder="4242 4242 4242 4242"
              placeholderTextColor={colors.info}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Titular</Text>
            <TextInput
              testID="card-holder"
              value={holder}
              onChangeText={setHolder}
              placeholder="Nombre en la tarjeta"
              placeholderTextColor={colors.info}
              style={styles.input}
              autoCapitalize="words"
            />

            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Vencimiento</Text>
                <TextInput
                  testID="card-exp"
                  value={exp}
                  onChangeText={(v) => setExp(formatExp(v))}
                  placeholder="MM/AA"
                  placeholderTextColor={colors.info}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVC</Text>
                <TextInput
                  testID="card-cvc"
                  value={cvc}
                  onChangeText={(v) => setCvc(v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="123"
                  placeholderTextColor={colors.info}
                  keyboardType="number-pad"
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color={colors.brandPrimary} />
            <Text style={styles.infoText}>
              Tu tarjeta será cobrada solo cuando confirmes. Puedes usar 4242 4242 4242 4242 para simular un pago exitoso.
            </Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            testID="pay-now-btn"
            disabled={paying || !holder.trim()}
            onPress={pay}
            style={[styles.payBtn, (paying || !holder.trim()) && { opacity: 0.5 }]}
          >
            {paying ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.payBtnText}>Pagar €{booking.service_price.toFixed(0)} y confirmar</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.pill, backgroundColor: colors.brandTertiary },

  summary: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface, marginBottom: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, alignItems: "flex-start" },
  rowLabel: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary },
  rowValue: { fontSize: typography.sizes.base, color: colors.onSurface, fontWeight: "600" },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
  totalLabel: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },
  totalValue: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.brandPrimary },

  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  cardHeaderText: { fontSize: typography.sizes.sm, color: colors.brandPrimary, fontWeight: "600" },
  inputLabel: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, fontWeight: "600", marginBottom: 6, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.sizes.base,
    color: colors.onSurface,
    minHeight: 48,
  },

  infoBox: {
    marginTop: spacing.md,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  infoText: { flex: 1, fontSize: typography.sizes.sm, color: colors.onBrandTertiary, lineHeight: 18 },
  errorText: { color: colors.error, marginTop: spacing.md, textAlign: "center" },

  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  payBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16,
    borderRadius: radius.pill,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  payBtnText: { color: colors.onBrandPrimary, fontSize: typography.sizes.base, fontWeight: "800" },
});
