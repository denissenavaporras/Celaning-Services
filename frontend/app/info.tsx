import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";

const HERO =
  "https://images.pexels.com/photos/5998138/pexels-photo-5998138.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const PACKS = [
  {
    tier: "🥇 Basis",
    name: "Wöchentliche Pflege",
    desc: "3 Std. leichte Reinigung + allgemeine Ordnung.",
    price: "22 €/Std.",
    color: "#F0F4EA",
  },
  {
    tier: "🥈 Familie",
    name: "Kinderbetreuung + Reinigung",
    desc: "4-5 Std. ideal für Nachmittage. Abholung von der Schule, Jause, Hausaufgabenhilfe und Reinigung der Gemeinschaftsbereiche.",
    price: "25 €/Std.",
    color: "#E1E8D5",
  },
  {
    tier: "🥉 Premium",
    name: "Favorit berufstätiger Familien",
    desc: "5 Std./Tag: Tiefenreinigung mit Dampf, Organisation eines Bereichs, Kinderbetreuung mit Englisch und Zubereitung des Abendessens.",
    price: "120 €/Tag · 24 €/Std.",
    color: "#F0F4EA",
  },
  {
    tier: "🏆 VIP",
    name: "20 Wochenstunden mit Priorität",
    desc: "Prioritätszeiten, detaillierter Tagesbericht und Notdienst mit 24 Std. Vorlauf.",
    price: "2.000 €/Monat · 25 €/Std.",
    color: "#E1E8D5",
  },
];

const OFFERS = [
  { icon: "star", code: "WILLKOMMEN10", title: "10 % auf die erste Woche", body: "Willkommensrabatt für Neukunden." },
  { icon: "gift", code: "KUEHL40", title: "Kühlschrankreinigung GRATIS", body: "Mit Familien- oder Premium-Paket für 4 Wochen (Wert 40 €)." },
  { icon: "people", code: "FREUNDIN2H", title: "Empfehlen & gewinnen", body: "2 Std. Reinigung extra, wenn eine Freundin bucht." },
  { icon: "cash", code: "MONAT5", title: "5 % Rabatt monatlich", body: "Bei Vorauszahlung am 1. Tag des Monats." },
];

const PAYMENTS = [
  "SEPA-Überweisung",
  "Bar (mit Quittung)",
  "Dienstleistungsscheck (Steuervorteil + Sozialversicherung)",
  "PayPal",
];

const COVERAGE = ["Wels Stadt", "Holzhausen", "Schleißheim", "Buchkirchen", "Weißkirchen", "Pennewang", "Marchtrenk"];

const TESTIMONIALS = [
  {
    text: "Unglaublich! Mein Haus war noch nie so sauber und meine Kinder lieben sie. Sie ist super professionell und zuverlässig. 100 % Empfehlung.",
    author: "Familie M., Holzhausen",
  },
  {
    text: "Mit Dennisse kann ich mich sorgenfrei auf meine Arbeit konzentrieren. Ich komme heim und alles ist in Ordnung, die Kinder glücklich und das Abendessen zubereitet. Ein Luxus.",
    author: "Familie K., Wels",
  },
];

const TRUST = [
  { icon: "medkit", label: "Erste-Hilfe-Zertifikat" },
  { icon: "shield-checkmark", label: "Haftpflichtversicherung" },
  { icon: "document-text", label: "Referenzen verfügbar" },
  { icon: "receipt", label: "Dienstleistungsscheck akzeptiert" },
];

