import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Input, Label, TextField } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { cn } from "../libs/utils/cn.util";
import { resizeImage } from "../libs/utils/resize-image.util";
import { Drawer } from "../components/Drawer";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useIsMobile } from "../libs/hooks/use-is-mobile.hook";

interface PostPayload {
  provider: string;
  text: string;
  uniqueKey: string;
  imageIds?: number[];
  embed?: {
    url: string;
    title: string;
    description?: string;
    imageId?: number;
  };
}

interface PostJob {
  id: number;
  type: string;
  state: "pending" | "running" | "completed" | "failed";
  runAfter: number;
  uniqueKey: string | null;
  payload: PostPayload;
  output: unknown;
  createdAt: number;
  updatedAt: number;
}

interface PostRecord {
  uniqueKey: string;
  provider: string;
  url: string;
}

interface PostListItem {
  job: PostJob;
  post: PostRecord | null;
}

type SortDir = "desc" | "asc";
type AttachmentMode = "none" | "images" | "embed";

interface PostEditData {
  text: string;
  runAfter: string;
  attachmentMode: AttachmentMode;
  imageIds: number[];
  newFiles: File[];
  embedUrl: string;
  embedTitle: string;
  embedDescription: string;
  embedImage: File | null;
  embedImageId: number | null;
}

interface PostDetailPaneProps {
  selected: PostListItem;
  editing: boolean;
  deleting: boolean;
  saving: boolean;
  saveError: string | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: PostEditData) => void;
  onDelete: () => void | Promise<void>;
}

