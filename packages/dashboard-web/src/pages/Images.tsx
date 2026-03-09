import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { cn } from "../libs/utils/cn.util";
import { Drawer } from "../components/Drawer";
import { useIsMobile } from "../libs/hooks/use-is-mobile.hook";

interface ImageItem {
  id: number;
  mimeType: string;
  createdAt: number;
  references: string[];
}

export default function Images() {
  const apiFetch = useApi();
  const isMobile = useIsMobile();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchImages = useCallback(() => {
    apiFetch("/api/posts/images").then(async (res) => {
      if (res.ok) {
        setImages(await res.json());
      }
    });
  }, [apiFetch]);

  useEffect(() => {
    fetchImages();
  }, [apiFetch, fetchImages]);

  const selected = useMemo(
    () => images.find((i) => i.id === selectedId) ?? null,
    [images, selectedId]
  );

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/posts/images/${selected.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedId(null);
        fetchImages();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Images</h1>
        <Link
          to="/posts"
          className="border border-foreground bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs hover:bg-accent"
        >
          Back to Posts
        </Link>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        <div className="flex w-full md:w-1/2 flex-col gap-2">
          <div className="flex-1 overflow-y-auto border border-foreground">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b-2 border-foreground text-left">
                  <th className="px-3 py-2 font-medium">ID</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {images.map((img) => (
                  <tr
                    key={img.id}
                    onClick={() => setSelectedId(img.id)}
                    className={cn(
                      "cursor-pointer border-b border-border hover:bg-accent",
                      selectedId === img.id && "bg-accent"
                    )}
                  >
                    <td className="px-3 py-2">{img.id}</td>
                    <td className="px-3 py-2">{img.mimeType}</td>
                    <td className="px-3 py-2">
                      {new Date(img.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {images.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No images found
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
                Select an image to view details
              </div>
            }
          </div>
        )}
      </div>

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
        <div className="flex flex-col gap-4 text-sm">
          <img
            src={`/api/posts/images/${selected.id}`}
            alt=""
            className="max-h-64 border border-border object-contain"
          />

          <div>
            <span className="font-medium">ID:</span> {selected.id}
          </div>
          <div>
            <span className="font-medium">Type:</span> {selected.mimeType}
          </div>
          <div>
            <span className="font-medium">Created:</span>{" "}
            {new Date(selected.createdAt).toLocaleString()}
          </div>

          <div>
            <span className="font-medium">Referenced by:</span>
            {selected.references.length > 0 ?
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {selected.references.map((ref) => (
                  <li key={ref}>{ref}</li>
                ))}
              </ul>
            : <span className="ml-1 text-muted-foreground">
                No references (orphaned)
              </span>
            }
          </div>

          <Button
            onPress={handleDelete}
            isDisabled={deleting}
            className="cursor-pointer self-start border border-destructive bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive shadow-xs hover:bg-destructive/20 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Image"}
          </Button>
        </div>
      </div>
    );
  }
}
