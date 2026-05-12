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

export type BookingDto = {
    bookingId: number;
    userId: number | null;
    facilityId: number | null;
    facilityName: string | null;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    status: string | null;
    createdAt: string | null;
};

export type BookingSlotDto = {
    startTime: string;
    endTime: string;
    available: boolean;
    bookingId: number | null;
    ownedByCurrentUser: boolean;
};

export type BookingAvailabilityDto = {
    date: string;
    facilities: BookingFacilityAvailabilityDto[];
};

export type BookingFacilityAvailabilityDto = {
    facilityId: number;
    facilityName: string;
    slots: BookingSlotDto[];
};

export type PartyRoomDayAvailabilityDto = {
    date: string;
    dayOfMonth: number;
    inCurrentMonth: boolean;
    status: 'available' | 'booked' | 'cooldown' | 'owned';
    bookingId: number | null;
    ownedByCurrentUser: boolean;
};

export type PartyRoomAvailabilityDto = {
    month: string;
    facilityId: number;
    facilityName: string;
    days: PartyRoomDayAvailabilityDto[];
};

export type CreatePartyRoomBookingPayload = {
    userId: number;
    date: string;
};

export type CreateBookingPayload = {
    userId: number;
    facilityId: number;
    date: string;
    startTime: string;
    endTime: string;
};

