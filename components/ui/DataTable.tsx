"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  idKey?: string;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  idKey = "id",
  emptyMessage = "لا توجد بيانات",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey] ?? "";
    const bVal = b[sortKey] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal), "ar", { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const allSelected = data.length > 0 && data.every((item) => selectedIds.has(item[idKey]));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((item) => item[idKey])));
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy-500 text-white">
            {selectable && (
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`p-3 text-right font-bold whitespace-nowrap ${
                  col.sortable ? "cursor-pointer select-none hover:bg-navy-600" : ""
                }`}
                style={col.width ? { width: col.width } : undefined}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-8 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sorted.map((item, i) => (
              <tr
                key={item[idKey] || i}
                className={`border-b border-gray-100 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                } ${selectedIds.has(item[idKey]) ? "bg-navy-50" : ""}`}
                onClick={() => onRowClick?.(item)}
              >
                {selectable && (
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item[idKey])}
                      onChange={() => toggleOne(item[idKey])}
                      className="rounded"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="p-3 text-right">
                    {col.render ? col.render(item) : (item[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
