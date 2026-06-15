import AppTabs from "@/components/app-tabs";
import ConfirmModal from "@/components/common/ConfirmModal";
import LoadingScreen from "@/components/loading-screen";
import { useAuthStore } from "@/store/AuthStore";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function AppLayout() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.preventAutoHideAsync();
        await Promise.all([
          useAuthStore.getState().checkLoginStatus(),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
      } catch (error) {
        console.warn(error);
      } finally {
        await SplashScreen.hideAsync();
        setIsLoading(false);
      }
    }

    prepare();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <KeyboardProvider>
      <View style={styles.container}>
        <AppTabs />
      </View>
      <ConfirmModal />
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
