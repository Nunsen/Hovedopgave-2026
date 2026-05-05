import Constants from 'expo-constants';

type ExtraConfig = {
    apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;
const manifestHostUri =
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ??
    ((Constants as unknown as {
            expoGoConfig?: { debuggerHost?: string };
            manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
        }).expoGoConfig?.debuggerHost ??
        (Constants as unknown as {
            expoGoConfig?: { debuggerHost?: string };
            manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
        }).manifest2?.extra?.expoClient?.hostUri);

function resolveApiBaseUrl() {
    if (extra.apiBaseUrl) {
        return extra.apiBaseUrl;
    }

    if (manifestHostUri) {
        const host = manifestHostUri.split(':')[0];

        if (host) {
            return `http://${host}:8080/api`;
        }
    }

    return 'http://127.0.0.1:8080/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
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

        return {response, responseBody};
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

export type PostDto = {
    postId: number;
    userId: number | null;
    title: string;
    content: string;
    category: string;
    icon: string;
    eventDate: string | null;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    createdAt: string;
    pinned: boolean;
    participantCount: number;
    attending: boolean | null;
    comments: CommentDto[];
};

export type CommentDto = {
    commentId: number;
    userId: number | null;
    authorName: string;
    content: string;
    createdAt: string;
};

export type CreatePostPayload = {
    userId: number;
    title: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    location: string;
    category: 'Begivenhed' | 'Generelt' | 'Vigtig info';
    content: string;
    icon: string;
    pinned: boolean;
};

export type CreatePostError = {
    message: string;
    fieldErrors?: Partial<Record<keyof CreatePostPayload, string>>;
};

export type UpdateParticipationPayload = {
    userId: number;
    attending: boolean;
};

export type CreateCommentPayload = {
    userId: number;
    content: string;
};

export async function getPosts(): Promise<{ data?: PostDto[]; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson('/posts', {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente opslag.'};
        }

        return {data: responseBody as PostDto[]};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function getPost(
    postId: number,
    userId?: number,
): Promise<{ data?: PostDto; error?: string }> {
    try {
        const query = userId ? `?userId=${userId}` : '';
        const {response, responseBody} = await fetchJson(`/posts/${postId}${query}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente opslaget.'};
        }

        return {data: responseBody as PostDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function createPost(
    payload: CreatePostPayload,
): Promise<{ data?: PostDto; error?: CreatePostError }> {
    try {
        const {response, responseBody} = await fetchJson('/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as CreatePostError};
        }

        return {data: responseBody as PostDto};
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        return {
            error: {
                message: timedOut
                    ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend kører på ${API_BASE_URL}.`
                    : `Forbindelsen til serveren fejlede. Kontroller backend og netværk. Aktiv URL: ${API_BASE_URL}`,
            },
        };
    }
}

export async function updatePost(
    postId: number,
    payload: CreatePostPayload,
): Promise<{ data?: PostDto; error?: CreatePostError }> {
    try {
        const {response, responseBody} = await fetchJson(`/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as CreatePostError};
        }

        return {data: responseBody as PostDto};
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        return {
            error: {
                message: timedOut
                    ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend kører på ${API_BASE_URL}.`
                    : `Forbindelsen til serveren fejlede. Kontroller backend og netværk. Aktiv URL: ${API_BASE_URL}`,
            },
        };
    }
}

export async function deletePost(
    postId: number,
    userId: number,
): Promise<{ error?: string }> {
    try {
        const {response} = await fetchJson(`/posts/${postId}?userId=${userId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke slette opslaget.'};
        }

        return {};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function updatePostParticipation(
    postId: number,
    payload: UpdateParticipationPayload,
): Promise<{ data?: PostDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/posts/${postId}/participation`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: 'Kunne ikke opdatere deltagelse.'};
        }

        return {data: responseBody as PostDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function createPostComment(
    postId: number,
    payload: CreateCommentPayload,
): Promise<{ data?: PostDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: 'Kunne ikke oprette kommentar.'};
        }

        return {data: responseBody as PostDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export type LoginUserPayload = {
    email: string;
    password: string;
};

export type ResetPasswordPayload = {
    email: string;
    newPassword: string;
};

export type LoginUserSuccess = {
    userId: number;
    fullName: string;
    email: string;
    role: string;
    message: string;
};

export type LoginUserError = {
    message: string;
    fieldErrors?: Partial<Record<keyof LoginUserPayload, string>>;
};

export type ResetPasswordSuccess = {
    email: string;
    message: string;
};

export type ResetPasswordError = {
    message: string;
    fieldErrors?: Partial<Record<keyof ResetPasswordPayload, string>>;
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
        const {response, responseBody} = await fetchJson('/users/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as RegisterUserError};
        }

        return {data: responseBody as RegisterUserSuccess};
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        return {
            error: {
                message: timedOut
                    ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend kører på ${API_BASE_URL}.`
                    : `Forbindelsen til serveren fejlede. Kontroller backend og netværk. Aktiv URL: ${API_BASE_URL}`,
            },
        };
    }
}

export async function loginUser(
    payload: LoginUserPayload,
): Promise<{ data?: LoginUserSuccess; error?: LoginUserError }> {
    try {
        const {response, responseBody} = await fetchJson('/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as LoginUserError};
        }

        return {data: responseBody as LoginUserSuccess};
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        return {
            error: {
                message: timedOut
                    ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend kører på ${API_BASE_URL}.`
                    : `Forbindelsen til serveren fejlede. Kontroller backend og netværk. Aktiv URL: ${API_BASE_URL}`,
            },
        };
    }
}

export async function resetPassword(
    payload: ResetPasswordPayload,
): Promise<{ data?: ResetPasswordSuccess; error?: ResetPasswordError }> {
    try {
        const {response, responseBody} = await fetchJson('/users/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as ResetPasswordError};
        }

        return {data: responseBody as ResetPasswordSuccess};
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        return {
            error: {
                message: timedOut
                    ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend kører på ${API_BASE_URL}.`
                    : `Forbindelsen til serveren fejlede. Kontroller backend og netværk. Aktiv URL: ${API_BASE_URL}`,
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
        const {response, responseBody} = await fetchJson('/activation-codes/activate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as ActivateUserError};
        }

        return {data: responseBody as ActivateUserSuccess};
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        return {
            error: {
                message: timedOut
                    ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend kører på ${API_BASE_URL}.`
                    : `Forbindelsen til serveren fejlede. Kontroller backend og netværk. Aktiv URL: ${API_BASE_URL}`,
            },
        };
    }
}
