import { Link, useNavigate } from "react-router";
import { Button } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";

export function TopNav() {
  const navigate = useNavigate();
  const apiFetch = useApi();

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    navigate("/login", { replace: true });
  }

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b-2 border-foreground bg-card">
      <div className="mx-auto flex h-12 max-w-250 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            to="/jobs"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Jobs
          </Link>
          <Link
            to="/posts"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Posts
          </Link>
          <Link
            to="/tournaments"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Tournaments
          </Link>
        </div>
        <Button
          onPress={handleLogout}
          className="cursor-pointer border border-foreground bg-background px-3 py-1 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
        >
          Log out
        </Button>
      </div>
    </nav>
  );
}
