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
    tier: "🥇 Básico",
    name: "Mantenimiento semanal",
    desc: "3h de limpieza ligera + recogida y orden general.",
    price: "22 €/hora",
    color: "#F0F4EA",
  },
  {
    tier: "🥈 Familiar",
    name: "Cuidado de niños + limpieza",
    desc: "4-5h ideal para tardes. Recogida del cole, merienda, deberes y limpieza de zonas comunes.",
    price: "25 €/hora",
    color: "#E1E8D5",
  },
  {
    tier: "🥉 Premium",
    name: "Favorito de familias ejecutivas",
    desc: "5h/día: limpieza profunda con vapor, organización de una zona, cuidado infantil con inglés y preparación de la cena.",
    price: "120 €/día · 24 €/h",
    color: "#F0F4EA",
  },
  {
    tier: "🏆 VIP",
    name: "20h semanales prioritarias",
    desc: "Horario prioritario, informe diario detallado y servicio de emergencia con 24h de antelación.",
    price: "2.000 €/mes · 25 €/h",
    color: "#E1E8D5",
  },
];

const OFFERS = [
  { icon: "star", title: "10% en tu primera semana", body: "Bienvenida nuevos clientes." },
  { icon: "gift", title: "Limpieza de nevera GRATIS", body: "Con pack Familiar o Premium por 4 semanas (valor 40 €)." },
  { icon: "people", title: "Recomiéndame y gana", body: "2 horas de limpieza extra si una amiga contrata." },
  { icon: "cash", title: "5% de descuento mensual", body: "Pagando el primer día del mes por adelantado." },
];

const PAYMENTS = [
  "Transferencia bancaria (SEPA)",
  "Efectivo (con recibo)",
  "Dienstleistungsscheck (deducción fiscal + seguridad social)",
  "PayPal",
];

const COVERAGE = ["Wels ciudad", "Holzhausen", "Schleißheim", "Buchkirchen", "Weißkirchen", "Pennewang", "Marchtrenk"];

const TESTIMONIALS = [
  {
    text: "¡Increíble! Mi casa nunca había estado tan limpia y mis hijos la adoran. Es súper profesional y confiable. La recomiendo 100%.",
    author: "Familia M., Holzhausen",
  },
  {
    text: "Con Dennisse puedo concentrarme en mi trabajo sin preocupaciones. Llego a casa y todo está en orden, los niños felices y la cena preparada. Un lujo.",
    author: "Familia K., Wels",
  },
];

const TRUST = [
  { icon: "medkit", label: "Certificado de primeros auxilios" },
  { icon: "shield-checkmark", label: "Seguro de responsabilidad civil" },
  { icon: "document-text", label: "Referencias disponibles" },
  { icon: "receipt", label: "Acepto Dienstleistungsscheck" },
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
              <Text style={styles.heroSub}>Limpieza profesional + Cuidado infantil</Text>
              <View style={styles.badgeRow}>
                <View style={styles.badge}>
                  <Ionicons name="time-outline" size={12} color={colors.onBrandTertiary} />
                  <Text style={styles.badgeText}>5 años de experiencia</Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="location-outline" size={12} color={colors.onBrandTertiary} />
                  <Text style={styles.badgeText}>Wels & Wels-Land</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.h1}>🌟 ¿Quién soy?</Text>
          <Text style={styles.body}>
            Soy Dennisse, una profesional con 5 años de experiencia en el cuidado del hogar y de los niños. Mi misión
            es ofrecerte tranquilidad y tiempo de calidad para ti y tu familia.
          </Text>
          <Text style={styles.body}>
            Trabajo con productos ecológicos (seguros para niños y mascotas) y técnicas de limpieza profesional con
            vapor que eliminan el 99,9% de las bacterias sin químicos agresivos.
          </Text>
          <Text style={styles.body}>
            Cuento con formación en primeros auxilios y estimulación infantil, así que mientras limpio tu hogar, tus
            hijos estarán entretenidos y aprendiendo.
          </Text>
        </View>

        {/* What I offer */}
        <View style={styles.section}>
          <Text style={styles.h1}>🛠️ ¿Qué ofrezco?</Text>

          <Text style={styles.h2}>Limpieza profesional</Text>
          {["Limpieza profunda de baños, cocina y superficies",
            "Limpieza con vapor (ideal para alergias y familias con niños)",
            "Organización de armarios, despensas y trasteros",
            "Planchado y cuidado de la ropa",
            "Productos ecológicos hipoalergénicos (sin tóxicos)"].map((t) => (
            <View key={t} style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={16} color={colors.brandPrimary} />
              <Text style={styles.bulletText}>{t}</Text>
            </View>
          ))}

          <Text style={styles.h2}>Cuidado infantil</Text>
          {["Recogida del colegio / guardería",
            "Merienda saludable y supervisión de comidas",
            "Apoyo escolar y deberes (también en inglés)",
            "Actividades educativas (manualidades, juegos, lectura)",
            "Baño y rutina de sueño"].map((t) => (
            <View key={t} style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={16} color={colors.brandPrimary} />
              <Text style={styles.bulletText}>{t}</Text>
            </View>
          ))}

          <View style={styles.plusBox}>
            <Text style={styles.plusTitle}>💡 Además</Text>
            <Text style={styles.plusBody}>Flexibilidad horaria · Servicio "llave en mano" · Informe diario por WhatsApp (fotos y resumen)</Text>
          </View>
        </View>

        {/* Packs */}
        <View style={styles.section}>
          <Text style={styles.h1}>📦 Mis packs especiales</Text>
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
          <Text style={styles.h1}>🎁 Ofertas especiales</Text>
          {OFFERS.map((o) => (
            <View key={o.title} style={styles.offer}>
              <View style={styles.offerIcon}>
                <Ionicons name={o.icon as any} size={18} color={colors.onBrandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.offerTitle}>{o.title}</Text>
                <Text style={styles.offerBody}>{o.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Payments */}
        <View style={styles.section}>
          <Text style={styles.h1}>💳 Formas de pago</Text>
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
          <Text style={styles.h1}>📍 Zona de cobertura</Text>
          <Text style={styles.body}>Wels y municipios de Wels-Land.</Text>
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
          <Text style={styles.h1}>⭐ Reseñas de clientes</Text>
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
          <Text style={styles.h1}>🔒 Confianza y seguridad</Text>
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
          <Text style={styles.h1}>📞 Contacto</Text>
          <Pressable
            testID="whatsapp-btn"
            onPress={() => Linking.openURL("https://wa.me/436641019869")}
            style={[styles.contactRow, { backgroundColor: "#DFF6E3" }]}
          >
            <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>WhatsApp / Teléfono</Text>
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
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>denissenavaporras@gmail.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
          </Pressable>
          <Text style={styles.contactHelper}>Disponible para consultas sin compromiso.</Text>
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
          <Text style={styles.ctaText}>Agendar mi cita</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 320, backgroundColor: colors.surfaceInverse, overflow: "hidden" },
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
