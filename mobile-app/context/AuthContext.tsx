import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { LoginUserSuccess, RegisterUserSuccess } from '@/lib/api';

const AUTH_STORAGE_KEY = 'auth:user';
const PENDING_ACTIVATION_STORAGE_KEY = 'auth:pending-activation-user';

type AuthUser = LoginUserSuccess;
type PendingActivationUser = Pick<RegisterUserSuccess, 'userId' | 'fullName' | 'email'>;

type AuthContextValue = {
  user: AuthUser | null;
  login: (nextUser: AuthUser) => Promise<void>;
  updateUser: (nextUser: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  pendingActivationUser: PendingActivationUser | null;
  setPendingActivationUser: (nextUser: PendingActivationUser) => Promise<void>;
  clearPendingActivationUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pendingActivationUser, setPendingActivationUserState] =
    useState<PendingActivationUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedUser, storedPendingActivationUser] = await AsyncStorage.multiGet([
          AUTH_STORAGE_KEY,
          PENDING_ACTIVATION_STORAGE_KEY,
        ]);

        const serializedUser = storedUser[1];
        const serializedPendingActivationUser = storedPendingActivationUser[1];

        if (serializedUser) {
          setUser(JSON.parse(serializedUser) as AuthUser);
        }

        if (serializedPendingActivationUser) {
          setPendingActivationUserState(
            JSON.parse(serializedPendingActivationUser) as PendingActivationUser,
          );
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      pendingActivationUser,
      login: async (nextUser) => {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      },
      updateUser: async (nextUser) => {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      },
      logout: async () => {
        await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, PENDING_ACTIVATION_STORAGE_KEY]);
        setUser(null);
        setPendingActivationUserState(null);
      },
      setPendingActivationUser: async (nextUser) => {
        await AsyncStorage.setItem(
          PENDING_ACTIVATION_STORAGE_KEY,
          JSON.stringify(nextUser),
        );
        setPendingActivationUserState(nextUser);
      },
      clearPendingActivationUser: async () => {
        await AsyncStorage.removeItem(PENDING_ACTIVATION_STORAGE_KEY);
        setPendingActivationUserState(null);
      },
    }),
    [isLoading, pendingActivationUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}

export type { AuthUser, PendingActivationUser };
