import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button, Input, Label, TextField, Checkbox } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { cn } from "../libs/utils/cn.util";
import { resizeImage } from "../libs/utils/resize-image.util";

interface ProviderInfo {
  name: string;
  enabled: boolean;
}

type AttachmentMode = "none" | "images" | "embed";

export default function PostCreate() {
  const apiFetch = useApi();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
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
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>("none");
  const [files, setFiles] = useState<File[]>([]);
  const [embedUrl, setEmbedUrl] = useState("");
  const [embedTitle, setEmbedTitle] = useState("");
  const [embedDescription, setEmbedDescription] = useState("");
  const [embedImage, setEmbedImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch("/api/posts/providers").then(async (res) => {
      if (res.ok) setProviders(await res.json());
    });
  }, [apiFetch]);

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

  function handleEmbedImage(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) {
      setEmbedImage(null);
      return;
    }
    setEmbedImage(selected[0]);
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
    if (attachmentMode === "embed" && !embedUrl.trim()) {
      setError("Embed URL is required");
      return;
    }
    if (attachmentMode === "embed" && !embedTitle.trim()) {
      setError("Embed title is required");
      return;
    }

    setSubmitting(true);
    try {
      let imageIds: number[] = [];
      let embed: { url: string; title: string; description?: string; imageId?: number } | undefined;

      if (attachmentMode === "images") {
        // Upload images
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
      } else if (attachmentMode === "embed") {
        embed = {
          url: embedUrl.trim(),
          title: embedTitle.trim(),
          description: embedDescription.trim() || undefined,
        };
        // Upload embed thumbnail if present
        if (embedImage) {
          const { base64, mimeType } = await resizeImage(embedImage, 1_000_000, 2000);
          const res = await apiFetch("/api/posts/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: base64, mimeType }),
          });
          if (!res.ok) {
            setError("Failed to upload embed image");
            return;
          }
          const { id } = await res.json();
          embed.imageId = id;
        }
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
          ...(embed ? { embed } : {}),
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
            {providers.map((p) => (
              <Checkbox
                key={p.name}
                isSelected={selectedProviders.has(p.name)}
                isDisabled={!p.enabled}
                onChange={() => toggleProvider(p.name)}
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  !p.enabled && "opacity-50",
                )}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center border border-input",
                    selectedProviders.has(p.name) &&
                      "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {selectedProviders.has(p.name) && (
                    <span className="text-xs">✓</span>
                  )}
                </div>
                {p.name}
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

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">
            Attachment
          </legend>
          <div className="flex gap-4">
            {(["none", "images", "embed"] as const).map((mode) => (
              <label key={mode} className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="attachmentMode"
                  value={mode}
                  checked={attachmentMode === mode}
                  onChange={() => setAttachmentMode(mode)}
                  className="accent-primary"
                />
                {mode === "none" ? "None" : mode === "images" ? "Images" : "Embed"}
              </label>
            ))}
          </div>
        </fieldset>

        {attachmentMode === "images" && (
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
        )}

        {attachmentMode === "embed" && (
          <div className="flex flex-col gap-3 border border-border p-3">
            <TextField
              value={embedUrl}
              onChange={setEmbedUrl}
              isRequired
              className="flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-foreground">URL</Label>
              <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
            </TextField>

            <TextField
              value={embedTitle}
              onChange={setEmbedTitle}
              isRequired
              className="flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-foreground">Title</Label>
              <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
            </TextField>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">
                Description (optional)
              </label>
              <textarea
                value={embedDescription}
                onChange={(e) => setEmbedDescription(e.target.value)}
                rows={2}
                className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">
                Thumbnail (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleEmbedImage}
                className="text-sm text-foreground"
              />
              {embedImage && (
                <img
                  src={URL.createObjectURL(embedImage)}
                  alt=""
                  className="h-16 w-16 border border-border object-cover"
                />
              )}
            </div>
          </div>
        )}

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