export default function Info() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={HERO} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(44,51,37,0.55)", "rgba(44,51,37,0.95)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <SafeAreaView edges={["top"]} style={styles.heroContent}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={colors.onSurfaceInverse} />
            </Pressable>
            <View style={styles.heroBottom}>
              <Text style={styles.heroBrand}>Cleaning Service Wels</Text>
              <Text style={styles.heroTitle}>Dennisse Nava Porras</Text>
              <Text style={styles.heroSub}>Professionelle Reinigung + Kinderbetreuung</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Ionicons name="time-outline" size={12} color={colors.onBrandTertiary} />
                  <Text style={styles.badgeText}>5 Jahre Erfahrung</Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="location-outline" size={12} color={colors.onBrandTertiary} />
                  <Text style={styles.badgeText}>Wels & Wels-Land</Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="calendar-outline" size={12} color={colors.onBrandTertiary} />
                  <Text style={styles.badgeText}>Mo–So 14:00–19:00</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.h1}>🌟 Wer bin ich?</Text>
          <Text style={styles.body}>
            Ich bin Dennisse, eine Fachkraft mit 5 Jahren Erfahrung im Haushalt und in der Kinderbetreuung. Meine
            Mission ist es, Ihnen Ruhe und Qualitätszeit für Sie und Ihre Familie zu schenken.
          </Text>
          <Text style={styles.body}>
            Ich arbeite mit ökologischen Produkten (sicher für Kinder und Haustiere) und mit professioneller
            Dampfreinigung, die 99,9 % der Bakterien entfernt – ohne aggressive Chemie.
          </Text>
          <Text style={styles.body}>
            Ich verfüge über eine Erste-Hilfe-Ausbildung und Erfahrung in der Frühförderung. Während ich Ihr Zuhause
            reinige, sind Ihre Kinder in guten Händen und lernen spielerisch dazu.
          </Text>
        </View>

        {/* What I offer */}
        <View style={styles.section}>
          <Text style={styles.h1}>🛠️ Was ich anbiete</Text>

          <Text style={styles.h2}>Professionelle Reinigung</Text>
          {[
            "Tiefenreinigung von Bädern, Küche und Oberflächen",
            "Dampfreinigung (ideal für Allergiker und Familien mit Kindern)",
            "Organisation von Schränken, Speisekammern und Abstellräumen",
            "Bügeln und Wäschepflege",
            "Ökologische, hypoallergene Produkte (ohne Giftstoffe)",
          ].map((t) => (
            <View key={t} style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={16} color={colors.brandPrimary} />
              <Text style={styles.bulletText}>{t}</Text>
            </View>
          ))}

          <Text style={styles.h2}>Kinderbetreuung</Text>
          {[
            "Abholung von Schule / Kindergarten",
            "Gesunde Jause und Aufsicht bei Mahlzeiten",
            "Lernbegleitung und Hausaufgaben (auch auf Englisch)",
            "Pädagogische Aktivitäten (Basteln, Spiele, Lesen)",
            "Bad und Schlafenszeit-Routine",
          ].map((t) => (
            <View key={t} style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={16} color={colors.brandPrimary} />
              <Text style={styles.bulletText}>{t}</Text>
            </View>
          ))}

          <View style={styles.plusBox}>
            <Text style={styles.plusTitle}>💡 Zusätzlich</Text>
            <Text style={styles.plusBody}>Flexible Zeiten · Schlüsseldienst · Täglicher WhatsApp-Bericht (Fotos + Zusammenfassung)</Text>
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.h1}>🕑 Verfügbarkeit</Text>
          <View style={styles.availBox}>
            <Ionicons name="time" size={22} color={colors.brandPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.availTitle}>Montag bis Sonntag</Text>
              <Text style={styles.availBody}>von 14:00 bis 19:00 Uhr – buchen Sie einen Termin, der Ihnen passt.</Text>
            </View>
          </View>
        </View>

        {/* Packs */}
        <View style={styles.section}>
          <Text style={styles.h1}>📦 Meine speziellen Pakete</Text>
          {PACKS.map((p) => (
            <View key={p.name} style={[styles.packCard, { backgroundColor: p.color }]}>
              <Text style={styles.packTier}>{p.tier}</Text>
              <Text style={styles.packName}>{p.name}</Text>
              <Text style={styles.packDesc}>{p.desc}</Text>
              <View style={styles.packPriceRow}>
                <Text style={styles.packPrice}>{p.price}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Offers */}
        <View style={styles.section}>
          <Text style={styles.h1}>🎁 Spezielle Angebote</Text>
          <Text style={styles.body}>Geben Sie den Code bei Ihrer Buchung an, um den Rabatt zu erhalten.</Text>
          {OFFERS.map((o) => (
            <View key={o.title} testID={`offer-${o.code}`} style={styles.offer}>
              <View style={styles.offerIcon}>
                <Ionicons name={o.icon as any} size={18} color={colors.onBrandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>{o.title}</Text>
                <Text style={styles.offerBody}>{o.body}</Text>
                <View style={styles.codePill}>
                  <Ionicons name="pricetag" size={12} color={colors.onBrandPrimary} />
                  <Text style={styles.codeText}>{o.code}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Payments */}
        <View style={styles.section}>
          <Text style={styles.h1}>💳 Zahlungsmethoden</Text>
          <View style={styles.chipsRow}>
            {PAYMENTS.map((p) => (
              <View key={p} style={styles.chip}>
                <Text style={styles.chipText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Coverage */}
        <View style={styles.section}>
          <Text style={styles.h1}>📍 Servicegebiet</Text>
          <Text style={styles.body}>Wels und Gemeinden in Wels-Land.</Text>
          <View style={styles.chipsRow}>
            {COVERAGE.map((z) => (
              <View key={z} style={[styles.chip, { backgroundColor: colors.brandSecondary }]}>
                <Ionicons name="location" size={12} color={colors.onBrandSecondary} />
                <Text style={[styles.chipText, { color: colors.onBrandSecondary }]}>{z}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View style={styles.section}>
          <Text style={styles.h1}>⭐ Kundenbewertungen</Text>
          {TESTIMONIALS.map((t) => (
            <View key={t.author} style={styles.review}>
              <View style={styles.stars}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Ionicons key={i} name="star" size={14} color="#FFC107" />
                ))}
              </View>
              <Text style={styles.reviewText}>&ldquo;{t.text}&rdquo;</Text>
              <Text style={styles.reviewAuthor}>— {t.author}</Text>
            </View>
          ))}
        </View>

        {/* Trust */}
        <View style={styles.section}>
          <Text style={styles.h1}>🔒 Vertrauen & Sicherheit</Text>
          <View style={styles.trustGrid}>
            {TRUST.map((t) => (
              <View key={t.label} style={styles.trustCard}>
                <Ionicons name={t.icon as any} size={20} color={colors.brandPrimary} />
                <Text style={styles.trustText}>{t.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.h1}>📞 Kontakt</Text>
          <Pressable
            testID="whatsapp-btn"
            onPress={() => Linking.openURL("https://wa.me/436641019869")}
            style={[styles.contactRow, { backgroundColor: "#DFF6E3" }]}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>WhatsApp / Telefon</Text>
              <Text style={styles.contactValue}>+43 664 101 9869</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
          <Pressable
            testID="email-btn"
            onPress={() => Linking.openURL("mailto:denissenavaporras@gmail.com")}
            style={styles.contactRow}
          >
            <Ionicons name="mail" size={22} color={colors.brandPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>E-Mail</Text>
              <Text style={styles.contactValue}>denissenavaporras@gmail.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
          <Text style={styles.contactHelper}>Unverbindliche Anfragen jederzeit willkommen.</Text>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          testID="cta-book"
          onPress={() => router.push("/book")}
          style={styles.ctaBtn}
        >
          <Ionicons name="calendar" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.ctaText}>Meinen Termin buchen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 340, backgroundColor: colors.surfaceInverse, overflow: "hidden" },
  heroContent: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: "space-between" },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginTop: spacing.sm,
  },
  heroBottom: { paddingBottom: spacing.xl },
  heroBrand: { color: "rgba(255,255,255,0.85)", fontSize: typography.sizes.sm, letterSpacing: 2, fontWeight: "700" },
  heroTitle: { color: colors.onSurfaceInverse, fontSize: typography.sizes.xxl, fontWeight: "800", marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: typography.sizes.base, marginTop: 4 },
  badgeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.onBrandTertiary },

  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  h1: { fontSize: typography.sizes.xxl, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.md },
  h2: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface, marginTop: spacing.md, marginBottom: spacing.sm },
  body: { fontSize: typography.sizes.base, color: colors.onSurfaceSecondary, lineHeight: 22, marginBottom: spacing.sm },
  bullet: { flexDirection: "row", gap: spacing.sm, marginBottom: 6, alignItems: "flex-start" },
  bulletText: { flex: 1, fontSize: typography.sizes.base, color: colors.onSurfaceSecondary, lineHeight: 20 },

  plusBox: {
    marginTop: spacing.lg, backgroundColor: colors.brandTertiary, borderRadius: radius.lg, padding: spacing.md,
  },
  plusTitle: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.onBrandTertiary },
  plusBody: { fontSize: typography.sizes.sm, color: colors.onBrandTertiary, marginTop: 4, lineHeight: 18 },

  availBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.brandTertiary, borderRadius: radius.lg, padding: spacing.lg,
  },
  availTitle: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onBrandTertiary },
  availBody: { fontSize: typography.sizes.sm, color: colors.onBrandTertiary, marginTop: 2 },

  packCard: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  packTier: { fontSize: typography.sizes.sm, fontWeight: "800", color: colors.onBrandTertiary, letterSpacing: 1 },
  packName: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onSurface, marginTop: 4 },
  packDesc: { fontSize: typography.sizes.sm, color: colors.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 20 },
  packPriceRow: { marginTop: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  packPrice: {
    fontSize: typography.sizes.lg, fontWeight: "800", color: colors.brandPrimary,
    backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
  },

  offer: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  offerIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  offerTitle: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.onSurface },
  offerBody: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2 },
  codePill: {
    marginTop: spacing.sm, alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
  },
  codeText: {
    fontSize: typography.sizes.sm, fontWeight: "800",
    color: colors.onBrandPrimary, letterSpacing: 1,
  },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill,
  },
  chipText: { fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onBrandTertiary },

  review: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  stars: { flexDirection: "row", gap: 2, marginBottom: spacing.sm },
  reviewText: { fontSize: typography.sizes.base, color: colors.onSurfaceSecondary, lineHeight: 22, fontStyle: "italic" },
  reviewAuthor: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: spacing.sm, fontWeight: "700" },

  trustGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  trustCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.brandTertiary, padding: spacing.md, borderRadius: radius.lg, minWidth: "48%", flex: 1,
  },
  trustText: { flex: 1, fontSize: typography.sizes.sm, fontWeight: "600", color: colors.onBrandTertiary },

  contactRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  contactLabel: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, fontWeight: "600" },
  contactValue: { fontSize: typography.sizes.base, color: colors.onSurface, fontWeight: "700", marginTop: 2 },
  contactHelper: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: spacing.sm, textAlign: "center" },

  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surfaceSecondary, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  ctaBtn: {
    backgroundColor: colors.brandPrimary, paddingVertical: 14, borderRadius: radius.pill,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
  },
  ctaText: { color: colors.onBrandPrimary, fontSize: typography.sizes.base, fontWeight: "800" },
});
