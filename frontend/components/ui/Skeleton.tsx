"use client";

import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const baseStyles = "animate-pulse bg-muted rounded";

export function Skeleton({ variant = "text", width, height, lines, className = "", ...props }: SkeletonProps) {
  if (variant === "text") {
    const lineCount = lines || 1;
    return (
      <div className={className} {...props}>
        {[...Array(lineCount)].map((_, i) => (
          <div
            key={i}
            className={`
              ${baseStyles} h-4 w-full
              ${i === lineCount - 1 && lineCount > 1 ? "w-3/4" : ""}
              ${i < lineCount - 1 ? "mb-2" : ""}
            `}
            style={{ width: i === lineCount - 1 && lineCount > 1 ? "75%" : width }}
          />
        ))}
      </div>
    );
  }

  if (variant === "circular") {
    return (
      <div
        className={`${baseStyles} rounded-full`}
        style={{ width: width || "2.5rem", height: height || "2.5rem" }}
        {...props}
      />
    );
  }

  if (variant === "rectangular") {
    return (
      <div
        className={baseStyles}
        style={{ width: width || "100%", height: height || "1rem" }}
        {...props}
      />
    );
  }

  if (variant === "card") {
    return (
      <div className={className} {...props}>
        <div className={`${baseStyles} h-32 w-full rounded-t-lg mb-3`} />
        <div className={`${baseStyles} h-4 w-3/4 mb-2`} />
        <div className={`${baseStyles} h-4 w-1/2 mb-2`} />
        <div className={`${baseStyles} h-4 w-5/6`} />
      </div>
    );
  }

  return null;
}

export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-border bg-surface">
            {[...Array(columns)].map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className={`${baseStyles} h-4 w-3/4`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border/50 last:border-b-0 animate-pulse">
              {[...Array(columns)].map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div className={`${baseStyles} h-4 w-full`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  );
}