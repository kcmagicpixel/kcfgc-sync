import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button, Input, Label, TextField, Checkbox } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { cn } from "../libs/utils/cn.util";
import { resizeImage } from "../libs/utils/resize-image.util";

const PROVIDERS = [
  { key: "bluesky", label: "Bluesky" },
  { key: "twitter", label: "Twitter" },
] as const;

export default function PostCreate() {
  const apiFetch = useApi();
  const navigate = useNavigate();
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(
    new Set(),
  );
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [runAfter, setRunAfter] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleProvider(provider: string) {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;
    setFiles(Array.from(selected).slice(0, 4));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedProviders.size === 0) {
      setError("Select at least one provider");
      return;
    }
    if (!text.trim()) {
      setError("Text content is required");
      return;
    }
    if (!key.trim()) {
      setError("Unique key is required");
      return;
    }

    setSubmitting(true);
    try {
      // Upload images first (resize if needed)
      const imageIds: number[] = [];
      for (const file of files) {
        const { base64, mimeType } = await resizeImage(file, 1_000_000, 2000);
        const res = await apiFetch("/api/posts/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: base64, mimeType }),
        });
        if (!res.ok) {
          setError("Failed to upload image");
          return;
        }
        const { id } = await res.json();
        imageIds.push(id);
      }

      // Create posts
      const res = await apiFetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providers: [...selectedProviders],
          text: text.trim(),
          key: key.trim(),
          imageIds,
          runAfter: new Date(runAfter).getTime(),
        }),
      });

      if (res.ok) {
        navigate("/posts");
      } else {
        setError("Failed to create post");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">New Post</h1>

      {error && (
        <p className="mb-4 border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">
            Providers
          </legend>
          <div className="flex gap-4">
            {PROVIDERS.map((p) => (
              <Checkbox
                key={p.key}
                isSelected={selectedProviders.has(p.key)}
                onChange={() => toggleProvider(p.key)}
                className="flex items-center gap-1.5 text-sm"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center border border-input",
                    selectedProviders.has(p.key) &&
                      "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {selectedProviders.has(p.key) && (
                    <span className="text-xs">✓</span>
                  )}
                </div>
                {p.label}
              </Checkbox>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            Text Content
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">
            {text.length} characters
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            Images (up to 4)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="text-sm text-foreground"
          />
          {files.length > 0 && (
            <div className="flex gap-2">
              {files.map((file, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="h-16 w-16 border border-border object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <TextField
          value={key}
          onChange={setKey}
          isRequired
          className="flex flex-col gap-1"
        >
          <Label className="text-sm font-medium text-foreground">
            Unique Key
          </Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">post-{"{provider}"}-</span>
            <Input className="flex-1 border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </TextField>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            Schedule
          </label>
          <input
            type="datetime-local"
            value={runAfter}
            onChange={(e) => setRunAfter(e.target.value)}
            required
            className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            isDisabled={submitting}
            className="cursor-pointer border border-foreground bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Post"}
          </Button>
          <Button
            onPress={() => navigate("/posts")}
            className="cursor-pointer border border-foreground bg-background px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
