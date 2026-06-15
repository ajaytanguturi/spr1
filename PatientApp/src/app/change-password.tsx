import { useRouter } from "expo-router";
import PasswordScreen from "@/components/common/PasswordScreen";
import { ALERT_TITLES, MESSAGES } from "@/constants/messages";
import { changePassword } from "@/services/authService";
import { showSuccess } from "@/utils/alerts";

export default function ChangePassword() {
  const router = useRouter();

  return (
    <PasswordScreen
      title="Change password"
      subtitle="Enter your current password and choose a new one."
      topField={{
        label: "Current password",
        placeholder: "Current password",
        icon: "lock-closed-outline",
        secureToggle: true,
      }}
      submitLabel="Update password"
      submittingLabel="Saving…"
      errorTitle={ALERT_TITLES.CHANGE_FAILED}
      onSubmit={async (currentPassword, newPassword, confirmPassword) => {
        await changePassword(currentPassword, newPassword, confirmPassword);
        showSuccess(MESSAGES.PASSWORD_CHANGED, ALERT_TITLES.SUCCESS, [
          { text: "OK", onPress: () => router.back() },
        ]);
      }}
    />
  );
}
