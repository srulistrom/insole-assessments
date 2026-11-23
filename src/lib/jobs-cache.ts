import type { Assessment } from "@/lib/types";

/**
 * In-memory copy of the jobs list. Screens paint from it instantly while fresh data loads,
 * which makes tapping between the list and a job feel immediate.
 */
let rows: Assessment[] | null = null;

export const getJobsCache = () => rows;
export const setJobsCache = (r: Assessment[]) => {
  rows = r;
};
export const patchJobCache = (a: Assessment) => {
  if (rows) rows = rows.map((x) => (x.id === a.id ? a : x));
};
