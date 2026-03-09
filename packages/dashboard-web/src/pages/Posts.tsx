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

export default function Posts() {
  const apiFetch = useApi();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<PostListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editText, setEditText] = useState("");
  const [editRunAfter, setEditRunAfter] = useState("");
  const [editAttachmentMode, setEditAttachmentMode] =
    useState<AttachmentMode>("none");
  const [editImageIds, setEditImageIds] = useState<number[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<File[]>([]);
  const [editEmbedUrl, setEditEmbedUrl] = useState("");
  const [editEmbedTitle, setEditEmbedTitle] = useState("");
  const [editEmbedDescription, setEditEmbedDescription] = useState("");
  const [editEmbedImage, setEditEmbedImage] = useState<File | null>(null);
  const [editEmbedImageId, setEditEmbedImageId] = useState<number | null>(null);
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
    const p = selected.job.payload;
    setEditText(p.text);
    const d = new Date(selected.job.runAfter);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setEditRunAfter(d.toISOString().slice(0, 16));
    setEditError(null);
    setEditNewFiles([]);
    setEditEmbedImage(null);
    if (p.embed) {
      setEditAttachmentMode("embed");
      setEditImageIds([]);
      setEditEmbedUrl(p.embed.url);
      setEditEmbedTitle(p.embed.title);
      setEditEmbedDescription(p.embed.description ?? "");
      setEditEmbedImageId(p.embed.imageId ?? null);
    } else if (p.imageIds && p.imageIds.length > 0) {
      setEditAttachmentMode("images");
      setEditImageIds([...p.imageIds]);
      setEditEmbedUrl("");
      setEditEmbedTitle("");
      setEditEmbedDescription("");
      setEditEmbedImageId(null);
    } else {
      setEditAttachmentMode("none");
      setEditImageIds([]);
      setEditEmbedUrl("");
      setEditEmbedTitle("");
      setEditEmbedDescription("");
      setEditEmbedImageId(null);
    }
    setEditing(true);
  }

  async function handleSave() {
    if (!selected) return;
    setEditError(null);

    if (!editText.trim()) {
      setEditError("Text content is required");
      return;
    }
    if (editAttachmentMode === "embed" && !editEmbedUrl.trim()) {
      setEditError("Embed URL is required");
      return;
    }
    if (editAttachmentMode === "embed" && !editEmbedTitle.trim()) {
      setEditError("Embed title is required");
      return;
    }

    setSaving(true);
    try {
      let imageIds: number[] = [];
      let embed:
        | { url: string; title: string; description?: string; imageId?: number }
        | undefined;

      if (editAttachmentMode === "images") {
        imageIds = [...editImageIds];
        for (const file of editNewFiles) {
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
      } else if (editAttachmentMode === "embed") {
        embed = {
          url: editEmbedUrl.trim(),
          title: editEmbedTitle.trim(),
          description: editEmbedDescription.trim() || undefined,
        };
        if (editEmbedImage) {
          const { base64, mimeType } = await resizeImage(
            editEmbedImage,
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
        } else if (editEmbedImageId != null) {
          embed.imageId = editEmbedImageId;
        }
      }

      const res = await apiFetch(`/api/posts/${selected.job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editText.trim(),
          runAfter: new Date(editRunAfter).getTime(),
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
          <div className="flex w-1/2 flex-col gap-2">
            {selected ?
              <DetailPane />
            : <div className="flex flex-1 items-center justify-center border border-border text-muted-foreground">
                Select a post to view details
              </div>
            }
          </div>
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
          {selected && <DetailPane />}
        </Drawer>
      )}
    </div>
  );

  function DetailPane() {
    if (!selected) return null;
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
              {editError && (
                <p className="border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {editError}
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
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={5}
                  className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">
                  {editText.length} characters
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
                        checked={editAttachmentMode === mode}
                        onChange={() => setEditAttachmentMode(mode)}
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

              {editAttachmentMode === "images" && (
                <div className="flex flex-col gap-2">
                  {editImageIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editImageIds.map((id) => (
                        <div key={id} className="relative">
                          <img
                            src={`/api/posts/images/${id}`}
                            alt=""
                            className="h-16 w-16 border border-border object-cover"
                          />
                          <Button
                            onPress={() =>
                              setEditImageIds((ids) =>
                                ids.filter((i) => i !== id)
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
                  {editImageIds.length + editNewFiles.length < 4 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-foreground">
                        Add Images (up to{" "}
                        {4 - editImageIds.length - editNewFiles.length})
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const selected = e.target.files;
                          if (!selected) return;
                          const max =
                            4 - editImageIds.length - editNewFiles.length;
                          setEditNewFiles((prev) => [
                            ...prev,
                            ...Array.from(selected).slice(0, max),
                          ]);
                        }}
                        className="text-sm text-foreground"
                      />
                    </div>
                  )}
                  {editNewFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {editNewFiles.map((file, i) => (
                        <div key={i} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="h-16 w-16 border border-border object-cover"
                          />
                          <Button
                            onPress={() =>
                              setEditNewFiles((files) =>
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

              {editAttachmentMode === "embed" && (
                <div className="flex flex-col gap-3 border border-border p-3">
                  <TextField
                    value={editEmbedUrl}
                    onChange={setEditEmbedUrl}
                    isRequired
                    className="flex flex-col gap-1"
                  >
                    <Label className="text-sm font-medium text-foreground">
                      URL
                    </Label>
                    <Input className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                  </TextField>

                  <TextField
                    value={editEmbedTitle}
                    onChange={setEditEmbedTitle}
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
                      value={editEmbedDescription}
                      onChange={(e) => setEditEmbedDescription(e.target.value)}
                      rows={2}
                      className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-foreground">
                      Thumbnail (optional)
                    </label>
                    {editEmbedImageId != null && !editEmbedImage && (
                      <div className="relative inline-block">
                        <img
                          src={`/api/posts/images/${editEmbedImageId}`}
                          alt=""
                          className="h-16 w-16 border border-border object-cover"
                        />
                        <Button
                          onPress={() => setEditEmbedImageId(null)}
                          className="absolute -top-1.5 -right-1.5 flex h-5 w-5 cursor-pointer items-center justify-center border border-destructive bg-destructive text-xs text-white"
                        >
                          ×
                        </Button>
                      </div>
                    )}
                    {editEmbedImageId == null && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) {
                            setEditEmbedImage(null);
                            return;
                          }
                          setEditEmbedImage(files[0]);
                        }}
                        className="text-sm text-foreground"
                      />
                    )}
                    {editEmbedImage && (
                      <img
                        src={URL.createObjectURL(editEmbedImage)}
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
                  value={editRunAfter}
                  onChange={(e) => setEditRunAfter(e.target.value)}
                  className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onPress={handleSave}
                  isDisabled={saving || !editText.trim()}
                  className="cursor-pointer border border-foreground bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  onPress={() => setEditing(false)}
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
                    onPress={startEdit}
                    className="cursor-pointer border border-foreground bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
                  >
                    Edit
                  </Button>
                )}
                <ConfirmDialog
                  title="Delete Post"
                  description="Are you sure you want to delete this post?"
                  confirmLabel="Delete"
                  onConfirm={handleDelete}
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
}
