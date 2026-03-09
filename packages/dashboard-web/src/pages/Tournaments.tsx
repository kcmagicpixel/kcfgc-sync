import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { cn } from "../libs/utils/cn.util";
import { Drawer } from "../components/Drawer";
import { useIsMobile } from "../libs/hooks/use-is-mobile.hook";

interface TournamentData {
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  url: string;
  address?: string;
  venueName?: string;
  description?: string;
  attendeeCount?: number;
  isPublished: boolean;
  isRegistrationOpen: boolean;
  images: { url: string; type: string }[];
  events: {
    name: string;
    entrantCount: number;
    startDate: string;
    isPublished: boolean;
    game: { name: string };
    standings?: {
      placement: number;
      player?: { name: string; prefix?: string };
      entrant?: { name: string };
    }[];
    brackets: { type: string; url: string }[];
  }[];
}

interface Tournament {
  key: string;
  data: TournamentData;
  updatedAt: number | null;
}

type SortDir = "desc" | "asc";

function FormattedView({ data }: { data: TournamentData }) {
  return (
    <div className="flex flex-col gap-4 p-3 text-sm">
      <div>
        <h2 className="text-lg font-bold">{data.name}</h2>
        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            {data.url}
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <span className="font-medium">Start:</span>{" "}
          {new Date(data.startDate).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </div>
        <div>
          <span className="font-medium">End:</span>{" "}
          {new Date(data.endDate).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </div>
        {data.venueName && (
          <div>
            <span className="font-medium">Venue:</span> {data.venueName}
          </div>
        )}
        {data.address && (
          <div>
            <span className="font-medium">Address:</span> {data.address}
          </div>
        )}
        {data.attendeeCount != null && (
          <div>
            <span className="font-medium">Attendees:</span> {data.attendeeCount}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <span
          className={cn(
            "inline-block border px-1.5 py-0.5 text-xs font-medium",
            data.isPublished ?
              "border-green-700 bg-green-100 text-green-800"
            : "border-muted-foreground bg-muted text-muted-foreground"
          )}
        >
          {data.isPublished ? "Published" : "Unpublished"}
        </span>
        <span
          className={cn(
            "inline-block border px-1.5 py-0.5 text-xs font-medium",
            data.isRegistrationOpen ?
              "border-blue-700 bg-blue-100 text-blue-800"
            : "border-muted-foreground bg-muted text-muted-foreground"
          )}
        >
          {data.isRegistrationOpen ?
            "Registration Open"
          : "Registration Closed"}
        </span>
      </div>

      {data.events.filter((e) => e.isPublished).length > 0 && (
        <div>
          <h3 className="mb-1 font-medium">
            Events ({data.events.filter((e) => e.isPublished).length})
          </h3>
          <div className="flex flex-col gap-2">
            {data.events
              .filter((e) => e.isPublished)
              .map((event, i) => (
                <div key={i} className="border border-border p-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium">{event.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {event.game.name}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.entrantCount} entrants
                    {" \u00B7 "}
                    {new Date(event.startDate).toLocaleDateString()}
                  </div>
                  {event.standings && event.standings.length > 0 && (
                    <div className="mt-1 text-xs">
                      {event.standings.map((s) => (
                        <div key={s.placement}>
                          #{s.placement}{" "}
                          {s.player ?
                            `${s.player.prefix ? `${s.player.prefix} | ` : ""}${s.player.name}`
                          : (s.entrant?.name ?? "Unknown")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {data.description && (
        <div>
          <h3 className="font-medium">Description</h3>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {data.description}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Tournaments() {
  const apiFetch = useApi();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/tournaments").then(async (res) => {
      if (!cancelled && res.ok) {
        setTournaments(await res.json());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const sorted = useMemo(() => {
    return [...tournaments].sort((a, b) => {
      const aDate = new Date(a.data.startDate).getTime();
      const bDate = new Date(b.data.startDate).getTime();
      return sortDir === "desc" ? bDate - aDate : aDate - bDate;
    });
  }, [tournaments, sortDir]);

  const selected = useMemo(
    () => tournaments.find((t) => t.key === selectedKey) ?? null,
    [tournaments, selectedKey]
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Tournaments</h1>

      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        <div className="flex w-full md:w-1/2 flex-col gap-2">
          <div className="flex-1 overflow-y-auto border border-foreground">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b-2 border-foreground text-left">
                  <th className="px-3 py-2 font-medium">Slug</th>
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
                  <th className="px-3 py-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => (
                  <tr
                    key={t.key}
                    onClick={() => setSelectedKey(t.key)}
                    className={cn(
                      "cursor-pointer border-b border-border hover:bg-accent",
                      selectedKey === t.key && "bg-accent"
                    )}
                  >
                    <td className="px-3 py-2">{t.key}</td>
                    <td className="px-3 py-2">
                      {new Date(t.data.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      {t.updatedAt ?
                        new Date(t.updatedAt).toLocaleString()
                      : "\u2014"}
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No tournaments found
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
                Select a tournament to view details
              </div>
            }
          </div>
        )}
      </div>

      {isMobile && (
        <Drawer open={selected != null} onClose={() => setSelectedKey(null)}>
          {selected && <DetailPane />}
        </Drawer>
      )}
    </div>
  );

  function DetailPane() {
    if (!selected) return null;
    return (
      <>
        <div className="flex flex-wrap gap-1">
          <Button
            onPress={() => setViewMode("formatted")}
            className={cn(
              "cursor-pointer border border-foreground px-2 py-1 text-xs font-medium",
              viewMode === "formatted" ?
                "bg-foreground text-background"
              : "bg-background text-foreground"
            )}
          >
            Formatted
          </Button>
          <Button
            onPress={() => setViewMode("raw")}
            className={cn(
              "cursor-pointer border border-foreground px-2 py-1 text-xs font-medium",
              viewMode === "raw" ?
                "bg-foreground text-background"
              : "bg-background text-foreground"
            )}
          >
            Raw JSON
          </Button>
          <Button
            onPress={async () => {
              const res = await apiFetch(
                `/api/tournaments/${selected.key}/draft-post`
              );
              if (res.ok) {
                navigate("/posts/new", { state: await res.json() });
              }
            }}
            className="ml-auto cursor-pointer border border-foreground bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
          >
            Draft Post
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto border border-input">
          {viewMode === "formatted" ?
            <FormattedView data={selected.data} />
          : <textarea
              readOnly
              value={JSON.stringify(selected.data, null, 2)}
              className="h-full min-h-64 w-full resize-none bg-background p-3 font-mono text-sm text-foreground outline-none"
            />
          }
        </div>
      </>
    );
  }
}
