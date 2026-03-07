import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { cn } from "../libs/utils/cn.util";

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

export default function Posts() {
  const apiFetch = useApi();
  const [items, setItems] = useState<PostListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deleting, setDeleting] = useState(false);

  function fetchPosts() {
    apiFetch("/api/posts").then(async (res) => {
      if (res.ok) {
        setItems(await res.json());
      }
    });
  }

  useEffect(() => {
    fetchPosts();
  }, [apiFetch]);

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

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.job.runAfter;
      const bDate = b.job.runAfter;
      return sortDir === "desc" ? bDate - aDate : aDate - bDate;
    });
  }, [items, sortDir]);

  const selected = useMemo(
    () => items.find((i) => i.job.id === selectedId) ?? null,
    [items, selectedId],
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
            to="/posts/new"
            className="border border-foreground bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
          >
            New Post
          </Link>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        {/* Left pane — table */}
        <div className="flex w-1/2 flex-col gap-2">
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
                      selectedId === item.job.id && "bg-accent",
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
                            "border-muted-foreground bg-muted text-muted-foreground",
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

        {/* Right pane — detail */}
        <div className="flex w-1/2 flex-col gap-2">
          {selected ? (
            <div className="min-h-0 flex-1 overflow-y-auto border border-input p-4">
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "inline-block border px-1.5 py-0.5 text-xs font-medium",
                      selected.job.payload.provider === "bluesky"
                        ? "border-blue-700 bg-blue-100 text-blue-800"
                        : "border-muted-foreground bg-muted text-muted-foreground",
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
                        "border-muted-foreground bg-muted text-muted-foreground",
                    )}
                  >
                    {selected.job.state}
                  </span>
                </div>

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
                    <span className="text-xs font-medium text-muted-foreground">Embed</span>
                    <span className="font-medium">{selected.job.payload.embed.title}</span>
                    {selected.job.payload.embed.description && (
                      <span className="text-muted-foreground">{selected.job.payload.embed.description}</span>
                    )}
                    <a
                      href={selected.job.payload.embed.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
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

                {selected.post && (
                  <div>
                    <span className="font-medium">Published:</span>{" "}
                    <a
                      href={selected.post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
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

                <Button
                  onPress={handleDelete}
                  isDisabled={deleting || selected.job.state === "running"}
                  className="cursor-pointer self-start border border-destructive bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive shadow-xs hover:bg-destructive/20 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete Post"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center border border-border text-muted-foreground">
              Select a post to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
