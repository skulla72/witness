import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";

export type AppSpace = "personal" | "organization" | "professional";

const KEY = "witness.app-space.v1";
const EVENT = "witness-app-space";

function isSpace(value: string | null): value is AppSpace {
  return value === "personal" || value === "organization" || value === "professional";
}

export function useAppSpace() {
  const [space, setSpaceState] = useState<AppSpace>("personal");
  const { pathname } = useLocation();

  useEffect(() => {
    const routeSpace = pathname.startsWith("/spaces/organization")
      ? "organization"
      : pathname.startsWith("/spaces/professional")
        ? "professional"
        : null;
    if (routeSpace) {
      setSpaceState(routeSpace);
      window.localStorage.setItem(KEY, routeSpace);
      return;
    }
    const stored = window.localStorage.getItem(KEY);
    if (isSpace(stored)) setSpaceState(stored);
    const sync = (event: Event) => {
      const next = (event as CustomEvent<AppSpace>).detail;
      if (isSpace(next)) setSpaceState(next);
    };
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, [pathname]);

  const setSpace = (next: AppSpace) => {
    setSpaceState(next);
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new CustomEvent<AppSpace>(EVENT, { detail: next }));
  };

  return { space, setSpace };
}
