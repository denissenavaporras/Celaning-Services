import { useEffect, useMemo, useState } from "react";
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
  Keyboard,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, getDeviceId, Service } from "@/src/lib/api";

// Verfügbarkeit: Mo-So von 14:00 bis 19:00 Uhr
const TIME_SLOTS = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function getNextDays(count: number) {
  const out: { iso: string; day: string; num: string; mon: string }[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    const iso = nd.toISOString().slice(0, 10);
    const day = nd.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 3).toUpperCase();
    const num = String(nd.getDate()).padStart(2, "0");
    const mon = nd.toLocaleDateString("de-DE", { month: "short" }).toUpperCase();
    out.push({ iso, day, num, mon });
  }
  return out;
}

export default function BookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountApplied, setDiscountApplied] = useState<null | { code: string; description: string; discount_amount: number; final_price: number }>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [error, setError] = useState("");

  const days = useMemo(() => getNextDays(14), []);

  useEffect(() => {
    api.listServices().then((s) => {
      setServices(s);
      if (s.length) setSelectedService(s[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
    setSelectedDate(days[1]?.iso || "");
    setSelectedTime("14:00");
  }, []);

  const canContinue =
    !!selectedService && !!selectedDate && !!selectedTime && name.trim().length > 1 && phone.trim().length >= 7 && address.trim().length > 4 && consent;

  async function applyDiscount() {
    if (!selectedService || !discountCode.trim()) return;
    setDiscountLoading(true);
    setDiscountError("");
    try {
      const r = await api.validateDiscount(discountCode.trim(), selectedService.price);
      setDiscountApplied({ code: r.code, description: r.description, discount_amount: r.discount_amount, final_price: r.final_price });
    } catch (e: any) {
      setDiscountApplied(null);
      setDiscountError(e.message || "Ungültiger Code");
    } finally {
      setDiscountLoading(false);
    }
  }

  function clearDiscount() {
    setDiscountApplied(null);
    setDiscountCode("");
    setDiscountError("");
  }

  // Reset discount when service changes (price recalculation needed)
  useEffect(() => {
    setDiscountApplied(null);
    setDiscountError("");
  }, [selectedService?.id]);

  async function onSubmit() {
    if (!canContinue || !selectedService) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setError("");
    try {
      const device_id = await getDeviceId();
      const booking = await api.createBooking({
        device_id,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        service_id: selectedService.id,
        address: address.trim(),
        scheduled_date: selectedDate,
        scheduled_time: selectedTime,
        notes: notes.trim() || undefined,
        consent_accepted: consent,
        discount_code: discountApplied?.code || undefined,
      });
      router.replace({ pathname: "/checkout", params: { id: booking.id } });
    } catch (e: any) {
      setError(e.message || "Fehler beim Erstellen des Termins");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brandPrimary} />
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
        <Text style={styles.headerTitle}>Termin buchen</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Availability banner */}
          <View testID="availability-banner" style={styles.availBanner}>
            <Ionicons name="time" size={18} color={colors.brandPrimary} />
            <Text style={styles.availText}>
              Verfügbar Mo–So von 14:00 bis 19:00 Uhr
            </Text>
          </View>

          {/* Services */}
          <Text style={styles.label}>1. Service auswählen</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}
          >
            {services.map((s) => {
              const selected = selectedService?.id === s.id;
              return (
                <Pressable
                  key={s.id}
                  testID={`service-${s.id}`}
                  onPress={() => setSelectedService(s)}
                  style={[styles.serviceCard, selected && styles.serviceCardSel]}
                >
                  <Image source={s.image_url} style={styles.serviceImg} contentFit="cover" />
                  <View style={{ padding: spacing.md }}>
                    <Text style={styles.serviceName}>{s.name}</Text>
                    <Text style={styles.serviceMeta}>{s.duration_minutes / 60} Std. · ab</Text>
                    <Text style={styles.servicePrice}>€{s.price.toFixed(0)}</Text>
                  </View>
                  {selected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color={colors.onBrandPrimary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Date */}
          <Text style={[styles.label, { marginTop: spacing.xl }]}>2. Tag wählen</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
          >
            {days.map((d) => {
              const sel = selectedDate === d.iso;
              return (
                <Pressable
                  key={d.iso}
                  testID={`day-${d.iso}`}
                  onPress={() => setSelectedDate(d.iso)}
                  style={[styles.dayChip, sel && styles.dayChipSel]}
                >
                  <Text style={[styles.dayChipDay, sel && styles.chipTextSel]}>{d.day}</Text>
                  <Text style={[styles.dayChipNum, sel && styles.chipTextSel]}>{d.num}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Time */}
          <Text style={[styles.label, { marginTop: spacing.xl }]}>3. Uhrzeit wählen</Text>
          <Text style={styles.helperText}>Termine von 14:00 bis 19:00 Uhr verfügbar.</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg, marginTop: spacing.sm }}
          >
            {TIME_SLOTS.map((t) => {
              const sel = selectedTime === t;
              return (
                <Pressable
                  key={t}
                  testID={`time-${t}`}
                  onPress={() => setSelectedTime(t)}
                  style={[styles.timeChip, sel && styles.dayChipSel]}
                >
                  <Text style={[styles.timeChipText, sel && styles.chipTextSel]}>{t}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Customer info */}
          <Text style={[styles.label, { marginTop: spacing.xl }]}>4. Ihre Daten und Adresse</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vollständiger Name</Text>
            <TextInput
              testID="input-name"
              value={name}
              onChangeText={setName}
              placeholder="z.B. Maria Huber"
              placeholderTextColor={colors.info}
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              testID="input-phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="z.B. +43 664 123 4567"
              placeholderTextColor={colors.info}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vollständige Adresse</Text>
            <TextInput
              testID="input-address"
              value={address}
              onChangeText={setAddress}
              placeholder="Straße, Hausnummer, PLZ, Ort"
              placeholderTextColor={colors.info}
              style={styles.input}
              multiline
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notizen (optional)</Text>
            <TextInput
              testID="input-notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Besondere Hinweise, Eingang, Haustiere…"
              placeholderTextColor={colors.info}
              style={[styles.input, { height: 72 }]}
              multiline
            />
          </View>

          {/* Discount code */}
          <View style={styles.discountBox}>
            <Text style={styles.inputLabel}>Rabattcode (optional)</Text>
            {discountApplied ? (
              <View style={styles.discountApplied}>
                <Ionicons name="pricetag" size={18} color={colors.brandPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.discountAppliedTitle}>{discountApplied.code}</Text>
                  <Text style={styles.discountAppliedDesc}>{discountApplied.description} · –€{discountApplied.discount_amount.toFixed(2)}</Text>
                </View>
                <Pressable testID="discount-clear" onPress={clearDiscount}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <TextInput
                  testID="discount-input"
                  value={discountCode}
                  onChangeText={(v) => setDiscountCode(v.toUpperCase())}
                  placeholder="z.B. WILLKOMMEN10"
                  placeholderTextColor={colors.info}
                  autoCapitalize="characters"
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable
                  testID="discount-apply-btn"
                  disabled={discountLoading || !discountCode.trim()}
                  onPress={applyDiscount}
                  style={[styles.discountBtn, (discountLoading || !discountCode.trim()) && { opacity: 0.5 }]}
                >
                  {discountLoading ? (
                    <ActivityIndicator color={colors.onBrandPrimary} />
                  ) : (
                    <Text style={styles.discountBtnText}>Anwenden</Text>
                  )}
                </Pressable>
              </View>
            )}
            {discountError ? <Text style={styles.discountErr}>{discountError}</Text> : null}
          </View>

          {/* Consent checkbox */}
          <Pressable
            testID="consent-checkbox"
            onPress={() => setConsent((v) => !v)}
            style={[styles.consentBox, consent && styles.consentBoxOn]}
          >
            <View style={[styles.checkbox, consent && styles.checkboxOn]}>
              {consent && <Ionicons name="checkmark" size={16} color={colors.onBrandPrimary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentText}>
                Ich stimme zu, dass meine personenbezogenen Daten (Name, Adresse, Telefonnummer, E-Mail) zum Zweck
                der Terminvereinbarung und Durchführung der Dienstleistungen (Haushaltsreinigung und Kinderbetreuung)
                verarbeitet werden. Mir ist bekannt, dass ich meine Einwilligung jederzeit widerrufen kann. Die
                vollständige Datenschutzerklärung habe ich zur Kenntnis genommen.
              </Text>
              <Pressable
                testID="open-privacy-link"
                onPress={(e) => { e.stopPropagation?.(); router.push("/privacy"); }}
                style={styles.consentLink}
              >
                <Ionicons name="shield-checkmark" size={14} color={colors.brandPrimary} />
                <Text style={styles.consentLinkText}>Datenschutzerklärung öffnen</Text>
              </Pressable>
            </View>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stickySmall}>{discountApplied ? "Gesamt (inkl. Rabatt)" : "Geschätzter Gesamtpreis"}</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.sm }}>
              {discountApplied && selectedService ? (
                <Text style={styles.stickyStrike}>€{selectedService.price.toFixed(0)}</Text>
              ) : null}
              <Text style={styles.stickyPrice}>
                €{discountApplied ? discountApplied.final_price.toFixed(0) : selectedService ? selectedService.price.toFixed(0) : "0"}
              </Text>
            </View>
          </View>
          <Pressable
            testID="continue-payment-btn"
            disabled={!canContinue || submitting}
            onPress={onSubmit}
            style={[styles.continueBtn, (!canContinue || submitting) && { opacity: 0.4 }]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Text style={styles.continueText}>Weiter zur Zahlung</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
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

  availBanner: {
    marginTop: spacing.lg,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  availText: { flex: 1, color: colors.onBrandTertiary, fontWeight: "700", fontSize: typography.sizes.sm },

  label: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  helperText: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: -spacing.sm },

  serviceCard: {
    width: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  serviceCardSel: { borderColor: colors.brandPrimary, borderWidth: 2 },
  serviceImg: { width: "100%", height: 100 },
  serviceName: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.onSurface },
  serviceMeta: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  servicePrice: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.brandPrimary, marginTop: 4 },
  checkBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },

  dayChip: {
    width: 60,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  dayChipSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dayChipDay: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceTertiary, letterSpacing: 1 },
  dayChipNum: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
  chipTextSel: { color: colors.onBrandPrimary },

  timeChip: {
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  timeChipText: { fontSize: typography.sizes.base, fontWeight: "600", color: colors.onSurface },

  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: typography.sizes.base,
    color: colors.onSurface,
    minHeight: 48,
  },

  errorText: { color: colors.error, fontSize: typography.sizes.sm, marginTop: spacing.md, textAlign: "center" },

  consentBox: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  consentBoxOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: colors.borderStrong,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceSecondary,
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  consentText: {
    fontSize: typography.sizes.sm, color: colors.onSurfaceSecondary, lineHeight: 18,
  },
  consentLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm },
  consentLinkText: { fontSize: typography.sizes.sm, fontWeight: "700", color: colors.brandPrimary },

  discountBox: { marginTop: spacing.lg },
  discountBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    borderRadius: radius.md,
    minWidth: 100,
  },
  discountBtnText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: typography.sizes.base },
  discountApplied: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.brandPrimary,
  },
  discountAppliedTitle: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.brandPrimary, letterSpacing: 1 },
  discountAppliedDesc: { fontSize: typography.sizes.sm, color: colors.onBrandTertiary, marginTop: 2 },
  discountErr: { color: colors.error, fontSize: typography.sizes.sm, marginTop: 6 },

  stickyBar: {
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  stickySmall: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary },
  stickyPrice: { fontSize: typography.sizes.xxl, fontWeight: "800", color: colors.onSurface },
  stickyStrike: { fontSize: typography.sizes.base, color: colors.onSurfaceTertiary, textDecorationLine: "line-through" },
  continueBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  continueText: { color: colors.onBrandPrimary, fontSize: typography.sizes.base, fontWeight: "700" },
});
