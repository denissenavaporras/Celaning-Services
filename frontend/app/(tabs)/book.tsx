import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator, Keyboard, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";
import { api, getDeviceId, Service } from "@/src/lib/api";

const TIME_SLOTS = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const STEPS = ["Was", "Wann", "Wo"];

function getNextDays(count: number) {
  const out: { iso: string; day: string; num: string; mon: string }[] = [];
  const d = new Date();
  for (let i = 1; i <= count; i++) {
    const nd = new Date(d);
    nd.setDate(d.getDate() + i);
    const iso = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}-${String(nd.getDate()).padStart(2, "0")}`;
    out.push({
      iso,
      day: nd.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2).toUpperCase(),
      num: String(nd.getDate()).padStart(2, "0"),
      mon: nd.toLocaleDateString("de-DE", { month: "short" }).toUpperCase(),
    });
  }
  return out;
}

type Discount = { code: string; description: string; discount_amount: number; final_price: number };

export default function BookScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const days = useMemo(() => getNextDays(21), []);

  const [services, setServices] = useState<Service[]>([]);
  const [fee, setFee] = useState(10);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [service, setService] = useState<Service | null>(null);
  const [hours, setHours] = useState(2);
  const [materials, setMaterials] = useState(false);
  const [date, setDate] = useState(days[0].iso);
  const [time, setTime] = useState("14:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [discountErr, setDiscountErr] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const deviceId = await getDeviceId();
      const [list, st, profile] = await Promise.all([api.listServices(), api.settings(), api.getProfile(deviceId)]);
      setServices(list);
      setFee(st.materials_fee);
      setName(profile.name);
      setPhone(profile.phone);
      setEmail(profile.email);
      setAddress(profile.address);
      setMaterials(profile.materials_by_us);
    } catch {
      setLoadError("Daten konnten nicht geladen werden. Bitte prüfen Sie Ihre Internetverbindung.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Preselect service when coming from Services detail
  useFocusEffect(
    useCallback(() => {
      if (!serviceId || !services.length) return;
      const s = services.find((x) => x.id === serviceId);
      if (s) {
        setService(s);
        setHours(s.min_hours || 2);
        setStep(0);
        router.setParams({ serviceId: undefined } as any);
      }
    }, [serviceId, services, router]),
  );

  const quote = service?.pricing === "quote";
  const subtotal = service && !quote ? service.price * hours + (materials ? fee : 0) : 0;
  const total = discount ? discount.final_price : subtotal;

  // Discount must be recalculated when the price changes
  useEffect(() => {
    setDiscount(null);
    setDiscountErr("");
  }, [service?.id, hours, materials]);

  function selectService(s: Service) {
    setService(s);
    setHours(s.min_hours || 2);
  }

  async function applyDiscount() {
    if (!code.trim()) return;
    setDiscountLoading(true);
    setDiscountErr("");
    try {
      const r = await api.validateDiscount(code.trim(), subtotal);
      setDiscount(r);
    } catch (e: any) {
      setDiscount(null);
      setDiscountErr(e.message || "Ungültiger Code");
    } finally {
      setDiscountLoading(false);
    }
  }

  const canNext = [
    !!service,
    !!date && !!time,
    name.trim().length > 1 && phone.trim().length >= 7 && address.trim().length > 4 && consent,
  ][step];

  function reset() {
    setStep(0);
    setService(null);
    setNotes("");
    setConsent(false);
    setCode("");
    setDiscount(null);
  }

  async function submit() {
    if (!service) return;
    Keyboard.dismiss();
    setSubmitting(true);
    setError("");
    try {
      const deviceId = await getDeviceId();
      const booking = await api.createBooking({
        device_id: deviceId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim() || undefined,
        service_id: service.id,
        address: address.trim(),
        scheduled_date: date,
        scheduled_time: time,
        notes: notes.trim() || undefined,
        consent_accepted: consent,
        discount_code: discount?.code || undefined,
        hours: quote ? undefined : hours,
        materials_by_us: quote ? false : materials,
      });
      // Remember contact data for next time
      api.saveProfile({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), materials_by_us: materials }, deviceId).catch(() => {});
      reset();
      router.push({ pathname: quote ? "/success" : "/checkout", params: { id: booking.id } });
    } catch (e: any) {
      setError(e.message || "Fehler beim Erstellen der Buchung");
    } finally {
      setSubmitting(false);
    }
  }

  function onPrimary() {
    if (!canNext) return;
    if (step < 2) setStep(step + 1);
    else submit();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.brandPrimary} /></View>;
  if (loadError) {
    return (
      <View style={[styles.center, { padding: spacing.xl }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.brandPrimary} />
        <Text style={[styles.infoText, { textAlign: "center", marginVertical: spacing.md, flex: 0 }]}>{loadError}</Text>
        <Pressable testID="book-retry-btn" onPress={loadData} style={styles.nextBtn}>
          <Text style={styles.nextTxt}>Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text style={styles.title}>Buchen</Text>
        <View style={styles.stepper}>
          {STEPS.map((s, i) => (
            <Pressable
              key={s}
              testID={`step-indicator-${i}`}
              disabled={i > step}
              onPress={() => setStep(i)}
              style={styles.stepItem}
            >
              <View style={[styles.stepDot, i <= step && styles.stepDotOn]}>
                {i < step ? (
                  <Ionicons name="checkmark" size={16} color={colors.onBrandPrimary} />
                ) : (
                  <Text style={[styles.stepNum, i <= step && { color: colors.onBrandPrimary }]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, i === step && { color: colors.brandPrimary }]}>{s}</Text>
              {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && { backgroundColor: colors.brandGreen }]} />}
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && (
            <View testID="step-was">
              <Text style={styles.stepTitle}>Was dürfen wir erledigen?</Text>
              {services.map((s) => {
                const sel = service?.id === s.id;
                return (
                  <Pressable key={s.id} testID={`book-service-${s.id}`} onPress={() => selectService(s)} style={[styles.svc, sel && styles.svcSel]}>
                    <View style={[styles.svcIcon, sel && { backgroundColor: colors.brandPrimary }]}>
                      <Ionicons name={(s.icon || "sparkles") as any} size={22} color={sel ? colors.onBrandPrimary : colors.brandPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.svcName}>{s.name}</Text>
                      <Text style={styles.svcMeta}>
                        {s.pricing === "quote" ? "Preis auf Anfrage" : `€${s.price.toFixed(0)} / Std. · ab ${s.min_hours} Std.`}
                      </Text>
                    </View>
                    <Ionicons name={sel ? "radio-button-on" : "radio-button-off"} size={24} color={sel ? colors.brandPrimary : colors.borderStrong} />
                  </Pressable>
                );
              })}

              {service && !quote && (
                <>
                  <Text style={styles.label}>Dauer</Text>
                  <View style={styles.hoursRow}>
                    <Pressable testID="hours-minus" onPress={() => setHours(Math.max(service.min_hours || 1, hours - 1))} style={styles.hourBtn}>
                      <Ionicons name="remove" size={24} color={colors.brandPrimary} />
                    </Pressable>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text testID="hours-value" style={styles.hoursValue}>{hours} Std.</Text>
                      <Text style={styles.svcMeta}>€{(service.price * hours).toFixed(2)}</Text>
                    </View>
                    <Pressable testID="hours-plus" onPress={() => setHours(Math.min(12, hours + 1))} style={styles.hourBtn}>
                      <Ionicons name="add" size={24} color={colors.brandPrimary} />
                    </Pressable>
                  </View>

                  <View style={styles.toggleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.toggleTitle}>Wir bringen das Material mit</Text>
                      <Text style={styles.svcMeta}>
                        {materials ? `+€${fee.toFixed(2)} pro Buchung` : "Sie stellen Reinigungsmittel bereit"}
                      </Text>
                    </View>
                    <Switch
                      testID="materials-switch"
                      value={materials}
                      onValueChange={setMaterials}
                      trackColor={{ true: colors.brandGreen, false: colors.border }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </>
              )}
              {quote && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color={colors.onGreenTint} />
                  <Text style={styles.infoText}>Für diesen Service erstellen wir Ihnen ein individuelles Angebot – ohne Vorauszahlung.</Text>
                </View>
              )}
            </View>
          )}

          {step === 1 && (
            <View testID="step-wann">
              <Text style={styles.stepTitle}>Wann passt es Ihnen?</Text>
              <Text style={styles.label}>Tag</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {days.map((d) => {
                  const sel = d.iso === date;
                  return (
                    <Pressable key={d.iso} testID={`day-${d.iso}`} onPress={() => setDate(d.iso)} style={[styles.day, sel && styles.chipSel]}>
                      <Text style={[styles.dayTop, sel && styles.chipTxtSel]}>{d.day}</Text>
                      <Text style={[styles.dayNum, sel && styles.chipTxtSel]}>{d.num}</Text>
                      <Text style={[styles.dayTop, sel && styles.chipTxtSel]}>{d.mon}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.label}>Uhrzeit</Text>
              <View style={styles.timeGrid}>
                {TIME_SLOTS.map((t) => {
                  const sel = t === time;
                  return (
                    <Pressable key={t} testID={`time-${t}`} onPress={() => setTime(t)} style={[styles.time, sel && styles.chipSel]}>
                      <Text style={[styles.timeTxt, sel && styles.chipTxtSel]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.hint}>Termine Mo–So von 14:00 bis 19:00 Uhr.</Text>
            </View>
          )}

          {step === 2 && (
            <View testID="step-wo">
              <Text style={styles.stepTitle}>Wo sollen wir hinkommen?</Text>
              {[
                { k: "name", label: "Vollständiger Name", v: name, set: setName, ph: "z.B. Maria Huber" },
                { k: "phone", label: "Telefon", v: phone, set: setPhone, ph: "+43 664 123 4567", kb: "phone-pad" },
                { k: "email", label: "E-Mail (optional)", v: email, set: setEmail, ph: "name@beispiel.at", kb: "email-address" },
                { k: "address", label: "Adresse", v: address, set: setAddress, ph: "Straße, Nr., PLZ, Ort" },
                { k: "notes", label: "Hinweise (optional)", v: notes, set: setNotes, ph: "Eingang, Haustiere, Fläche…" },
              ].map((f) => (
                <View key={f.k} style={{ marginBottom: spacing.md }}>
                  <Text style={styles.inputLabel}>{f.label}</Text>
                  <TextInput
                    testID={`input-${f.k}`}
                    value={f.v}
                    onChangeText={f.set}
                    placeholder={f.ph}
                    placeholderTextColor={colors.info}
                    keyboardType={(f.kb as any) || "default"}
                    autoCapitalize={f.k === "email" ? "none" : "sentences"}
                    style={styles.input}
                  />
                </View>
              ))}

              {!quote && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={styles.inputLabel}>Rabattcode (optional)</Text>
                  {discount ? (
                    <View style={styles.discountOn}>
                      <Ionicons name="pricetag" size={18} color={colors.brandPrimary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.discountCode}>{discount.code}</Text>
                        <Text style={styles.svcMeta}>{discount.description} · –€{discount.discount_amount.toFixed(2)}</Text>
                      </View>
                      <Pressable testID="discount-clear" hitSlop={10} onPress={() => { setDiscount(null); setCode(""); }}>
                        <Ionicons name="close-circle" size={22} color={colors.error} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <TextInput
                        testID="discount-input"
                        value={code}
                        onChangeText={(v) => setCode(v.toUpperCase())}
                        placeholder="z.B. WILLKOMMEN10"
                        placeholderTextColor={colors.info}
                        autoCapitalize="characters"
                        style={[styles.input, { flex: 1 }]}
                      />
                      <Pressable testID="discount-apply-btn" disabled={!code.trim() || discountLoading} onPress={applyDiscount} style={[styles.applyBtn, !code.trim() && { opacity: 0.5 }]}>
                        {discountLoading ? <ActivityIndicator color={colors.onBrandPrimary} /> : <Text style={styles.applyTxt}>Anwenden</Text>}
                      </Pressable>
                    </View>
                  )}
                  {discountErr ? <Text style={styles.err}>{discountErr}</Text> : null}
                </View>
              )}

              <Pressable testID="consent-checkbox" onPress={() => setConsent(!consent)} style={[styles.consent, consent && styles.consentOn]}>
                <View style={[styles.checkbox, consent && styles.checkboxOn]}>
                  {consent && <Ionicons name="checkmark" size={16} color={colors.onBrandPrimary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.consentTxt}>
                    Ich stimme zu, dass meine personenbezogenen Daten (Name, Adresse, Telefonnummer, E-Mail) zum Zweck der
                    Terminvereinbarung und Durchführung der Dienstleistungen verarbeitet werden. Mir ist bekannt, dass ich
                    meine Einwilligung jederzeit widerrufen kann. Die vollständige Datenschutzerklärung habe ich zur Kenntnis genommen.
                  </Text>
                  <Pressable testID="open-privacy-link" onPress={() => router.push("/privacy")} style={styles.privacyLink}>
                    <Ionicons name="shield-checkmark" size={14} color={colors.brandPrimary} />
                    <Text style={styles.privacyTxt}>Datenschutzerklärung öffnen</Text>
                  </Pressable>
                </View>
              </Pressable>
              {error ? <Text style={styles.err}>{error}</Text> : null}
            </View>
          )}
        </ScrollView>

        <View style={styles.bar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.barSmall}>{quote ? "Anfrage" : discount ? "Gesamt inkl. Rabatt" : "Gesamtpreis"}</Text>
            <Text testID="book-total" style={styles.barPrice}>
              {!service ? "—" : quote ? "Auf Anfrage" : `€${total.toFixed(2)}`}
            </Text>
          </View>
          {step > 0 && (
            <Pressable testID="book-back-btn" onPress={() => setStep(step - 1)} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.brandPrimary} />
            </Pressable>
          )}
          <Pressable
            testID="book-next-btn"
            disabled={!canNext || submitting}
            onPress={onPrimary}
            style={[styles.nextBtn, (!canNext || submitting) && { opacity: 0.4 }]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Text style={styles.nextTxt}>{step < 2 ? "Weiter" : quote ? "Anfrage senden" : "Zur Zahlung"}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  stepper: { flexDirection: "row", marginTop: spacing.md },
  stepItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  stepDotOn: { backgroundColor: colors.brandPrimary },
  stepNum: { fontWeight: "800", color: colors.onSurfaceTertiary },
  stepLabel: { fontWeight: "700", color: colors.onSurfaceTertiary },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginRight: 6 },
  stepTitle: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.lg },
  label: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.xl, marginBottom: spacing.md },
  hint: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: spacing.md },

  svc: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, minHeight: 72, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  svcSel: { borderColor: colors.brandPrimary, borderWidth: 2, backgroundColor: colors.brandTertiary },
  svcIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  svcName: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },
  svcMeta: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },

  hoursRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  hourBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  hoursValue: { fontSize: typography.sizes.xxl, fontWeight: "800", color: colors.onSurface },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  toggleTitle: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.onSurface },
  infoBox: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg, backgroundColor: colors.greenTint, padding: spacing.lg, borderRadius: radius.md },
  infoText: { flex: 1, color: colors.onSurfaceSecondary, lineHeight: 20 },

  day: { width: 64, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  dayTop: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceTertiary },
  dayNum: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.onSurface, marginVertical: 2 },
  chipSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipTxtSel: { color: colors.onBrandPrimary },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  time: { width: "31.5%", minHeight: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  timeTxt: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },

  inputLabel: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onSurfaceTertiary, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, minHeight: 48, fontSize: typography.sizes.base, color: colors.onSurface },
  applyBtn: { backgroundColor: colors.brandPrimary, borderRadius: radius.md, paddingHorizontal: spacing.lg, justifyContent: "center", minWidth: 100, alignItems: "center" },
  applyTxt: { color: colors.onBrandPrimary, fontWeight: "700" },
  discountOn: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.brandPrimary },
  discountCode: { fontWeight: "800", color: colors.brandPrimary, letterSpacing: 1 },
  err: { color: colors.error, marginTop: 6, fontSize: typography.sizes.sm },

  consent: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: spacing.sm },
  consentOn: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", marginTop: 2 },
  checkboxOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  consentTxt: { fontSize: typography.sizes.sm, color: colors.onSurfaceSecondary, lineHeight: 18 },
  privacyLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm, minHeight: 32 },
  privacyTxt: { color: colors.brandPrimary, fontWeight: "700", fontSize: typography.sizes.sm },

  bar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border },
  barSmall: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary },
  barPrice: { fontSize: typography.sizes.xl, fontWeight: "800", color: colors.onSurface },
  backBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  nextBtn: { minHeight: 52, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  nextTxt: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.base },
});
