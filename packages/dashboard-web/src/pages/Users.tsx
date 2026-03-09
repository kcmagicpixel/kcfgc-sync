import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, Input, Label, TextField } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { useAuth } from "../libs/hooks/use-auth.hook";
import { cn } from "../libs/utils/cn.util";
import { Drawer } from "../components/Drawer";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useIsMobile } from "../libs/hooks/use-is-mobile.hook";

interface UserRow {
  id: number;
  username: string;
  role: "admin" | "user";
}

interface SessionRow {
  id: number;
  createdAt: number;
}

export default function Users() {
  const { userId: currentUserId, role } = useAuth();
  const isAdmin = role === "admin";
  const apiFetch = useApi();
  const isMobile = useIsMobile();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  // Create user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Change password form
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  const fetchUsers = useCallback(async () => {
    const res = await apiFetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, [apiFetch]);

  useEffect(() => {
    fetchUsers();
  }, [apiFetch, fetchUsers]);

  useEffect(() => {
    if (selectedId == null) {
      setSessions([]);
      return;
    }
    apiFetch(`/api/users/${selectedId}/sessions`).then(async (res) => {
      if (res.ok) setSessions(await res.json());
      else setSessions([]);
    });
  }, [selectedId, apiFetch]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!newUsername.trim() || !newPassword) {
      setCreateError("Username and password required");
      return;
    }
    setCreating(true);
    try {
      const res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
        }),
      });
      if (res.ok) {
        setNewUsername("");
        setNewPassword("");
        await fetchUsers();
      } else {
        const data = await res.json();
        setCreateError(data.error ?? "Failed to create user");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setPasswordError(null);
    setPasswordSuccess(false);
    if (!password) {
      setPasswordError("Password required");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await apiFetch(`/api/users/${selected.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setPassword("");
        setPasswordSuccess(true);
      } else {
        const data = await res.json();
        setPasswordError(data.error ?? "Failed to update password");
      }
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    const res = await apiFetch(`/api/users/${selected.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSelectedId(null);
      await fetchUsers();
    }
  }

  const canManageSessions =
    selected && (isAdmin || selected.id === currentUserId);

  const canChangePassword = canManageSessions;

  async function handleDeleteSession(sessionId: number) {
    if (!selected) return;
    const res = await apiFetch(
      `/api/users/${selected.id}/sessions/${sessionId}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Users</h1>

      {isAdmin && (
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <TextField
            value={newUsername}
            onChange={setNewUsername}
            className="flex flex-col gap-1"
          >
            <Label className="text-sm font-medium text-foreground">
              Username
            </Label>
            <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          </TextField>
          <TextField
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            className="flex flex-col gap-1"
          >
            <Label className="text-sm font-medium text-foreground">
              Password
            </Label>
            <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          </TextField>
          <Button
            type="submit"
            isDisabled={creating}
            className="cursor-pointer border border-foreground bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create User"}
          </Button>
          {createError && (
            <span className="text-sm text-destructive">{createError}</span>
          )}
        </form>
      )}

      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        {/* Left pane — table */}
        <div className="flex w-full md:w-1/2 flex-col gap-2">
          <div className="flex-1 overflow-y-auto border border-foreground">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b-2 border-foreground text-left">
                  <th className="px-3 py-2 font-medium">Username</th>
                  <th className="px-3 py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => {
                      setSelectedId(u.id);
                      setPassword("");
                      setPasswordError(null);
                      setPasswordSuccess(false);
                    }}
                    className={cn(
                      "cursor-pointer border-b border-border hover:bg-accent",
                      selectedId === u.id && "bg-accent"
                    )}
                  >
                    <td className="px-3 py-2">{u.username}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-block border px-1.5 py-0.5 text-xs font-medium",
                          u.role === "admin" ?
                            "border-blue-700 bg-blue-100 text-blue-800"
                          : "border-muted-foreground bg-muted text-muted-foreground"
                        )}
                      >
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right pane — detail (desktop) */}
        {!isMobile && (
          <div className="flex w-1/2 flex-col gap-2">
            {selected ?
              <DetailPane />
            : <div className="flex flex-1 items-center justify-center border border-border text-muted-foreground">
                Select a user to view details
              </div>
            }
          </div>
        )}
      </div>

      {/* Drawer — detail (mobile) */}
      {isMobile && (
        <Drawer open={selected != null} onClose={() => setSelectedId(null)}>
          {selected && <DetailPane />}
        </Drawer>
      )}
    </div>
  );

  function DetailPane() {
    if (!selected) return null;
    return (
      <div className="min-h-0 flex-1 overflow-y-auto border border-input p-4 md:border">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold">{selected.username}</h2>
            <span
              className={cn(
                "inline-block border px-1.5 py-0.5 text-xs font-medium",
                selected.role === "admin" ?
                  "border-blue-700 bg-blue-100 text-blue-800"
                : "border-muted-foreground bg-muted text-muted-foreground"
              )}
            >
              {selected.role}
            </span>
          </div>

          {canChangePassword && (
            <form
              onSubmit={handleChangePassword}
              className="flex flex-col gap-2"
            >
              <h3 className="text-sm font-medium text-foreground">
                Change Password
              </h3>
              <div className="flex items-end gap-2">
                <TextField
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    setPasswordSuccess(false);
                  }}
                  type="password"
                  className="flex flex-1 flex-col gap-1"
                >
                  <Label className="text-sm font-medium text-foreground">
                    New Password
                  </Label>
                  <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </TextField>
                <Button
                  type="submit"
                  isDisabled={savingPassword}
                  className="cursor-pointer border border-foreground bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
                >
                  {savingPassword ? "Saving..." : "Update"}
                </Button>
              </div>
              {passwordError && (
                <span className="text-sm text-destructive">
                  {passwordError}
                </span>
              )}
              {passwordSuccess && (
                <span className="text-sm text-green-700">Password updated</span>
              )}
            </form>
          )}

          {isAdmin && selected.id !== currentUserId && (
            <div>
              <ConfirmDialog
                title="Delete User"
                description="Are you sure you want to delete this user? This cannot be undone."
                confirmLabel="Delete"
                onConfirm={handleDelete}
              >
                <Button className="cursor-pointer border border-destructive bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive shadow-xs hover:bg-destructive/20 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none">
                  Delete User
                </Button>
              </ConfirmDialog>
            </div>
          )}

          <div>
            <h3 className="mb-1 text-sm font-medium text-foreground">
              Active Sessions ({sessions.length})
            </h3>
            {sessions.length > 0 ?
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-2 py-1 font-medium">ID</th>
                      <th className="px-2 py-1 font-medium">Created</th>
                      {canManageSessions && (
                        <th className="px-2 py-1 font-medium" />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => (
                      <tr key={s.id} className="border-b border-border">
                        <td className="px-2 py-1">{s.id}</td>
                        <td className="px-2 py-1">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                        {canManageSessions && (
                          <td className="px-2 py-1">
                            <ConfirmDialog
                              title="Revoke Session"
                              description="Are you sure you want to revoke this session?"
                              confirmLabel="Revoke"
                              onConfirm={() => handleDeleteSession(s.id)}
                            >
                              <Button className="cursor-pointer text-xs text-destructive hover:underline">
                                Revoke
                              </Button>
                            </ConfirmDialog>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            : <p className="text-sm text-muted-foreground">
                No active sessions
              </p>
            }
          </div>
        </div>
      </div>
    );
  }
}