function PostDetailPane({
  selected,
  editing,
  deleting,
  saving,
  saveError,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: PostDetailPaneProps) {
  const p = selected.job.payload;
  const initRunAfter = () => {
    const d = new Date(selected.job.runAfter);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };
  const [text, setText] = useState(p.text);
  const [runAfter, setRunAfter] = useState(initRunAfter);
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>(
    p.embed ? "embed"
    : p.imageIds && p.imageIds.length > 0 ? "images"
    : "none"
  );
  const [imageIds, setImageIds] = useState<number[]>(
    p.imageIds && p.imageIds.length > 0 ? [...p.imageIds] : []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [embedUrl, setEmbedUrl] = useState(p.embed?.url ?? "");
  const [embedTitle, setEmbedTitle] = useState(p.embed?.title ?? "");
  const [embedDescription, setEmbedDescription] = useState(
    p.embed?.description ?? ""
  );
  const [embedImage, setEmbedImage] = useState<File | null>(null);
  const [embedImageId, setEmbedImageId] = useState<number | null>(
    p.embed?.imageId ?? null
  );

  function handleSave() {
    onSave({
      text,
      runAfter,
      attachmentMode,
      imageIds,
      newFiles,
      embedUrl,
      embedTitle,
      embedDescription,
      embedImage,
      embedImageId,
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto border border-input p-4 md:border">
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "inline-block border px-1.5 py-0.5 text-xs font-medium",
              selected.job.payload.provider === "bluesky" ?
                "border-blue-700 bg-blue-100 text-blue-800"
              : "border-muted-foreground bg-muted text-muted-foreground"
            )}
          >
            {selected.job.payload.provider}
          </span>
          <span
            className={cn(
              "inline-block border px-1.5 py-0.5 text-xs font-medium",
              selected.job.state === "completed" &&
                "border-green-700 bg-green-100 text-green-800",
              selected.job.state === "failed" &&
                "border-red-700 bg-red-100 text-red-800",
              selected.job.state === "running" &&
                "border-blue-700 bg-blue-100 text-blue-800",
              selected.job.state === "pending" &&
                "border-muted-foreground bg-muted text-muted-foreground"
            )}
          >
            {selected.job.state}
          </span>
        </div>

        {editing ?
          <>
            {saveError && (
              <p className="border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {saveError}
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">
                Unique Key
              </label>
              <span className="text-sm text-muted-foreground">
                {selected.job.uniqueKey}
              </span>
            </div>

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
                  <label
                    key={mode}
                    className="flex items-center gap-1.5 text-sm"
                  >
                    <input
                      type="radio"
                      name="editAttachmentMode"
                      value={mode}
                      checked={attachmentMode === mode}
                      onChange={() => setAttachmentMode(mode)}
                      className="accent-primary"
                    />
                    {mode === "none" ?
                      "None"
                    : mode === "images" ?
                      "Images"
                    : "Embed"}
                  </label>
                ))}
              </div>
            </fieldset>

            {attachmentMode === "images" && (
              <div className="flex flex-col gap-2">
                {imageIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imageIds.map((id) => (
                      <div key={id} className="relative">
                        <img
                          src={`/api/posts/images/${id}`}
                          alt=""
                          className="h-16 w-16 border border-border object-cover"
                        />
                        <Button
                          onPress={() =>
                            setImageIds((ids) => ids.filter((i) => i !== id))
                          }
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center border border-destructive bg-destructive text-xs text-white"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {imageIds.length + newFiles.length < 4 && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-foreground">
                      Add Images (up to {4 - imageIds.length - newFiles.length})
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files) return;
                        const max = 4 - imageIds.length - newFiles.length;
                        setNewFiles((prev) => [
                          ...prev,
                          ...Array.from(files).slice(0, max),
                        ]);
                      }}
                      className="text-sm text-foreground"
                    />
                  </div>
                )}
                {newFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newFiles.map((file, i) => (
                      <div key={i} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt=""
                          className="h-16 w-16 border border-border object-cover"
                        />
                        <Button
                          onPress={() =>
                            setNewFiles((files) =>
                              files.filter((_, j) => j !== i)
                            )
                          }
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center border border-destructive bg-destructive text-xs text-white"
                        >
                          ×
                        </Button>
                      </div>
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
                  <Label className="text-sm font-medium text-foreground">
                    URL
                  </Label>
                  <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                </TextField>

                <TextField
                  value={embedTitle}
                  onChange={setEmbedTitle}
                  isRequired
                  className="flex flex-col gap-1"
                >
                  <Label className="text-sm font-medium text-foreground">
                    Title
                  </Label>
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
                  {embedImageId != null && !embedImage && (
                    <div className="relative inline-block">
                      <img
                        src={`/api/posts/images/${embedImageId}`}
                        alt=""
                        className="h-16 w-16 border border-border object-cover"
                      />
                      <Button
                        onPress={() => setEmbedImageId(null)}
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center border border-destructive bg-destructive text-xs text-white"
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  {embedImageId == null && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) {
                          setEmbedImage(null);
                          return;
                        }
                        setEmbedImage(files[0]);
                      }}
                      className="text-sm text-foreground"
                    />
                  )}
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

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">
                Schedule
              </label>
              <input
                type="datetime-local"
                value={runAfter}
                onChange={(e) => setRunAfter(e.target.value)}
                className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onPress={handleSave}
                isDisabled={saving || !text.trim()}
                className="cursor-pointer border border-foreground bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                onPress={onCancelEdit}
                className="cursor-pointer border border-foreground bg-background px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
              >
                Cancel
              </Button>
            </div>
          </>
        : <>
            <p className="whitespace-pre-wrap">{selected.job.payload.text}</p>

            {selected.job.payload.imageIds &&
              selected.job.payload.imageIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.job.payload.imageIds.map((id) => (
                    <img
                      key={id}
                      src={`/api/posts/images/${id}`}
                      alt=""
                      className="h-32 w-32 border border-border object-cover"
                    />
                  ))}
                </div>
              )}

            {selected.job.payload.embed && (
              <div className="flex flex-col gap-1 border border-border p-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Embed
                </span>
                <span className="font-medium">
                  {selected.job.payload.embed.title}
                </span>
                {selected.job.payload.embed.description && (
                  <span className="text-muted-foreground">
                    {selected.job.payload.embed.description}
                  </span>
                )}
                <a
                  href={selected.job.payload.embed.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline break-all"
                >
                  {selected.job.payload.embed.url}
                </a>
                {selected.job.payload.embed.imageId != null && (
                  <img
                    src={`/api/posts/images/${selected.job.payload.embed.imageId}`}
                    alt=""
                    className="mt-1 h-32 w-32 border border-border object-cover"
                  />
                )}
              </div>
            )}

            <div>
              <span className="font-medium">Scheduled:</span>{" "}
              {new Date(selected.job.runAfter).toLocaleString()}
            </div>

            {selected.post && (
              <div>
                <span className="font-medium">Published:</span>{" "}
                <a
                  href={selected.post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline break-all"
                >
                  {selected.post.url}
                </a>
              </div>
            )}

            {selected.job.state === "failed" && !!selected.job.output && (
              <div>
                <span className="font-medium text-red-800">Error:</span>
                <pre className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                  {JSON.stringify(selected.job.output, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {selected.job.state === "pending" && (
                <Button
                  onPress={onStartEdit}
                  className="cursor-pointer border border-foreground bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
                >
                  Edit
                </Button>
              )}
              <ConfirmDialog
                title="Delete Post"
                description="Are you sure you want to delete this post?"
                confirmLabel="Delete"
                onConfirm={onDelete}
              >
                <Button
                  isDisabled={deleting || selected.job.state === "running"}
                  className="cursor-pointer border border-destructive bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive shadow-xs hover:bg-destructive/20 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Post"}
                </Button>
              </ConfirmDialog>
            </div>
          </>
        }
      </div>
    </div>
  );
}

export default function Posts() {
  const apiFetch = useApi();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<PostListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchPosts = useCallback(() => {
    apiFetch("/api/posts").then(async (res) => {
      if (res.ok) {
        setItems(await res.json());
      }
    });
  }, [apiFetch]);

  useEffect(() => {
    fetchPosts();
  }, [apiFetch, fetchPosts]);

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/posts/${selected.job.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedId(null);
        fetchPosts();
      }
    } finally {
      setDeleting(false);
    }
  }

  function startEdit() {
    if (!selected || selected.job.state !== "pending") return;
    setEditError(null);
    setEditing(true);
  }

  async function handleSave(data: PostEditData) {
    if (!selected) return;
    setEditError(null);

    if (!data.text.trim()) {
      setEditError("Text content is required");
      return;
    }
    if (data.attachmentMode === "embed" && !data.embedUrl.trim()) {
      setEditError("Embed URL is required");
      return;
    }
    if (data.attachmentMode === "embed" && !data.embedTitle.trim()) {
      setEditError("Embed title is required");
      return;
    }

    setSaving(true);
    try {
      let imageIds: number[] = [];
      let embed:
        | { url: string; title: string; description?: string; imageId?: number }
        | undefined;

      if (data.attachmentMode === "images") {
        imageIds = [...data.imageIds];
        for (const file of data.newFiles) {
          const { base64, mimeType } = await resizeImage(file, 1_000_000, 2000);
          const res = await apiFetch("/api/posts/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: base64, mimeType }),
          });
          if (!res.ok) {
            setEditError("Failed to upload image");
            return;
          }
          const { id } = await res.json();
          imageIds.push(id);
        }
      } else if (data.attachmentMode === "embed") {
        embed = {
          url: data.embedUrl.trim(),
          title: data.embedTitle.trim(),
          description: data.embedDescription.trim() || undefined,
        };
        if (data.embedImage) {
          const { base64, mimeType } = await resizeImage(
            data.embedImage,
            1_000_000,
            2000
          );
          const res = await apiFetch("/api/posts/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: base64, mimeType }),
          });
          if (!res.ok) {
            setEditError("Failed to upload embed image");
            return;
          }
          const { id } = await res.json();
          embed.imageId = id;
        } else if (data.embedImageId != null) {
          embed.imageId = data.embedImageId;
        }
      }

      const res = await apiFetch(`/api/posts/${selected.job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.text.trim(),
          runAfter: new Date(data.runAfter).getTime(),
          imageIds,
          ...(embed ? { embed } : {}),
        }),
      });
      if (res.ok) {
        setEditing(false);
        fetchPosts();
      }
    } finally {
      setSaving(false);
    }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.job.runAfter;
      const bDate = b.job.runAfter;
      return sortDir === "desc" ? bDate - aDate : aDate - bDate;
    });
  }, [items, sortDir]);

  const selected = useMemo(
    () => items.find((i) => i.job.id === selectedId) ?? null,
    [items, selectedId]
  );

  const paneContent =
    selected ?
      <PostDetailPane
        key={editing ? `edit-${selected.job.id}` : selected.job.id}
        selected={selected}
        editing={editing}
        deleting={deleting}
        saving={saving}
        saveError={editError}
        onStartEdit={startEdit}
        onCancelEdit={() => setEditing(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    : <div className="flex flex-1 items-center justify-center border border-border text-muted-foreground">
        Select a post to view details
      </div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <div className="flex gap-2">
          <Link
            to="/posts/images"
            className="border border-foreground bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs hover:bg-accent"
          >
            Images
          </Link>
          <Link
            to="/posts/replacements"
            className="border border-foreground bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs hover:bg-accent"
          >
            Replacements
          </Link>
          <Link
            to="/posts/new"
            className="border border-foreground bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
          >
            New Post
          </Link>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        <div className="flex w-full md:w-1/2 flex-col gap-2">
          <div className="flex-1 overflow-y-auto border border-foreground">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b-2 border-foreground text-left">
                  <th className="px-3 py-2 font-medium">Key</th>
                  <th className="px-3 py-2 font-medium">
                    <Button
                      onPress={() =>
                        setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                      }
                      className="cursor-pointer font-medium"
                    >
                      Date {sortDir === "desc" ? "\u25BC" : "\u25B2"}
                    </Button>
                  </th>
                  <th className="px-3 py-2 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr
                    key={item.job.id}
                    onClick={() => setSelectedId(item.job.id)}
                    className={cn(
                      "cursor-pointer border-b border-border hover:bg-accent",
                      selectedId === item.job.id && "bg-accent"
                    )}
                  >
                    <td className="px-3 py-2">{item.job.uniqueKey}</td>
                    <td className="px-3 py-2">
                      {new Date(item.job.runAfter).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-block border px-1.5 py-0.5 text-xs font-medium",
                          item.job.state === "completed" &&
                            "border-green-700 bg-green-100 text-green-800",
                          item.job.state === "failed" &&
                            "border-red-700 bg-red-100 text-red-800",
                          item.job.state === "running" &&
                            "border-blue-700 bg-blue-100 text-blue-800",
                          item.job.state === "pending" &&
                            "border-muted-foreground bg-muted text-muted-foreground"
                        )}
                      >
                        {item.job.state}
                      </span>
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No posts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isMobile && (
          <div className="flex w-1/2 flex-col gap-2">{paneContent}</div>
        )}
      </div>

      {isMobile && (
        <Drawer
          open={selected != null}
          onClose={() => {
            setSelectedId(null);
            setEditing(false);
          }}
        >
          {paneContent}
        </Drawer>
      )}
    </div>
  );
}
