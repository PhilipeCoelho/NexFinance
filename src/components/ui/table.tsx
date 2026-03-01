import * as React from "react"

const Table = React.forwardRef<
    HTMLTableElement,
    React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto border rounded-xl border-[#0000000d] bg-[var(--bg-secondary)] shadow-sm">
        <table
            ref={ref}
            className={`w-full caption-bottom text-sm ${className || ''}`}
            {...props}
        />
    </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <thead ref={ref} className={`[&_tr]:border-b border-[var(--border-light)] bg-[var(--bg-tertiary)] ${className || ''}`} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tbody
        ref={ref}
        className={`[&_tr:last-child]:border-0 ${className || ''}`}
        {...props}
    />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
    HTMLTableSectionElement,
    React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
    <tfoot
        ref={ref}
        className={`border-t bg-[var(--bg-tertiary)] font-medium [&>tr]:last:border-b-0 ${className || ''}`}
        {...props}
    />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
    HTMLTableRowElement,
    React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
    <tr
        ref={ref}
        className={`border-b border-[var(--border-light)] transition-colors hover:bg-[var(--bg-tertiary)] data-[state=selected]:bg-[var(--bg-tertiary)] ${className || ''}`}
        {...props}
    />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
    HTMLTableCellElement,
    React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <th
        ref={ref}
        className={`h-11 px-4 text-left align-middle font-semibold text-[var(--text-secondary)] text-[11px] uppercase tracking-wide cursor-pointer select-none transition-colors hover:text-[var(--text-primary)] [&:has([role=checkbox])]:pr-0 ${className || ''}`}
        {...props}
    />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
    HTMLTableCellElement,
    React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
    <td
        ref={ref}
        className={`p-4 align-middle text-[13px] text-[var(--text-primary)] group-hover:opacity-100 [&:has([role=checkbox])]:pr-0 ${className || ''}`}
        {...props}
    />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
    HTMLTableCaptionElement,
    React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
    <caption
        ref={ref}
        className={`mt-4 text-sm text-[var(--text-secondary)] ${className || ''}`}
        {...props}
    />
))
TableCaption.displayName = "TableCaption"

export {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
    TableCaption,
}
