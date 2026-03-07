import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Button, Input, Label, TextField } from "react-aria-components";
import { useApi } from "../libs/hooks/use-api.hook";
import { JOB_TYPES, JOB_TYPE_KEYS } from "../libs/config/job-types";

export default function JobCreate() {
  const apiFetch = useApi();
  const navigate = useNavigate();
  const [jobType, setJobType] = useState(JOB_TYPE_KEYS[0]);
  const [schedule, setSchedule] = useState<"once" | "recurring">("once");
  const [cron, setCron] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const config = JOB_TYPES[jobType];

  function handleTypeChange(type: string) {
    setJobType(type);
    setFieldValues({});
  }

  function setField(name: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = fieldValues[field.name] ?? "";
      if (field.required && !raw) {
        setError(`${field.label} is required`);
        return;
      }
      payload[field.name] = field.type === "number" ? Number(raw) : raw;
    }

    let jobSchedule: string | undefined;
    if (schedule === "recurring") {
      if (!cron.trim()) {
        setError("Cron expression is required for recurring jobs");
        return;
      }
      jobSchedule = cron.trim();
    }

    const res = await apiFetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: jobType,
        payload,
        schedule: jobSchedule,
      }),
    });

    if (res.ok) {
      navigate("/jobs");
    } else {
      setError("Failed to create job");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">New Job</h1>

      {error && (
        <p className="mb-4 border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            Job Type
          </label>
          <select
            value={jobType}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="border border-input bg-background px-3 py-2 text-sm text-foreground"
          >
            {JOB_TYPE_KEYS.map((key) => (
              <option key={key} value={key}>
                {JOB_TYPES[key].label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-foreground">
            Schedule
          </legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="schedule"
                value="once"
                checked={schedule === "once"}
                onChange={() => setSchedule("once")}
              />
              Run once
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="schedule"
                value="recurring"
                checked={schedule === "recurring"}
                onChange={() => setSchedule("recurring")}
              />
              Recurring
            </label>
          </div>
          {schedule === "recurring" && (
            <TextField
              value={cron}
              onChange={setCron}
              className="flex flex-col gap-1"
            >
              <Label className="text-sm font-medium text-foreground">
                Cron Expression
              </Label>
              <Input
                placeholder="0 */6 * * *"
                className="border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </TextField>
          )}
        </fieldset>

        {config.fields.map((field) => (
          <TextField
            key={field.name}
            value={fieldValues[field.name] ?? ""}
            onChange={(v) => setField(field.name, v)}
            isRequired={field.required}
            className="flex flex-col gap-1"
          >
            <Label className="text-sm font-medium text-foreground">
              {field.label}
            </Label>
            <Input
              type={field.type === "number" ? "number" : "text"}
              className="border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </TextField>
        ))}

        <div className="flex gap-2">
          <Button
            type="submit"
            className="cursor-pointer border border-foreground bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
          >
            Create Job
          </Button>
          <Button
            onPress={() => navigate("/jobs")}
            className="cursor-pointer border border-foreground bg-background px-4 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-accent pressed:translate-x-px pressed:translate-y-px pressed:shadow-none"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
