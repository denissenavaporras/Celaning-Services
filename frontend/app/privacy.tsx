import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";

const RIGHTS = [
  { title: "Auskunft", body: "Recht, eine Bestätigung darüber zu verlangen, ob personenbezogene Daten verarbeitet werden." },
  { title: "Berichtigung", body: "Recht, die Berichtigung unrichtiger Daten zu verlangen." },
  { title: "Löschung", body: "Recht, die Löschung Ihrer Daten zu verlangen („Recht auf Vergessenwerden“)." },
  { title: "Einschränkung", body: "Recht, die Einschränkung der Verarbeitung zu verlangen." },
  { title: "Widerspruch", body: "Recht, aus Gründen Ihrer besonderen Situation jederzeit Widerspruch einzulegen." },
  { title: "Datenübertragbarkeit", body: "Recht, Ihre Daten in einem strukturierten, maschinenlesbaren Format zu erhalten." },
  { title: "Widerruf", body: "Erteilte Einwilligungen können jederzeit mit Wirkung für die Zukunft widerrufen werden." },
];

const PURPOSES = [
  { title: "Vertragsanbahnung und -abwicklung", body: "Angebotserstellung, Terminvereinbarung, Durchführung der Reinigungs- und Betreuungsdienstleistungen.", law: "Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)" },
  { title: "Kommunikation", body: "Terminbestätigungen, Änderungen, Rechnungsstellung.", law: "Art. 6 Abs. 1 lit. b DSGVO" },
  { title: "Gesetzliche Pflichten", body: "Steuer- und Abgabepflichten in Österreich.", law: "Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung)" },
  { title: "Sicherheit der Dienstleistung", body: "Notfallkontakte für die Kinderbetreuung.", law: "Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)" },
];

const DATA_CATEGORIES = [
  { icon: "person", title: "Kontaktdaten", body: "Name, Adresse, Telefonnummer, E-Mail-Adresse." },
  { icon: "home", title: "Auftragsbezogene Daten", body: "Adresse, Haushaltsmitglieder, Anzahl und Alter der Kinder, besondere Bedürfnisse oder Allergien." },
  { icon: "card", title: "Termin- und Zahlungsdaten", body: "Vereinbarte Termine, Zahlungsinformationen (bei Bedarf)." },
];

const DISCLOSURES = [
  "Gesetzliche Verpflichtung (z. B. Sozialversicherung bei Dienstleistungsscheck).",
  "Zahlungsabwicklung durch beauftragte Zahlungsdienstleister (nur bei gewählter Zahlungsmethode).",
  "Sonstige Dritte ausschließlich mit Ihrer ausdrücklichen Einwilligung.",
];

