import { api } from "./http";
import type { LoginGoogleResponse } from "../types/auth";

export async function loginConGoogle(idToken: string): Promise<LoginGoogleResponse> {
  const { data } = await api.post<LoginGoogleResponse>("/auth/login/google", {
    idToken,
  });

  return data;
}
