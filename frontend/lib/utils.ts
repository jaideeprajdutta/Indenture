import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(val: number | null | undefined, options?: Intl.NumberFormatOptions): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    ...options,
  }).format(val);
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("en-US").format(val);
}

export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return `${val.toFixed(decimals)}%`;
}

export function formatDate(date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(d);
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d, { dateStyle: "short" });
}

export type Decision = "ADVANCE" | "HOLD" | "NURTURE" | "REJECT" | "HOLD_MISSING_DATA" | "UNKNOWN";

export function normalizeDecision(decision: string | null | undefined): Decision {
  if (!decision) return "UNKNOWN";
  const normalized = decision.toUpperCase();
  if (normalized === "HOLD_MISSING_DATA") return "HOLD";
  return normalized as Decision;
}

export interface DecisionConfig {
  bg: string;
  border: string;
  text: string;
  dot: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function getDecisionConfig(decision: string | null | undefined): DecisionConfig {
  const normalized = normalizeDecision(decision);
  
  switch (normalized) {
    case "ADVANCE":
      return {
        bg: "bg-success-muted",
        border: "border-success/30",
        text: "text-success-foreground",
        dot: "bg-success",
      };
    case "HOLD":
      return {
        bg: "bg-warning-muted",
        border: "border-warning/30",
        text: "text-warning-foreground",
        dot: "bg-warning",
      };
    case "NURTURE":
      return {
        bg: "bg-info-muted",
        border: "border-info/30",
        text: "text-info-foreground",
        dot: "bg-info",
      };
    case "REJECT":
      return {
        bg: "bg-danger-muted",
        border: "border-danger/30",
        text: "text-danger-foreground",
        dot: "bg-danger",
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        text: "text-muted-foreground",
        dot: "bg-muted-foreground",
      };
  }
}

export function getDecisionLabel(decision: string | null | undefined): string {
  const normalized = normalizeDecision(decision);
  return normalized;
}

export function getHumanStatusConfig(status: string | null | undefined): DecisionConfig {
  if (!status) return getDecisionConfig(null);
  
  switch (status.toUpperCase()) {
    case "APPROVED":
      return {
        bg: "bg-success-muted",
        border: "border-success/30",
        text: "text-success-foreground",
        dot: "bg-success",
      };
    case "OVERRIDDEN":
      return {
        bg: "bg-info-muted",
        border: "border-info/30",
        text: "text-info-foreground",
        dot: "bg-info",
      };
    case "REJECTED":
      return {
        bg: "bg-danger-muted",
        border: "border-danger/30",
        text: "text-danger-foreground",
        dot: "bg-danger",
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        text: "text-muted-foreground",
        dot: "bg-muted-foreground",
      };
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 1) + "…";
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function generateId(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`;
}