export default function Privacy() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Datenschutz</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introBox}>
          <View style={styles.introIcon}>
            <Ionicons name="shield-checkmark" size={26} color={colors.onBrandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Datenschutzerklärung</Text>
            <Text style={styles.introBody}>gemäß Art. 13 der Datenschutz-Grundverordnung (DSGVO)</Text>
          </View>
        </View>

        {/* 1. Verantwortlicher */}
        <Text style={styles.h2}>1. Verantwortlicher</Text>
        <View style={styles.card}>
          <Text style={styles.strong}>Dennise Nava Porras</Text>
          <Text style={styles.line}>Almgasse 12</Text>
          <Text style={styles.line}>4600 Wels, Österreich</Text>
          <View style={styles.divider} />
          <Pressable
            testID="privacy-phone"
            onPress={() => Linking.openURL("tel:+436641019869")}
            style={styles.contactPress}
          >
            <Ionicons name="call" size={16} color={colors.brandPrimary} />
            <Text style={styles.contactText}>+43 664 1019869</Text>
          </Pressable>
          <Pressable
            testID="privacy-email"
            onPress={() => Linking.openURL("mailto:denissenavaporras@gmail.com")}
            style={styles.contactPress}
          >
            <Ionicons name="mail" size={16} color={colors.brandPrimary} />
            <Text style={styles.contactText}>denissenavaporras@gmail.com</Text>
          </Pressable>
        </View>

        {/* 2. Daten */}
        <Text style={styles.h2}>2. Welche personenbezogenen Daten werden verarbeitet?</Text>
        {DATA_CATEGORIES.map((d) => (
          <View key={d.title} style={styles.item}>
            <View style={styles.itemIcon}>
              <Ionicons name={d.icon as any} size={18} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{d.title}</Text>
              <Text style={styles.itemBody}>{d.body}</Text>
            </View>
          </View>
        ))}

        {/* 3. Zweck */}
        <Text style={styles.h2}>3. Zweck der Datenverarbeitung und Rechtsgrundlage</Text>
        {PURPOSES.map((p) => (
          <View key={p.title} style={styles.purposeCard}>
            <Text style={styles.itemTitle}>{p.title}</Text>
            <Text style={styles.itemBody}>{p.body}</Text>
            <View style={styles.lawPill}>
              <Ionicons name="book" size={11} color={colors.onBrandPrimary} />
              <Text style={styles.lawText}>{p.law}</Text>
            </View>
          </View>
        ))}

        {/* 4. Weitergabe */}
        <Text style={styles.h2}>4. Weitergabe von Daten an Dritte</Text>
        <View style={styles.card}>
          <Text style={styles.paragraph}>Eine Weitergabe erfolgt nur in folgenden Fällen:</Text>
          {DISCLOSURES.map((d) => (
            <View key={d} style={styles.bullet}>
              <Ionicons name="checkmark-circle" size={16} color={colors.brandPrimary} />
              <Text style={styles.bulletText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* 5. Speicherdauer */}
        <Text style={styles.h2}>5. Speicherdauer</Text>
        <View style={styles.card}>
          <Text style={styles.paragraph}>
            Personenbezogene Daten werden nur so lange gespeichert, wie es für die Erfüllung der vertraglichen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten (z. B. steuerrechtliche Aufbewahrungspflichten in Österreich) bestehen. Danach werden die Daten gelöscht.
          </Text>
        </View>

        {/* 6. Rechte */}
        <Text style={styles.h2}>6. Ihre Rechte (Betroffenenrechte)</Text>
        {RIGHTS.map((r) => (
          <View key={r.title} style={styles.item}>
            <View style={styles.itemIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{r.title}</Text>
              <Text style={styles.itemBody}>{r.body}</Text>
            </View>
          </View>
        ))}
        <View style={styles.hintBox}>
          <Ionicons name="mail-open" size={16} color={colors.brandPrimary} />
          <Text style={styles.hintText}>
            Zur Ausübung Ihrer Rechte kontaktieren Sie mich per E-Mail an denissenavaporras@gmail.com.
          </Text>
        </View>

        {/* 7. Aufsichtsbehörde */}
        <Text style={styles.h2}>7. Beschwerderecht bei der Aufsichtsbehörde</Text>
        <View style={styles.card}>
          <Text style={styles.paragraph}>
            Sie haben das Recht, sich bei der zuständigen Datenschutzbehörde zu beschweren.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.strong}>Österreichische Datenschutzbehörde</Text>
          <Text style={styles.line}>Barichgasse 40-42</Text>
          <Text style={styles.line}>1030 Wien</Text>
          <View style={styles.divider} />
          <Pressable
            testID="dsb-phone"
            onPress={() => Linking.openURL("tel:+4315215120")}
            style={styles.contactPress}
          >
            <Ionicons name="call" size={16} color={colors.brandPrimary} />
            <Text style={styles.contactText}>+43 1 52 152-0</Text>
          </Pressable>
          <Pressable
            testID="dsb-email"
            onPress={() => Linking.openURL("mailto:dsb@dsb.gv.at")}
            style={styles.contactPress}
          >
            <Ionicons name="mail" size={16} color={colors.brandPrimary} />
            <Text style={styles.contactText}>dsb@dsb.gv.at</Text>
          </Pressable>
          <Pressable
            testID="dsb-web"
            onPress={() => Linking.openURL("https://www.dsb.gv.at")}
            style={styles.contactPress}
          >
            <Ionicons name="globe" size={16} color={colors.brandPrimary} />
            <Text style={styles.contactText}>www.dsb.gv.at</Text>
          </Pressable>
        </View>

        {/* 8. Datensicherheit */}
        <Text style={styles.h2}>8. Datensicherheit</Text>
        <View style={styles.card}>
          <Text style={styles.paragraph}>
            Ich setze technische und organisatorische Sicherheitsmaßnahmen ein, um Ihre personenbezogenen Daten
            gegen zufällige oder vorsätzliche Manipulationen, Verlust, Zerstörung oder unberechtigten Zugriff zu
            schützen. Daten werden auf gesicherten Geräten gespeichert und nur zum Zweck der Dienstleistung
            verwendet.
          </Text>
        </View>

        {/* 9. Änderungen */}
        <Text style={styles.h2}>9. Änderungen dieser Datenschutzerklärung</Text>
        <View style={styles.card}>
          <Text style={styles.paragraph}>
            Ich behalte mir vor, diese Datenschutzerklärung bei Bedarf anzupassen, um sie an rechtliche oder
            technische Änderungen anzupassen. Die aktuelle Version finden Sie jederzeit in dieser App.
          </Text>
        </View>

        <Text style={styles.stand}>Stand: Juli 2026</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.surface,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: typography.sizes.lg, fontWeight: "700", color: colors.onSurface },

  introBox: {
    marginTop: spacing.lg, backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg, padding: spacing.lg,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
  },
  introIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  introTitle: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onBrandTertiary },
  introBody: { fontSize: typography.sizes.sm, color: colors.onBrandTertiary, marginTop: 2 },

  h2: {
    fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onSurface,
    marginTop: spacing.xl, marginBottom: spacing.md,
  },

  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  strong: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.onSurface },
  line: { fontSize: typography.sizes.base, color: colors.onSurfaceSecondary, marginTop: 2 },
  paragraph: { fontSize: typography.sizes.base, color: colors.onSurfaceSecondary, lineHeight: 22 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
  contactPress: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8,
  },
  contactText: { fontSize: typography.sizes.base, color: colors.brandPrimary, fontWeight: "700" },

  item: {
    flexDirection: "row", gap: spacing.md,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  itemIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center",
  },
  itemTitle: { fontSize: typography.sizes.base, fontWeight: "700", color: colors.onSurface },
  itemBody: { fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary, marginTop: 2, lineHeight: 18 },

  purposeCard: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
  },
  lawPill: {
    marginTop: spacing.sm, alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.brandPrimary, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill,
  },
  lawText: { fontSize: 11, fontWeight: "700", color: colors.onBrandPrimary },

  bullet: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginTop: 6 },
  bulletText: { flex: 1, fontSize: typography.sizes.sm, color: colors.onSurfaceSecondary, lineHeight: 18 },

  hintBox: {
    flexDirection: "row", gap: spacing.sm,
    backgroundColor: colors.brandTertiary, padding: spacing.md, borderRadius: radius.md, alignItems: "center",
    marginTop: spacing.sm,
  },
  hintText: { flex: 1, fontSize: typography.sizes.sm, color: colors.onBrandTertiary, lineHeight: 18 },

  stand: {
    fontSize: typography.sizes.sm, color: colors.onSurfaceTertiary,
    textAlign: "center", marginTop: spacing.xl, fontStyle: "italic",
  },
});
