import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/src/lib/theme";
import { openWhatsApp } from "@/src/lib/helpers";

export default function WhatsAppFab({ bottom }: { bottom: number }) {
  return (
    <Pressable
      testID="whatsapp-fab"
      accessibilityLabel="WhatsApp Kontakt"
      onPress={() => openWhatsApp()}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <Ionicons name="logo-whatsapp" size={30} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.whatsapp,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
