import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { cn } from "../libs/utils/cn.util";
import { MultiSelect } from "../components/MultiSelect";
import { Drawer } from "../components/Drawer";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useIsMobile } from "../libs/hooks/use-is-mobile.hook";
import {
  JOB_STATES,
  JOB_TYPE_KEYS,
  type JobState,
} from "../libs/config/job-types";

interface Job {
  id: number;
  type: string;
  state: JobState;
  runAfter: number;
  payload: unknown;
  output: unknown;
  createdAt: number;
  updatedAt: number;
}

type SortDir = "desc" | "asc";

export default function Jobs() {
  const apiFetch = useApi();
  const isMobile = useIsMobile();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [stateFilter, setStateFilter] = useState<Set<string>>(new Set());
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const refreshJobs = () => {
    apiFetch("/api/jobs").then(async (res) => {
      if (res.ok) setJobs(await res.json());
    });
  };

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/jobs").then(async (res) => {
      if (!cancelled && res.ok) {
        setJobs(await res.json());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const filtered = useMemo(() => {
    let result = jobs;
    if (typeFilter.size > 0)
      result = result.filter((j) => typeFilter.has(j.type));
    if (stateFilter.size > 0)
      result = result.filter((j) => stateFilter.has(j.state));
    result = [...result].sort((a, b) =>
      sortDir === "desc" ? b.runAfter - a.runAfter : a.runAfter - b.runAfter
    );
    return result;
  }, [jobs, typeFilter, stateFilter, sortDir]);

  const selected = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId]
  );

  const uniqueTypes = useMemo(() => {
    const fromJobs = jobs.map((j) => j.type);
    return [...new Set([...JOB_TYPE_KEYS, ...fromJobs])].sort();
  }, [jobs]);

  const detailContent = selected && (
    <>
      {selected.state === "pending" && (
        <ConfirmDialog
          title="Cancel Job"
          description="Are you sure you want to cancel this job?"
          confirmLabel="Cancel Job"
          variant="default"
          onConfirm={async () => {
            const res = await apiFetch(`/api/jobs/${selected.id}/cancel`, {
              method: "POST",
            });
            if (res.ok) refreshJobs();
          }}
        >
          <Button className="ml-auto cursor-pointer self-start border border-foreground bg-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none">
            Cancel Job
          </Button>
        </ConfirmDialog>
      )}
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-sm font-medium text-foreground">Payload</label>
        <textarea
          readOnly
          value={JSON.stringify(selected.payload, null, 2)}
          className="min-h-48 flex-1 resize-none border border-input bg-background p-3 font-mono text-sm text-foreground outline-none"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-sm font-medium text-foreground">Output</label>
        <textarea
          readOnly
          value={
            selected.output ? JSON.stringify(selected.output, null, 2) : ""
          }
          className="min-h-48 flex-1 resize-none border border-input bg-background p-3 font-mono text-sm text-foreground outline-none"
        />
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Link
          to="/jobs/new"
          className="border border-foreground bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
        >
          New Job
        </Link>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 10rem)" }}>
        {/* Left pane — table */}
        <div className="flex w-full md:w-1/2 flex-col gap-2">
          <div className="flex gap-2">
            <MultiSelect
              label="Type"
              options={uniqueTypes}
              selected={typeFilter}
              onChange={setTypeFilter}
              className="w-36"
            />
            <MultiSelect
              label="State"
              options={[...JOB_STATES]}
              selected={stateFilter}
              onChange={setStateFilter}
              className="w-36"
            />
          </div>

          <div className="flex-1 overflow-y-auto border border-foreground">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b-2 border-foreground text-left">
                  <th className="px-3 py-2 font-medium">Type</th>
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
                {filtered.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedId(job.id)}
                    className={cn(
                      "cursor-pointer border-b border-border hover:bg-accent",
                      selectedId === job.id && "bg-accent"
                    )}
                  >
                    <td className="px-3 py-2">{job.type}</td>
                    <td className="px-3 py-2">
                      {new Date(job.runAfter).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-block border px-1.5 py-0.5 text-xs font-medium",
                          job.state === "completed" &&
                            "border-green-700 bg-green-100 text-green-800",
                          job.state === "failed" &&
                            "border-red-700 bg-red-100 text-red-800",
                          job.state === "running" &&
                            "border-blue-700 bg-blue-100 text-blue-800",
                          job.state === "pending" &&
                            "border-muted-foreground bg-muted text-muted-foreground",
                          job.state === "cancelled" &&
                            "border-orange-700 bg-orange-100 text-orange-800"
                        )}
                      >
                        {job.state}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No jobs found
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
              detailContent
            : <div className="flex flex-1 items-center justify-center border border-border text-muted-foreground">
                Select a job to view details
              </div>
            }
          </div>
        )}
      </div>

      {/* Drawer — detail (mobile) */}
      {isMobile && (
        <Drawer open={selected != null} onClose={() => setSelectedId(null)}>
          <div className="flex flex-col gap-2">{detailContent}</div>
        </Drawer>
      )}
    </div>
  );
}
