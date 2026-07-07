import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { colors, radius, spacing, typography } from "@/src/lib/theme";

type FaqItem = { q: string; a: string };

const FAQS: FaqItem[] = [
  {
    q: "1. Wie lange dauert eine Reinigungs- oder Betreuungssitzung?",
    a: "Die Dauer hängt vom gebuchten Paket und der Größe Ihres Haushalts ab. In der Regel dauern die Einsätze zwischen 2 und 5 Stunden pro Tag, je nach Ihren Bedürfnissen. Bei der Erstellung des Angebots legen wir gemeinsam einen individuellen Zeitplan fest, der perfekt in Ihren Alltag passt.",
  },
  {
    q: "2. Sind die Reinigungsmittel inbegriffen oder muss ich sie bereitstellen?",
    a: "Ich bringe meine eigenen umweltfreundlichen und hypoallergenen Reinigungsmittel mit, um die Sicherheit von Kindern und Haustieren zu gewährleisten. Falls Sie jedoch bestimmte Produkte bevorzugen oder eigene Mittel verwenden möchten, können wir das gerne im Vorfeld absprechen.",
  },
  {
    q: "3. Wie läuft die Rechnungsstellung und Bezahlung ab?",
    a: "Ich akzeptiere folgende Zahlungsmethoden:\n• Barzahlung (mit Quittung)\n• Banküberweisung\n• Dienstleistungsscheck (sehr beliebt in Österreich – Sie erhalten Steuervorteile, ich bin sozialversichert)\n\nBei Buchung eines Monatspakets biete ich einen kleinen Rabatt bei Vorauszahlung an und stelle Ihnen eine detaillierte Rechnung aus.",
  },
  {
    q: "4. Was passiert, wenn ich einen Termin ändern oder absagen muss?",
    a: "Terminänderungen sind kostenlos möglich, wenn Sie mich mindestens 24 Stunden im Voraus informieren. Bei kurzfristigen Absagen aus wichtigem Grund (z. B. Krankheit) versuchen wir gemeinsam, einen Ersatztermin zu finden.",
  },
  {
    q: "5. Kann ich eine Probestunde oder einen Kennenlerntermin buchen?",
    a: "Ja! Ich biete eine unverbindliche Probestunde an, in der wir uns kennenlernen, Ihre Wünsche und Bedürfnisse besprechen und ich Ihnen zeige, wie ich arbeite. So können wir entscheiden, ob die Zusammenarbeit für beide Seiten passt.",
  },
  {
    q: "6. Wie schützen Sie meine persönlichen Daten?",
    a: "Alle Informationen, die Sie mir anvertrauen (Adresse, Termine, Daten Ihrer Kinder), werden ausschließlich für die Durchführung des Dienstes und die Abrechnung verwendet. Ihre Daten werden nicht an Dritte weitergegeben und entsprechend der österreichischen Datenschutzgesetze (DSGVO) sicher gespeichert. Die vollständige Datenschutzerklärung finden Sie in der App.",
  },
  {
    q: "7. Bieten Sie auch Einmal-Reinigungen oder nur regelmäßige Services an?",
    a: "Ich biete beides an:\n• Einmalige Reinigungen (z. B. für besondere Anlässe oder Frühjahrsputz)\n• Regelmäßige Services (wöchentlich, alle zwei Wochen oder monatlich – ganz nach Ihrem Bedarf)\n\nDie regelmäßigen Pakete sind übrigens günstiger als Einzelbuchungen!",
  },
  {
    q: "8. Sind Sie versichert?",
    a: "Ja, ich bin über den Dienstleistungsscheck haftpflichtversichert und sozialversichert. Das gibt Ihnen und mir maximale Sicherheit. Auf Wunsch kann ich Ihnen meine Versicherungsbestätigung vorzeigen.",
  },
  {
    q: "9. Können Sie auch an Feiertagen oder am Wochenende arbeiten?",
    a: "Nach Absprache biete ich auch Samstags- und Feiertagstermine an. Für diese Einsätze fällt ein kleiner Zuschlag an, da es sich um außerordentliche Arbeitszeiten handelt. Fragen Sie mich einfach – wir finden eine Lösung!",
  },
  {
    q: "10. Was ist im „Premium-Paket“ für Familien enthalten?",
    a: "Das Premium-Paket ist mein umfassendstes Angebot und beinhaltet:\n• 5 Stunden tägliche Betreuung (nach Ihrem Zeitplan)\n• Tiefenreinigung mit Dampfreiniger\n• Kinderbetreuung mit pädagogischen Aktivitäten (Englisch, Basteln, Hausaufgabenbetreuung)\n• Organisation von Schränken, Vorratskammern und Wohnbereichen\n• Vorbereitung des Abendessens (einfache Gerichte)\n• Täglicher WhatsApp-Bericht (mit Fotos und Zusammenfassung)\n\nSpeziell für berufstätige Familien, die Entlastung im Alltag suchen.",
  },
  {
    q: "11. Wie kann ich einen Termin buchen?",
    a: "Sie können direkt in dieser App über „Termin buchen“ Ihre Buchung durchführen oder mich kontaktieren:\n📱 WhatsApp / Telefon: +43 664 1019869\n📧 E-Mail: denissenavaporras@gmail.com\n\nIch antworte in der Regel innerhalb weniger Stunden!",
  },
  {
    q: "12. Bieten Sie Rabatte oder Sonderaktionen an?",
    a: "Ja! Aktuelle Aktionen:\n• 10 % Rabatt auf Ihre erste Buchung (WILLKOMMEN10)\n• 5 % Rabatt bei monatlicher Vorauszahlung (MONAT5)\n• Empfehlungsbonus: 2 Std. Reinigung gratis bei erfolgreicher Empfehlung (FREUNDIN2H)\n• Kostenlose Kühlschrankreinigung bei Monatspaket (KUEHL40, Wert 40 €)",
  },
  {
    q: "13. Arbeiten Sie auch in Haushalten mit Haustieren?",
    a: "Ja, sehr gerne! Ich habe Erfahrung mit Haushalten mit Hunden, Katzen und anderen Tieren. Meine Reinigungsmittel sind tierfreundlich und hypoallergen. Bitte teilen Sie mir einfach mit, welche Tiere bei Ihnen leben, damit ich mich optimal vorbereiten kann.",
  },
  {
    q: "14. Was ist der Dienstleistungsscheck und wie funktioniert er?",
    a: "Der Dienstleistungsscheck ist ein österreichisches System zur legalen Anstellung von Haushaltshilfen.\n\n• Für Sie: Steuerermäßigung von bis zu 50 % (bis 2.000 € pro Jahr) und rechtliche Absicherung.\n• Für mich: Sozialversicherung (Unfall-, Kranken- und Pensionsversicherung).\n\nIch erkläre Ihnen gerne mehr dazu, wenn Sie interessiert sind!",
  },
  {
    q: "15. Wie kann ich Sie am besten erreichen?",
    a: "Am schnellsten per:\n📱 WhatsApp / Telefon: +43 664 1019869\n📧 E-Mail: denissenavaporras@gmail.com\n\nIch freue mich auf Ihre Nachricht! 😊",
  },
  {
    q: "16. Kann ich die Dienstleistung auch für eine ältere Person buchen?",
    a: "Ja, ich biete auch Unterstützung für ältere Menschen an (Haushaltshilfe und Betreuung).",
  },
  {
    q: "17. Was passiert, wenn etwas zu Bruch geht?",
    a: "Ich arbeite mit größter Sorgfalt. Im Falle eines Schadens bin ich über meine Haftpflichtversicherung abgesichert.",
  },
  {
    q: "18. Kann ich Sie kurzfristig für einen Notfall buchen?",
    a: "Bei akuten Notfällen (z. B. plötzliche Krankheit der Betreuung) versuche ich, so schnell wie möglich einzuspringen. Zuschlag möglich.",
  },
];