export type CreateBookingError = {
    message: string;
    fieldErrors?: Partial<Record<keyof CreateBookingPayload, string>>;
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

export async function getBookings(
    userId?: number,
): Promise<{ data?: BookingDto[]; error?: string }> {
    try {
        const query = userId ? `?userId=${userId}` : '';
        const {response, responseBody} = await fetchJson(`/bookings${query}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente bookinger.'};
        }

        return {data: responseBody as BookingDto[]};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function getBookingAvailability(
    date: string,
    userId?: number,
): Promise<{ data?: BookingAvailabilityDto; error?: string }> {
    try {
        const query = userId ? `/bookings/availability?date=${date}&userId=${userId}` : `/bookings/availability?date=${date}`;
        const {response, responseBody} = await fetchJson(query, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente ledige tider.'};
        }

        return {data: responseBody as BookingAvailabilityDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function createBooking(
    payload: CreateBookingPayload,
): Promise<{ data?: BookingDto; error?: CreateBookingError }> {
    try {
        const {response, responseBody} = await fetchJson('/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as CreateBookingError};
        }

        return {data: responseBody as BookingDto};
    } catch (error) {
        const timedOut = error instanceof Error && error.name === 'AbortError';
        return {
            error: {
                message: timedOut
                    ? `Serveren svarede ikke inden for ${REQUEST_TIMEOUT_MS / 1000} sekunder. Kontroller at backend kÃ¸rer pÃ¥ ${API_BASE_URL}.`
                    : `Forbindelsen til serveren fejlede. Kontroller backend og netvÃ¦rk. Aktiv URL: ${API_BASE_URL}`,
            },
        };
    }
}

export async function getPartyRoomAvailability(
    month: string,
    userId?: number,
): Promise<{ data?: PartyRoomAvailabilityDto; error?: string }> {
    try {
        const query = userId
            ? `/bookings/party-room/availability?month=${month}&userId=${userId}`
            : `/bookings/party-room/availability?month=${month}`;
        const {response, responseBody} = await fetchJson(query, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente ledige festsalsdatoer.'};
        }

        return {data: responseBody as PartyRoomAvailabilityDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function createPartyRoomBooking(
    payload: CreatePartyRoomBookingPayload,
): Promise<{ data?: BookingDto; error?: CreateBookingError }> {
    try {
        const {response, responseBody} = await fetchJson('/bookings/party-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as CreateBookingError};
        }

        return {data: responseBody as BookingDto};
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

export async function deleteBooking(
    bookingId: number,
    userId: number,
): Promise<{ error?: string }> {
    try {
        const {response} = await fetchJson(`/bookings/${bookingId}?userId=${userId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke slette bookingen.'};
        }

        return {};
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

export type UserProfileDto = {
    userId: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phoneNumber: string | null;
    birthDate: string | null;
    apartmentNumber: string | null;
    password: string;
};

export type ChatGroupDto = {
    groupId: number;
    name: string;
    description: string;
    groupType: string;
    counterpartUserId: number | null;
    memberCount: number;
    joined: boolean;
    createdByUserId: number | null;
    createdByName: string;
    lastMessagePreview: string | null;
    lastMessageAt: string | null;
};

export type ChatOverviewDto = {
    directConversations: ChatGroupDto[];
    joinedGroups: ChatGroupDto[];
    availableGroups: ChatGroupDto[];
};

export type ChatUserSearchDto = {
    userId: number;
    fullName: string;
    subtitle: string;
};

export type ChatMessageDto = {
    messageId: number;
    groupId: number;
    userId: number;
    authorName: string;
    message: string;
    sentAt: string;
};

export type CreateChatGroupPayload = {
    userId: number;
    name: string;
    description: string;
    memberUserIds: number[];
};

export type CreateDirectChatPayload = {
    userId: number;
    targetUserId: number;
};

export type AddChatGroupMembersPayload = {
    userId: number;
    memberUserIds: number[];
};

export type JoinChatGroupPayload = {
    userId: number;
};

export type CreateChatGroupError = {
    message: string;
    fieldErrors?: Partial<Record<keyof CreateChatGroupPayload, string>>;
};

export type UpdateUserProfilePayload = {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    birthDate: string;
    apartmentNumber: string;
    password: string;
    confirmPassword: string;
};

export type UpdateUserProfileError = {
    message: string;
    fieldErrors?: Partial<Record<keyof UpdateUserProfilePayload, string>>;
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

export async function getUserProfile(
    userId: number,
): Promise<{ data?: UserProfileDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/users/${userId}/profile`, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente profiloplysninger.'};
        }

        return {data: responseBody as UserProfileDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function updateUserProfile(
    userId: number,
    payload: UpdateUserProfilePayload,
): Promise<{ data?: UserProfileDto; error?: UpdateUserProfileError }> {
    try {
        const {response, responseBody} = await fetchJson(`/users/${userId}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as UpdateUserProfileError};
        }

        return {data: responseBody as UserProfileDto};
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

export async function deleteUserProfile(
    userId: number,
): Promise<{ error?: string }> {
    try {
        const {response} = await fetchJson(`/users/${userId}/profile`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke slette profilen.'};
        }

        return {};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function getChatOverview(
    userId: number,
): Promise<{ data?: ChatOverviewDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups?userId=${userId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente chatgrupper.'};
        }

        return {data: responseBody as ChatOverviewDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function searchChatUsers(
    userId: number,
    query = '',
): Promise<{ data?: ChatUserSearchDto[]; error?: string }> {
    const params = new URLSearchParams({ userId: String(userId) });
    if (query.trim()) {
        params.set('query', query.trim());
    }

    try {
        const {response, responseBody} = await fetchJson(`/users/chat-search?${params.toString()}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente brugere.'};
        }

        return {data: responseBody as ChatUserSearchDto[]};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function getChatMessages(
    groupId: number,
    userId: number,
): Promise<{ data?: ChatMessageDto[]; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups/${groupId}/messages?userId=${userId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente beskeder.'};
        }

        return {data: responseBody as ChatMessageDto[]};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function getChatGroup(
    groupId: number,
    userId: number,
): Promise<{ data?: ChatGroupDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups/${groupId}?userId=${userId}`, {
            method: 'GET',
        });

        if (!response.ok) {
            return {error: 'Kunne ikke hente gruppeoplysninger.'};
        }

        return {data: responseBody as ChatGroupDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function createChatMessage(
    groupId: number,
    payload: { userId: number; message: string },
): Promise<{ data?: ChatMessageDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups/${groupId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: 'Kunne ikke sende beskeden.'};
        }

        return {data: responseBody as ChatMessageDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function createChatGroup(
    payload: CreateChatGroupPayload,
): Promise<{ data?: ChatGroupDto; error?: CreateChatGroupError }> {
    try {
        const {response, responseBody} = await fetchJson('/groups', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: responseBody as CreateChatGroupError};
        }

        return {data: responseBody as ChatGroupDto};
    } catch {
        return {error: { message: 'Forbindelse til server fejlede.' }};
    }
}

export async function createDirectChat(
    payload: CreateDirectChatPayload,
): Promise<{ data?: ChatGroupDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson('/groups/direct', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: 'Kunne ikke oprette samtalen.'};
        }

        return {data: responseBody as ChatGroupDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function joinChatGroup(
    groupId: number,
    payload: JoinChatGroupPayload,
): Promise<{ data?: ChatGroupDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups/${groupId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            return {error: 'Kunne ikke tilmelde gruppen.'};
        }

        return {data: responseBody as ChatGroupDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function leaveChatGroup(
    groupId: number,
    payload: JoinChatGroupPayload,
): Promise<{ error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups/${groupId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorMessage = (responseBody as { message?: string } | null)?.message;
            return {error: errorMessage ?? 'Kunne ikke forlade gruppen.'};
        }

        return {};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function deleteDirectChatForUser(
    groupId: number,
    payload: JoinChatGroupPayload,
): Promise<{ error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups/${groupId}/delete-for-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorMessage = (responseBody as { message?: string } | null)?.message;
            return {error: errorMessage ?? 'Kunne ikke slette samtalen.'};
        }

        return {};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function addChatGroupMembers(
    groupId: number,
    payload: AddChatGroupMembersPayload,
): Promise<{ data?: ChatGroupDto; error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups/${groupId}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorMessage = (responseBody as { message?: string } | null)?.message;
            return {error: errorMessage ?? 'Kunne ikke tilføje medlemmer.'};
        }

        return {data: responseBody as ChatGroupDto};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
    }
}

export async function deleteChatGroup(
    groupId: number,
    userId: number,
): Promise<{ error?: string }> {
    try {
        const {response, responseBody} = await fetchJson(`/groups/${groupId}?userId=${userId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorMessage = (responseBody as { message?: string } | null)?.message;
            return {error: errorMessage ?? 'Kunne ikke slette gruppen.'};
        }

        return {};
    } catch {
        return {error: 'Forbindelse til server fejlede.'};
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
