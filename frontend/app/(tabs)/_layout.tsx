import { View, Platform } from "react-native";
import { Tabs, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "@/src/lib/theme";
import WhatsAppFab from "@/src/components/WhatsAppFab";

const TAB_CONTENT_HEIGHT = 60;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const bottomPad = Math.max(insets.bottom, Platform.OS === "web" ? 8 : 8);
  const tabBarHeight = TAB_CONTENT_HEIGHT + bottomPad;
  const onBook = segments[segments.length - 1] === "book";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brandPrimary,
          tabBarInactiveTintColor: colors.onSurfaceTertiary,
          tabBarStyle: {
            backgroundColor: colors.surfaceSecondary,
            borderTopColor: colors.border,
            height: tabBarHeight,
            paddingTop: 6,
            paddingBottom: bottomPad,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarButtonTestID: "tab-home",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="services"
          options={{
            title: "Services",
            tabBarButtonTestID: "tab-services",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="book"
          options={{
            title: "Buchen",
            tabBarButtonTestID: "tab-book",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profil",
            tabBarButtonTestID: "tab-profile",
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />,
          }}
        />
      </Tabs>
      {!onBook && <WhatsAppFab bottom={tabBarHeight + 16} />}
    </View>
  );
}
