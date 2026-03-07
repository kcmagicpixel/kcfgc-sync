export interface JobFieldConfig {
  name: string;
  label: string;
  type: "text" | "number";
  required?: boolean;
}

export interface JobTypeConfig {
  label: string;
  fields: JobFieldConfig[];
}

export const JOB_TYPES: Record<string, JobTypeConfig> = {
  hub: {
    label: "Hub",
    fields: [
      { name: "slug", label: "Hub Slug", type: "text", required: true },
      { name: "limit", label: "Limit", type: "number", required: true },
    ],
  },
  tournament: {
    label: "Tournament",
    fields: [
      {
        name: "slug",
        label: "Tournament Slug",
        type: "text",
        required: true,
      },
    ],
  },
};

export const JOB_TYPE_KEYS = Object.keys(JOB_TYPES);

export const JOB_STATES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const;
export type JobState = (typeof JOB_STATES)[number];
