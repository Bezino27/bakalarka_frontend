import { AuthContext } from "../context/AuthContext";
import { useCallback, useContext, useEffect, useRef } from "react";

export const useFetchWithAuth = () => {
  const { accessToken, refreshAccessToken } = useContext(AuthContext);
  const isRefreshing = useRef(false);
  const pendingTokenRef = useRef<Promise<string | null> | null>(null);
  const accessTokenRef = useRef(accessToken);
  const refreshAccessTokenRef = useRef(refreshAccessToken);

  useEffect(() => {
    accessTokenRef.current = accessToken;
    refreshAccessTokenRef.current = refreshAccessToken;
  }, [accessToken, refreshAccessToken]);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const doRequest = async (token: string) => {
      const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

      return await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
          ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        },
      });
    };

    const currentToken = accessTokenRef.current ?? (await refreshAccessTokenRef.current());

    if (!currentToken) {
      return new Response(null, { status: 401 });
    }

    let response = await doRequest(currentToken);

    if (response.status === 401) {
      if (!isRefreshing.current) {
        isRefreshing.current = true;
        pendingTokenRef.current = refreshAccessTokenRef.current().finally(() => {
          isRefreshing.current = false;
        });
      }

      const newToken = await pendingTokenRef.current;
      if (newToken) {
        response = await doRequest(newToken);
      } else {
        return new Response(null, { status: 401 });
      }
    }

    return response;
  }, []);

  return { fetchWithAuth };
};
