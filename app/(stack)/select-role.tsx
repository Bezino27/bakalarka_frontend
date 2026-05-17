import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef } from 'react';
import { AuthContext } from '@/context/AuthContext';

export default function SelectRoleRedirect() {
  const router = useRouter();
  const {
    isLoggedIn,
    accessToken,
    userRoles,
    userDetails,
    setCurrentRole,
  } = useContext(AuthContext);

  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current || isLoggedIn === null || !isLoggedIn || !accessToken || !userDetails) {
      return;
    }

    if (!Array.isArray(userRoles) || userRoles.length === 0) {
      console.log("⏳ Žiadne roly – redirect na /waiting_role");
      router.replace('/waiting_role');
      redirectedRef.current = true;
      return;
    }

    const preferred = userDetails.preferred_role?.toLowerCase?.();

    const rolesPriority = preferred
        ? [preferred, ...['player', 'coach', 'admin'].filter(r => r !== preferred)]
        : ['player', 'coach', 'admin'];

    const selectedRole = rolesPriority
        .map(roleName => userRoles.find(r => r.role?.toLowerCase() === roleName))
        .find(Boolean);

    if (selectedRole) {
      setCurrentRole(selectedRole);
      redirectedRef.current = true;

      const roleName = selectedRole.role.toLowerCase();

      if (roleName === 'player') {
        router.replace('/(stack)/(tabs)/tabs-player/news');
      } else if (roleName === 'coach') {
        router.replace('/(stack)/(tabs)/tabs-coach/news');
      } else if (roleName === 'admin') {
        router.replace('/(stack)/(tabs)/tabs-admin');
      }
    }
  }, [isLoggedIn, accessToken, userDetails, userRoles, router, setCurrentRole]);

  return null;
}
