import { apiFetch } from "./apiClient";
import type { Patient, ProfileUpdatePayload } from "./types";

type ProfileData = { patient: Patient };

export function getMyProfile() {
  return apiFetch<ProfileData>("/patient/me");
}

export function updateMyProfile(payload: ProfileUpdatePayload) {
  return apiFetch<ProfileData>("/patient/me", {
    method: "PUT",
    body: payload,
  });
}
