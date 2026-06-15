import { useRouter } from "expo-router";
import { useEffect } from "react";
import { BackHandler } from "react-native";
import { useNavGuard } from "@/store/navGuard";

export function useUnsavedChanges(isDirty: boolean) {
  const setDirty = useNavGuard((s) => s.setDirty);
  const confirmLeave = useNavGuard((s) => s.confirmLeave);
  const router = useRouter();

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!useNavGuard.getState().isDirty) return false; 
      confirmLeave().then((leave) => {
        if (leave) router.back();
      });
      return true; 
    });
    return () => sub.remove();
  }, [confirmLeave, router]);
}
