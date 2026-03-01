import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { useFinanceStore, useCurrentData } from '@/hooks/use-store';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (row: any) => React.ReactNode;
  weight?: 'primary' | 'secondary' | 'tertiary';
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  onSort?: (key: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' };
  onRowClick?: (row: any) => void;
  rowClassName?: (row: any) => string;
  selectable?: boolean;
  onSelectionChange?: (selectedIds: string[]) => void;
  emptyStateMessage?: string;
}

export function DataTable({
  data,
  columns,
  onSort,
  sortConfig,
  onRowClick,
  rowClassName,
  selectable,
  onSelectionChange,
  emptyStateMessage = "Nenhum registo encontrado."
}: DataTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(data.map(item => item.id));
      setSelectedIds(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead className="w-[40px] px-4 text-center">
              <Checkbox
                checked={selectedIds.size === data.length && data.length > 0}
                onCheckedChange={handleSelectAll}
                aria-label="Selecionar todos"
              />
            </TableHead>
          )}
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={`
                px-4 py-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide
                ${col.sortable ? 'cursor-pointer hover:text-[var(--text-primary)] transition-colors' : ''}
                ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
              `}
              onClick={() => col.sortable && onSort?.(col.key)}
            >
              <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                {col.label}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length + (selectable ? 1 : 0)}
              className="h-24 text-center text-[var(--text-secondary)]"
            >
              {emptyStateMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow
              key={row.id}
              className={`
                border-b border-[var(--border-light)] transition-colors
                ${onRowClick ? 'cursor-pointer' : ''}
                ${rowClassName?.(row) || ''}
              `}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button, [type="checkbox"], a')) return;
                onRowClick?.(row);
              }}
              data-state={selectedIds.has(row.id) ? "selected" : undefined}
            >
              {selectable && (
                <TableCell className="w-[40px] px-4 text-center align-middle">
                  <Checkbox
                    checked={selectedIds.has(row.id)}
                    onCheckedChange={(checked) => handleSelectRow(row.id, checked as boolean)}
                    aria-label={`Selecionar linha`}
                  />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={`
                    px-4 py-3 align-middle text-[13px]
                    ${col.weight === 'primary' ? 'font-medium text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}
                  `}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
