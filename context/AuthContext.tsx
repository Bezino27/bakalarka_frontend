// context/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { BASE_URL } from '@/hooks/api';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export type UserRole = {
  role: string;
  category: {
    id: number;
    name: string;
  };
};

type Club = {
  id: number;
  name: string;
  description?: string;
  vote_lock_days?: number;
  training_lock_hours?: number;
};

type UserDetails = {
  id: number;
  username: string;
  name: string;
  birth_date: string;
  number: string;
  email: string;
  email_2?: string;
  height?: string;
  weight?: string;
  side?: string;
  position?: { id: number; name: string } | null;
  preferred_role?: string | null;
  club?: Club | null;
};

export type LinkedAccount = {
  id: number;
  name: string;
  username: string;
  type: "main" | "linked";
  is_current: boolean;
};

type AuthContextType = {
  refreshAccessToken: () => Promise<string | null>;
  isLoggedIn: boolean | null;
  accessToken: string | null;
  userRoles: UserRole[];
  userCategories: string[];
  userClub: Club | null;
  linkedAccounts: LinkedAccount[];
  login: (
    accessToken: string,
    refreshToken: string,
    club: Club | null,
    roles: UserRole[],
    categories: string[],
    userDetails: UserDetails
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUserRoles: (roles: UserRole[]) => Promise<void>;
  setUserClub: (club: Club | null) => Promise<void>;
  setUserCategories: (categories: string[]) => Promise<void>;
  userDetails: UserDetails | null;
  setUserDetails: (details: UserDetails | null) => Promise<void>;
  currentRole: UserRole | null;
  setCurrentRole: (role: UserRole | null) => Promise<void>;
  loadLinkedAccounts: () => Promise<void>;
  switchLinkedAccount: (userId: number) => Promise<void>;
  addLinkedAccount: (username: string, password: string) => Promise<void>;
  removeLinkedAccount: (userId: number) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: null,
  accessToken: null,
  userRoles: [],
  userCategories: [],
  userClub: null,
  linkedAccounts: [],
  userDetails: null,
  login: async () => {},
  logout: async () => {},
  setUserRoles: async () => {},
  setUserClub: async () => {},
  setUserCategories: async () => {},
  setUserDetails: async () => {},
  refreshAccessToken: async () => null,
  currentRole: null,
  setCurrentRole: async () => {},
  loadLinkedAccounts: async () => {},
  switchLinkedAccount: async () => {},
  addLinkedAccount: async () => {},
  removeLinkedAccount: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userRoles, setUserRolesState] = useState<UserRole[]>([]);
  const [userCategories, setUserCategoriesState] = useState<string[]>([]);
  const [userClub, setUserClubState] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userDetails, setUserDetailsState] = useState<UserDetails | null>(null);
  const [currentRole, setCurrentRoleState] = useState<UserRole | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const router = useRouter();

  // ─── Pomocné settery (state + AsyncStorage) ───────────────────────────────

  const updateUserRoles = async (roles: UserRole[]) => {
    setUserRolesState(roles);
    await AsyncStorage.setItem('userRoles', JSON.stringify(roles));
  };

  const updateUserCategories = async (categories: string[]) => {
    setUserCategoriesState(categories);
    await AsyncStorage.setItem('userCategories', JSON.stringify(categories));
  };

  const updateUserClub = async (club: Club | null) => {
    setUserClubState(club);
    if (club) {
      await AsyncStorage.setItem('userClub', JSON.stringify(club));
    } else {
      await AsyncStorage.removeItem('userClub');
    }
  };

  const updateUserDetails = async (details: UserDetails | null) => {
    setUserDetailsState(details);
    if (details) {
      await AsyncStorage.setItem('userDetails', JSON.stringify(details));
    } else {
      await AsyncStorage.removeItem('userDetails');
    }
  };

  const updateCurrentRole = async (role: UserRole | null) => {
    setCurrentRoleState(role);
    if (role) {
      await AsyncStorage.setItem('currentRole', JSON.stringify(role));
    } else {
      await AsyncStorage.removeItem('currentRole');
    }
  };

  const parseApiError = async (response: Response, fallback: string) => {
    try {
      const data = await response.json();
      if (typeof data.error === "string") return data.error;
      if (typeof data.detail === "string") return data.detail;
      if (typeof data.message === "string") return data.message;
    } catch {
      // necháme fallback
    }
    return fallback;
  };

  // ─── Logout ───────────────────────────────────────────────────────────────

  const logout = async () => {
    await AsyncStorage.multiRemove([
      'access', 'refresh', 'userRoles', 'userCategories',
      'userClub', 'userDetails', 'currentRole',
    ]);
    setAccessToken(null);
    setUserRolesState([]);
    setUserCategoriesState([]);
    setUserClubState(null);
    setUserDetailsState(null);
    setCurrentRoleState(null);
    setLinkedAccounts([]);
    await Notifications.setBadgeCountAsync(0).catch(() => {});
    router.replace('/login');
  };

  // ─── Refresh token ────────────────────────────────────────────────────────
  // Návratová hodnota:
  //   string  → nový (alebo aktuálny) platný access token
  //   null    → refresh token expiroval, user bol odhlásený
  //
  // PRAVIDLO: odhlásime JEDINE keď server vráti 401 na /token/refresh/
  // Všetko ostatné (sieť, 500, timeout) → zachovaj session, vráť uložený token

  const refreshAccessToken = async (syncUserData = true): Promise<string | null> => {
    try {
      const refresh = await AsyncStorage.getItem('refresh');
      if (!refresh) {
        // Nemáme refresh token – používateľ sa nikdy neprihlásil alebo bol odhlásený
        return null;
      }

      const response = await fetch(`${BASE_URL}/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      // 401 = refresh token je definitívne neplatný → jediný dôvod na odhlásenie
      if (response.status === 401) {
        console.warn('🚫 Refresh token neplatný – odhlasujem.');
        await logout();
        return null;
      }

      // Akákoľvek iná chyba (sieť, 500, 502, 403...) → neodhlasuj
      if (!response.ok) {
        console.warn(`⚠️ Refresh zlyhal so statusom ${response.status} – zachovávam session.`);
        // Vrátime token, ktorý máme uložený v AsyncStorage (nie zo state, lebo môže byť null)
        return await AsyncStorage.getItem('access');
      }

      // ✅ Úspešný refresh
      const data = await response.json();
      const newAccessToken: string | undefined = data.access;

      if (!newAccessToken) {
        console.warn('⚠️ Refresh odpoveď neobsahuje access token – zachovávam starý.');
        return await AsyncStorage.getItem('access');
      }

      await AsyncStorage.setItem('access', newAccessToken);
      setAccessToken(newAccessToken);

      // Aktualizuj údaje používateľa na pozadí (bez čakania – nechceme blokovať)
      if (syncUserData) {
        syncUserDataInBackground(newAccessToken);
      }

      return newAccessToken;
    } catch (error) {
      // Sieťová chyba, timeout, JSON parse error...
      console.warn('⚠️ Sieťová chyba pri refreshe – zachovávam session:', error);
      return await AsyncStorage.getItem('access');
    }
  };

  // ─── Sync údajov používateľa na pozadí ───────────────────────────────────
  // Volaná po úspešnom refreshe. Chyby tu nespôsobia odhlásenie.

  const syncUserDataInBackground = async (token: string) => {
    try {
      const res = await fetch(`${BASE_URL}/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn(`⚠️ /me/ vrátil ${res.status} – preskakujem sync.`);
        return;
      }

      const data = await res.json();

      const user: UserDetails = {
        id: data.id,
        username: data.username,
        name: data.name,
        birth_date: data.birth_date,
        number: data.number,
        email: data.email,
        email_2: data.email_2,
        height: data.height,
        weight: data.weight,
        side: data.side,
        position: data.position,
        preferred_role: data.preferred_role ?? null,
        club: data.club ?? null,
      };

      await updateUserDetails(user);
      await updateUserRoles(data.roles ?? []);
      await updateUserCategories(data.assigned_categories ?? []);
      await updateUserClub(data.club ?? null);
    } catch (e) {
      console.warn('⚠️ Chyba pri sync používateľa na pozadí:', e);
    }
  };

  const loadUserData = async (token: string): Promise<{ user: UserDetails; roles: UserRole[] } | null> => {
    const res = await fetch(`${BASE_URL}/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.warn(`⚠️ /me/ vrátil ${res.status} pri prepnutí účtu.`);
      return null;
    }

    const data = await res.json();
    const user: UserDetails = {
      id: data.id,
      username: data.username,
      name: data.name,
      birth_date: data.birth_date,
      number: data.number,
      email: data.email,
      email_2: data.email_2,
      height: data.height,
      weight: data.weight,
      side: data.side,
      position: data.position,
      preferred_role: data.preferred_role ?? null,
      club: data.club ?? null,
    };
    const roles: UserRole[] = data.roles ?? [];

    await updateUserDetails(user);
    await updateUserRoles(roles);
    await updateUserCategories(data.assigned_categories ?? []);
    await updateUserClub(data.club ?? null);

    return { user, roles };
  };

  const getStoredAccessToken = async () => {
    return accessToken ?? await AsyncStorage.getItem('access') ?? await refreshAccessToken();
  };

  const fetchWithStoredAuth = async (
    url: string,
    options: RequestInit = {},
    tokenOverride?: string,
    syncAfterRefresh = true
  ) => {
    const token = tokenOverride ?? await getStoredAccessToken();
    if (!token) throw new Error("Nie si prihlásený.");

    const makeRequest = async (requestToken: string) => {
      return fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${requestToken}`,
        },
      });
    };

    let response = await makeRequest(token);

    if (response.status === 401 && !tokenOverride) {
      const refreshedToken = await refreshAccessToken(syncAfterRefresh);
      if (refreshedToken && refreshedToken !== token) {
        response = await makeRequest(refreshedToken);
      }
    }

    return response;
  };

  const loadLinkedAccounts = async (tokenOverride?: string) => {
    try {
      const response = await fetchWithStoredAuth(`${BASE_URL}/linked-accounts/`, {}, tokenOverride);

      if (!response.ok) {
        throw new Error(await parseApiError(response, "Nepodarilo sa načítať prepojené účty."));
      }

      const data: LinkedAccount[] = await response.json();
      setLinkedAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      setLinkedAccounts([]);
      throw error;
    }
  };

  const addLinkedAccount = async (username: string, password: string) => {
    const response = await fetchWithStoredAuth(`${BASE_URL}/linked-accounts/add/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response, "Nepodarilo sa pridať účet."));
    }

    await loadLinkedAccounts();
  };

  const removeLinkedAccount = async (userId: number) => {
    const response = await fetchWithStoredAuth(`${BASE_URL}/linked-accounts/${userId}/`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(await parseApiError(response, "Nepodarilo sa odpojiť účet."));
    }

    await loadLinkedAccounts();
  };

  const switchLinkedAccount = async (userId: number) => {
    const response = await fetchWithStoredAuth(
      `${BASE_URL}/linked-accounts/switch/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      },
      undefined,
      false
    );

    if (!response.ok) {
      throw new Error(await parseApiError(response, "Nepodarilo sa prepnúť účet."));
    }

    const data: { access: string; refresh: string } = await response.json();
    await AsyncStorage.multiSet([
      ['access', data.access],
      ['refresh', data.refresh],
    ]);
    setAccessToken(data.access);

    const loaded = await loadUserData(data.access);
    try {
      await loadLinkedAccounts(data.access);
    } catch (error) {
      console.warn("⚠️ Prepojené účty sa po prepnutí nepodarilo načítať:", error);
    }

    if (!loaded || loaded.roles.length === 0) {
      await updateCurrentRole(null);
      router.replace('/waiting_role');
      return;
    }

    const preferred = loaded.user.preferred_role?.toLowerCase?.();
    const rolesPriority = preferred
      ? [preferred, ...['player', 'coach', 'admin'].filter(role => role !== preferred)]
      : ['player', 'coach', 'admin'];
    const selectedRole = rolesPriority
      .map(roleName => loaded.roles.find(role => role.role?.toLowerCase() === roleName))
      .find((role): role is UserRole => Boolean(role));

    await updateCurrentRole(selectedRole ?? null);
    router.replace('/select-role');
  };

  // ─── Načítanie pri štarte ─────────────────────────────────────────────────
  // Načíta všetko z AsyncStorage, potom skúsi refresh tokenu.
  // Poradie: najprv AsyncStorage → potom refresh (aby sme mali token v state)

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [
          storedToken,
          rolesStr,
          categoriesStr,
          clubStr,
          detailsStr,
          currentRoleStr,
        ] = await AsyncStorage.multiGet([
          'access', 'userRoles', 'userCategories',
          'userClub', 'userDetails', 'currentRole',
        ]);

        const token = storedToken[1];
        if (token) setAccessToken(token);

        if (rolesStr[1]) {
          try { setUserRolesState(JSON.parse(rolesStr[1])); } catch { /* ignoruj */ }
        }
        if (categoriesStr[1]) {
          try { setUserCategoriesState(JSON.parse(categoriesStr[1])); } catch { /* ignoruj */ }
        }
        if (clubStr[1]) {
          try { setUserClubState(JSON.parse(clubStr[1])); } catch { /* ignoruj */ }
        }
        if (detailsStr[1]) {
          try { setUserDetailsState(JSON.parse(detailsStr[1])); } catch { /* ignoruj */ }
        }
        if (currentRoleStr[1]) {
          try { setCurrentRoleState(JSON.parse(currentRoleStr[1])); } catch { /* ignoruj */ }
        }

        // Ak máme refresh token, skús ho použiť na získanie čerstvého access tokenu
        // Toto vyriešia expiráciu access tokenu po reštarte appky
        if (token) {
          const refreshToken = await AsyncStorage.getItem('refresh');
          if (refreshToken) {
            // refreshAccessToken číta z AsyncStorage, takže netreba čakať na state
            await refreshAccessToken();
            try {
              await loadLinkedAccounts();
            } catch (error) {
              console.warn("⚠️ Prepojené účty sa pri štarte nepodarilo načítať:", error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Chyba pri bootstrap načítaní:', error);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← raz pri mount, žiadne závislosti

  // ─── Login ────────────────────────────────────────────────────────────────

  const registerForPushNotifications = async (token: string) => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;

      if (finalStatus !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = newStatus;
      }
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      await fetch(`${BASE_URL}/save-token/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenData.data }),
      });
    } catch (err) {
      console.warn('⚠️ Push notifikácie sa nepodarilo registrovať:', err);
    }
  };

  const login = async (
    access: string,
    refresh: string,
    club: Club | null,
    roles: UserRole[],
    categories: string[],
    details: UserDetails
  ) => {
    await AsyncStorage.multiSet([
      ['access', access],
      ['refresh', refresh],
      ['userRoles', JSON.stringify(roles)],
      ['userCategories', JSON.stringify(categories)],
      ['userDetails', JSON.stringify(details)],
      ...(club ? [['userClub', JSON.stringify(club)] as [string, string]] : []),
    ]);

    if (!club) await AsyncStorage.removeItem('userClub');

    setAccessToken(access);
    setUserRolesState(roles);
    setUserCategoriesState(categories);
    setUserClubState(club);
    setUserDetailsState(details);
    try {
      await loadLinkedAccounts(access);
    } catch (error) {
      console.warn("⚠️ Prepojené účty sa po prihlásení nepodarilo načítať:", error);
    }

    // Vyber currentRole podľa preferred_role alebo prvej 'player' role
    let selectedRole: UserRole | null = null;
    if (details.preferred_role) {
      selectedRole = roles.find(r => r.role === details.preferred_role) ?? null;
    }
    if (!selectedRole) {
      selectedRole = roles.find(r => r.role === 'player') ?? roles[0] ?? null;
    }

    await updateCurrentRole(selectedRole);
    await registerForPushNotifications(access);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: isLoading ? null : !!accessToken,
        accessToken,
        userRoles,
        userCategories,
        userClub,
        linkedAccounts,
        userDetails,
        login,
        logout,
        setUserRoles: updateUserRoles,
        setUserCategories: updateUserCategories,
        setUserClub: updateUserClub,
        setUserDetails: updateUserDetails,
        refreshAccessToken,
        currentRole,
        setCurrentRole: updateCurrentRole,
        loadLinkedAccounts,
        switchLinkedAccount,
        addLinkedAccount,
        removeLinkedAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
