import { Alert, AlertButton } from "react-native";
import { ALERT_TITLES, MESSAGES } from "@/constants/messages";

export function errorMessage(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : MESSAGES.GENERIC_ERROR;
}

export function showError(err: unknown, title: string = ALERT_TITLES.ERROR): void {
  Alert.alert(title, errorMessage(err));
}

export function showSuccess(
  message: string,
  title: string = ALERT_TITLES.SUCCESS,
  buttons?: AlertButton[],
): void {
  Alert.alert(title, message, buttons);
}
