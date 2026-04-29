import Constants from 'expo-constants';

type ExtraConfig = {
  apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const API_BASE_URL = extra.apiBaseUrl ?? 'http://10.136.138.149:8080/api';
const REQUEST_TIMEOUT_MS = 8000;

async function fetchJson(path: string, options: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const responseBody = contentType.includes('application/json')
      ? await response.json()
      : null;

    return { response, responseBody };
  } finally {
    clearTimeout(timeoutId);
  }
}

export type RegisterUserPayload = {
  fullName: string;
  email: string;
  phoneNumber: string;
  birthDate: string;
  apartmentNumber: string;
  password: string;
  confirmPassword: string;
};

export type LoginUserPayload = {
  email: string;
  password: string;
};

export type LoginUserSuccess = {
  userId: number;
  fullName: string;
  email: string;
  message: string;
};

export type LoginUserError = {
  message: string;
  fieldErrors?: Partial<Record<keyof LoginUserPayload, string>>;
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
    const { response, responseBody } = await fetchJson('/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { error: responseBody as RegisterUserError };
    }

    return { data: responseBody as RegisterUserSuccess };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return {
      error: {
        message: timedOut
          ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend koerer paa ${API_BASE_URL}.`
          : `Forbindelsen til serveren fejlede. Kontroller backend og netvaerk. Aktiv URL: ${API_BASE_URL}`,
      },
    };
  }
}

export async function loginUser(
  payload: LoginUserPayload,
): Promise<{ data?: LoginUserSuccess; error?: LoginUserError }> {
  try {
    const { response, responseBody } = await fetchJson('/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { error: responseBody as LoginUserError };
    }

    return { data: responseBody as LoginUserSuccess };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return {
      error: {
        message: timedOut
          ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend koerer paa ${API_BASE_URL}.`
          : `Forbindelsen til serveren fejlede. Kontroller backend og netvaerk. Aktiv URL: ${API_BASE_URL}`,
      },
    };
  }
}

export type ActivateUserPayload = {
  userId: number;
  code: string;
};

export type ActivateUserSuccess = {
  userId: number;
  code: string;
  activated: boolean;
  message: string;
};

export type ActivateUserError = {
  message: string;
  fieldErrors?: Partial<Record<keyof ActivateUserPayload, string>>;
};

export async function activateUser(
  payload: ActivateUserPayload,
): Promise<{ data?: ActivateUserSuccess; error?: ActivateUserError }> {
  try {
    const { response, responseBody } = await fetchJson('/activation-codes/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { error: responseBody as ActivateUserError };
    }

    return { data: responseBody as ActivateUserSuccess };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return {
      error: {
        message: timedOut
          ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend koerer paa ${API_BASE_URL}.`
          : `Forbindelsen til serveren fejlede. Kontroller backend og netvaerk. Aktiv URL: ${API_BASE_URL}`,
      },
    };
  }
}
