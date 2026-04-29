import Constants from 'expo-constants';

type ExtraConfig = {
  apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const API_BASE_URL = extra.apiBaseUrl ?? 'http://localhost:8080/api';

export type RegisterUserPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  apartmentNumber: string;
  password: string;
  confirmPassword: string;
};

export type RegisterUserSuccess = {
  userId: number;
  fullName: string;
  email: string;
  nextStep: string;
};

export type RegisterUserError = {
  message: string;
  fieldErrors?: Partial<Record<keyof RegisterUserPayload, string>>;
};

export async function registerUser(
  payload: RegisterUserPayload,
): Promise<{ data?: RegisterUserSuccess; error?: RegisterUserError }> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      return { error: responseBody as RegisterUserError };
    }

    return { data: responseBody as RegisterUserSuccess };
  } catch {
    return {
      error: {
        message: 'Forbindelsen til serveren fejlede. Kontroller backend og netvaerk.',
      },
    };
  }
}
