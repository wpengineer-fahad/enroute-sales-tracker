export const SUB_SECTORS = [
  "Automobile Workshop",
  "Dairy products",
  "Dry fish processing and trade",
  "Eco-friendly tourism",
  "Full grain rice",
  "High-value crops",
  "High-value handicrafts rural area",
  "Leather products",
  "Loom",
  "Machinery & Equipment",
  "Metal products",
  "Mini garments",
  "Poultry",
] as const;

export type SubSector = typeof SUB_SECTORS[number];

export type AppRole = "admin" | "developer" | "me";
export type TaskStatus = "pending" | "processing" | "completed";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-warning/15 text-warning border border-warning/30",
  completed: "bg-success/15 text-success border border-success/30",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  developer: "Sales / Market Developer",
  me: "Micro Enterprise",
};
