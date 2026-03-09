import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";

const NAV_LINK_CLASS =
  "text-sm font-medium text-muted-foreground hover:text-foreground";

export function TopNav() {
  const navigate = useNavigate();
  const apiFetch = useApi();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    navigate("/login", { replace: true });
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b-2 border-foreground bg-card">
      <div className="mx-auto flex h-12 max-w-250 items-center justify-between px-4">
        <div className="hidden md:flex items-center gap-6">
          <Link to="/posts" className={NAV_LINK_CLASS}>
            Posts
          </Link>
          <Link to="/tournaments" className={NAV_LINK_CLASS}>
            Tournaments
          </Link>
          <Link to="/jobs" className={NAV_LINK_CLASS}>
            Jobs
          </Link>
          <Link to="/users" className={NAV_LINK_CLASS}>
            Users
          </Link>
        </div>

        <Button
          onPress={() => setMenuOpen((v) => !v)}
          className="md:hidden cursor-pointer text-foreground"
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {menuOpen ?
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            : <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            }
          </svg>
        </Button>

        <Button
          onPress={handleLogout}
          className="cursor-pointer border border-foreground bg-background px-3 py-1 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
        >
          Log out
        </Button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-2 flex flex-col gap-2">
          <Link
            to="/posts"
            className={NAV_LINK_CLASS}
            onClick={() => setMenuOpen(false)}
          >
            Posts
          </Link>
          <Link
            to="/tournaments"
            className={NAV_LINK_CLASS}
            onClick={() => setMenuOpen(false)}
          >
            Tournaments
          </Link>
          <Link
            to="/jobs"
            className={NAV_LINK_CLASS}
            onClick={() => setMenuOpen(false)}
          >
            Jobs
          </Link>
          <Link
            to="/users"
            className={NAV_LINK_CLASS}
            onClick={() => setMenuOpen(false)}
          >
            Users
          </Link>
        </div>
      )}
    </nav>
  );
}
