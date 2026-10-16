"use client";

import React, { forwardRef } from "react";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyAccessor: (row: T) => string | number;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  loadingRows?: number;
  className?: string;
  onRowClick?: (row: T, index: number) => void;
  selectedKeys?: Set<string | number>;
}

function TableSkeleton<T>({ columns, loadingRows = 5 }: { columns: Column<T>[]; loadingRows?: number }) {
  return (
    <tbody>
      {[...Array(loadingRows)].map((_, i) => (
        <tr key={i} className="animate-pulse">
          {columns.map((col) => (
            <td key={col.key} className="px-4 py-3">
              <div className="h-4 bg-muted rounded w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

type ColumnAlign = NonNullable<Column<unknown>["align"]>;

export function Table<T>({
  columns,
  data,
  keyAccessor,
  striped = true,
  hoverable = true,
  bordered = true,
  emptyMessage = "No data available",
  loading = false,
  loadingRows = 5,
  className = "",
  onRowClick,
  selectedKeys = new Set(),
}: TableProps<T>) {
  const alignStyles: Record<ColumnAlign, string> = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  if (loading) {
    return (
      <div className={`overflow-x-auto rounded-lg border border-border ${className}`}>
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-border bg-surface">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`
                    px-4 py-3 font-medium text-label-xs text-muted-foreground uppercase tracking-wider
                    ${alignStyles[col.align || "left"]}
                    ${col.className || ""}
                  `}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <TableSkeleton columns={columns} loadingRows={loadingRows} />
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`overflow-x-auto rounded-lg border border-border ${className}`}>
        <table className="w-full" role="table">
          <thead>
            <tr className="border-b border-border bg-surface">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`
                    px-4 py-3 font-medium text-label-xs text-muted-foreground uppercase tracking-wider
                    ${alignStyles[col.align || "left"]}
                    ${col.className || ""}
                  `}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-lg ${bordered ? "border border-border" : ""} ${className}`}>
      <table className="w-full" role="table">
        <thead>
          <tr className="border-b border-border bg-surface">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`
                  px-4 py-3 font-medium text-label-xs text-muted-foreground uppercase tracking-wider
                  ${alignStyles[col.align || "left"]}
                  ${col.className || ""}
                `}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const rowKey = keyAccessor(row);
            const isSelected = selectedKeys.has(rowKey);
            return (
              <tr
                key={rowKey}
                className={`
                  border-b border-border/50 last:border-b-0
                  transition-colors duration-100
                  ${striped && rowIndex % 2 === 1 ? "bg-surface/50" : ""}
                  ${hoverable && onRowClick ? "hover:bg-muted cursor-pointer" : ""}
                  ${isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""}
                `}
                onClick={() => onRowClick?.(row, rowIndex)}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
              >
                {columns.map((col) => {
                  const value = (row as Record<string, unknown>)[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`
                        px-4 py-3 text-body-sm
                        ${alignStyles[col.align || "left"]}
                        ${col.className || ""}
                      `}
                    >
                      {col.render ? col.render(value, row, rowIndex) : (
                        <span className="text-foreground">{value as string}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}