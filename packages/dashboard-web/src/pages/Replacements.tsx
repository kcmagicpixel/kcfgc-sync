import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Input, Label, TextField } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { cn } from "../libs/utils/cn.util";
import { Drawer } from "../components/Drawer";
import { useIsMobile } from "../libs/hooks/use-is-mobile.hook";

interface ProviderInfo {
  name: string;
  enabled: boolean;
}

interface Replacement {
  id: number;
  input: string;
  output: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

type Mode = "view" | "edit" | "create";

export default function Replacements() {
  const apiFetch = useApi();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<Replacement[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formInput, setFormInput] = useState("");
  const [formOutput, setFormOutput] = useState<Record<string, string>>({});

  const fetchItems = useCallback(() => {
    apiFetch("/api/replacements").then(async (res) => {
      if (res.ok) setItems(await res.json());
    });
  }, [apiFetch]);

  useEffect(() => {
    fetchItems();
    apiFetch("/api/posts/providers").then(async (res) => {
      if (res.ok) setProviders(await res.json());
    });
  }, [apiFetch, fetchItems]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  function startCreate() {
    setSelectedId(null);
    setFormInput("");
    setFormOutput({});
    setMode("create");
  }

  function startEdit() {
    if (!selected) return;
    setFormInput(selected.input);
    setFormOutput({ ...selected.output });
    setMode("edit");
  }

  function cancelForm() {
    setMode("view");
  }

  async function handleSave() {
    const input = formInput.trim();
    if (!input) return;

    // Filter out empty output values
    const output: Record<string, string> = {};
    for (const [k, v] of Object.entries(formOutput)) {
      if (v.trim()) output[k] = v.trim();
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await apiFetch("/api/replacements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, output }),
        });
        if (res.ok) {
          const { id } = await res.json();
          setSelectedId(id);
          setMode("view");
          fetchItems();
        }
      } else if (mode === "edit" && selected) {
        const res = await apiFetch(`/api/replacements/${selected.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, output }),
        });
        if (res.ok) {
          setMode("view");
          fetchItems();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/replacements/${selected.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedId(null);
        setMode("view");
        fetchItems();
      }
    } finally {
      setDeleting(false);
    }
  }

  const providerNames = providers.map((p) => p.name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Replacements</h1>
        <div className="flex gap-2">
          <Link
            to="/posts"
            className="border border-foreground bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs hover:bg-accent"
          >
            Back to Posts
          </Link>
          <Button
            onPress={startCreate}
            className="cursor-pointer border border-foreground bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
          >
            New Replacement
          </Button>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        <div className="flex w-full md:w-1/2 flex-col gap-2">
          <div className="flex-1 overflow-y-auto border border-foreground">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b-2 border-foreground text-left">
                  <th className="px-3 py-2 font-medium">Input</th>
                  <th className="px-3 py-2 font-medium">Providers</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setMode("view");
                    }}
                    className={cn(
                      "cursor-pointer border-b border-border hover:bg-accent",
                      selectedId === item.id && mode === "view" && "bg-accent"
                    )}
                  >
                    <td className="px-3 py-2 font-mono">{item.input}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {Object.keys(item.output).join(", ")}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No replacements configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right pane — detail / form (desktop) */}
        {!isMobile && (
          <div className="flex w-1/2 flex-col gap-2">
            <DetailPane />
          </div>
        )}
      </div>

      {/* Drawer — detail / form (mobile) */}
      {isMobile && (
        <Drawer
          open={
            (mode === "view" && selected != null) ||
            mode === "create" ||
            mode === "edit"
          }
          onClose={() => {
            setSelectedId(null);
            setMode("view");
          }}
        >
          <DetailPane />
        </Drawer>
      )}
    </div>
  );

  function DetailPane() {
    if (mode === "view" && selected) {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto border border-input p-4 md:border">
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <span className="font-medium">Input:</span>{" "}
              <code className="bg-muted px-1 py-0.5">{selected.input}</code>
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-medium">Output per provider:</span>
              {providerNames.map((name) => (
                <div key={name} className="flex gap-2">
                  <span className="w-20 text-muted-foreground">{name}:</span>
                  <span className="font-mono">
                    {selected.output[name] ?? (
                      <span className="text-muted-foreground italic">
                        (no replacement)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div>
              <span className="font-medium">Created:</span>{" "}
              {new Date(selected.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span>{" "}
              {new Date(selected.updatedAt).toLocaleString()}
            </div>

            <div className="flex gap-2">
              <Button
                onPress={startEdit}
                className="cursor-pointer border border-foreground bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
              >
                Edit
              </Button>
              <Button
                onPress={handleDelete}
                isDisabled={deleting}
                className="cursor-pointer border border-destructive bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive shadow-xs hover:bg-destructive/20 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (mode === "create" || mode === "edit") {
      return (
        <div className="min-h-0 flex-1 overflow-y-auto border border-input p-4 md:border">
          <div className="flex flex-col gap-4 text-sm">
            <h2 className="font-medium">
              {mode === "create" ? "New Replacement" : "Edit Replacement"}
            </h2>

            <TextField
              value={formInput}
              onChange={setFormInput}
              isRequired
              className="flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-foreground">
                Input string
              </Label>
              <Input className="border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
            </TextField>

            {providerNames.map((name) => (
              <TextField
                key={name}
                value={formOutput[name] ?? ""}
                onChange={(v) =>
                  setFormOutput((prev) => ({ ...prev, [name]: v }))
                }
                className="flex flex-col gap-1"
              >
                <Label className="text-sm font-medium text-foreground">
                  {name}
                </Label>
                <Input className="border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
              </TextField>
            ))}

            <p className="text-xs text-muted-foreground">
              Leave a provider field blank to skip replacement for that
              provider.
            </p>

            <div className="flex gap-2">
              <Button
                onPress={handleSave}
                isDisabled={saving || !formInput.trim()}
                className="cursor-pointer border border-foreground bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                onPress={cancelForm}
                className="cursor-pointer border border-foreground bg-background px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-1 items-center justify-center border border-border text-muted-foreground">
        Select a replacement to view details
      </div>
    );
  }
}
