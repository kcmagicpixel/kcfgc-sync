import { useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router";

export function useApi() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);
  // eslint-disable-next-line react-hooks/refs
  pathnameRef.current = location.pathname;

  const apiFetch = useCallback(
    async (input: string | URL | Request, init?: RequestInit) => {
      const res = await fetch(input, init);
      if (res.status === 401) {
        navigate("/login", {
          state: { from: pathnameRef.current },
          replace: true,
        });
      }
      return res;
    },
    [navigate]
  );

  return apiFetch;
}