export default function Faq() {
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Häufige Fragen</Text>
        <View style={{ width: 40 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        <View style={styles.introBox}>
          <View style={styles.introIcon}>
            <Ionicons name="help-circle" size={26} color={colors.onBrandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>FAQ</Text>
            <Text style={styles.introBody}>Alle Antworten zu Terminen, Preisen, Zahlung und mehr.</Text>
          </View>
        </View>

        {FAQS.map((item, idx) => {
          const isOpen = open === idx;
          return (
            <Pressable
              key={item.q}
              testID={`faq-item-${idx}`}
              onPress={() => setOpen(isOpen ? null : idx)}
              style={[styles.card, isOpen && styles.cardOpen]}
            >
              <View style={styles.rowQ}>
                <Text style={styles.question}>{item.q}</Text>
                <Ionicons
                  name={isOpen ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.brandPrimary}
                />
              </View>
              {isOpen && <Text style={styles.answer}>{item.a}</Text>}
            </Pressable>
          );
        })}

        {/* Contact CTA */}
        <View style={styles.contactBox}>
          <Ionicons name="chatbubbles" size={22} color={colors.brandPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Noch Fragen?</Text>
            <Text style={styles.contactBody}>Schreiben Sie mir – ich antworte in wenigen Stunden.</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
          <Pressable
            testID="faq-whatsapp"
            onPress={() => Linking.openURL("https://wa.me/436641019869")}
            style={styles.actionSolid}
          >
            <Ionicons name="logo-whatsapp" size={18} color={colors.onBrandPrimary} />
            <Text style={styles.actionSolidTxt}>WhatsApp</Text>
          </Pressable>
          <Pressable
            testID="faq-email"
            onPress={() => Linking.openURL("mailto:denissenavaporras@gmail.com")}
            style={styles.actionGhost}
          >
            <Ionicons name="mail" size={18} color={colors.onBrandSecondary} />
            <Text style={styles.actionGhostTxt}>E-Mail</Text>
          </Pressable>
        </View>

        <Pressable
          testID="faq-book-btn"
          onPress={() => router.push("/book")}
          style={styles.bookBtn}
        >
          <Ionicons name="calendar" size={18} color={colors.onBrandPrimary} />
          <Text style={styles.bookBtnText}>Jetzt Termin buchen</Text>
        </Pressable>
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
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg, padding: spacing.lg,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    marginBottom: spacing.lg,
  },
  introIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  introTitle: { fontSize: typography.sizes.lg, fontWeight: "800", color: colors.onBrandTertiary },
  introBody: { fontSize: typography.sizes.sm, color: colors.onBrandTertiary, marginTop: 2 },

  card: {
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  cardOpen: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  rowQ: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  question: { flex: 1, fontSize: typography.sizes.base, fontWeight: "700", color: colors.onSurface, lineHeight: 20 },
  answer: {
    fontSize: typography.sizes.sm, color: colors.onSurfaceSecondary,
    marginTop: spacing.sm, lineHeight: 20, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },

  contactBox: {
    flexDirection: "row", gap: spacing.md, alignItems: "center",
    backgroundColor: colors.brandTertiary, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xl,
  },
  contactTitle: { fontSize: typography.sizes.base, fontWeight: "800", color: colors.onBrandTertiary },
  contactBody: { fontSize: typography.sizes.sm, color: colors.onBrandTertiary, marginTop: 2 },

  actionSolid: {
    flex: 1, backgroundColor: colors.brandPrimary, paddingVertical: 12, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm,
  },
  actionSolidTxt: { color: colors.onBrandPrimary, fontWeight: "700" },
  actionGhost: {
    flex: 1, backgroundColor: colors.brandSecondary, paddingVertical: 12, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center", flexDirection: "row", gap: spacing.sm,
  },
  actionGhostTxt: { color: colors.onBrandSecondary, fontWeight: "700" },

  bookBtn: {
    marginTop: spacing.lg, backgroundColor: colors.brandPrimary, paddingVertical: 14,
    borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: spacing.sm,
  },
  bookBtnText: { color: colors.onBrandPrimary, fontWeight: "800", fontSize: typography.sizes.base },
});
