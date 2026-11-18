"use client";

import { type CSSProperties, useState } from "react";
import { BookOpen, ExternalLink, Inbox, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type AppCopy, type Language, translateColumn, translateValue } from "@/lib/i18n";
import { openStoredFile } from "@/lib/subjectContent";
import { type ResourceTableData, statusTone } from "./dashboard-shared";

const SKELETON_ROW_COUNT = 5;
const SKELETON_BAR_WIDTHS = ["78%", "60%", "88%", "52%", "72%", "66%"];

/** Placeholder rows shown while a resource loads for the first time. */
function TableSkeletonRows({ columns, gridColumns, language }: { columns: string[]; gridColumns: string; language: Language }) {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, rowIndex) => (
        <div aria-hidden className="ec-table-row is-skeleton" key={`skeleton-row-${rowIndex}`} style={{ gridTemplateColumns: gridColumns }}>
          {columns.map((column, columnIndex) => (
            <span data-label={translateColumn(column, language)} key={column}>
              <span
                className="ec-skeleton ec-skeleton-bar"
                style={
                  {
                    "--ec-bar-width": SKELETON_BAR_WIDTHS[(rowIndex + columnIndex) % SKELETON_BAR_WIDTHS.length],
                    "--ec-skeleton-delay": `${rowIndex * 0.12}s`
                  } as CSSProperties
                }
              />
            </span>
          ))}
        </div>
      ))}
    </>
  );
}

export type ModuleApiProps = {
  apiData: ResourceTableData | null;
  copy: AppCopy;
  error: string;
  language: Language;
  loading: boolean;
} & ModuleControls;

type ModuleControls = {
  canManage: boolean;
  onAdd: () => void;
  onDelete: (recordId: string, row: string[]) => void;
  onEdit: (recordId: string, row: string[], columns: string[]) => void;
  contentActionLabel?: string;
  /** What this table holds ("Зарлал"), for the empty state. */
  emptyLabel?: string;
  onOpenContent?: (recordId: string, row: string[]) => void;
};

export function ModuleTable({
  title,
  columns,
  rows,
  apiData,
  copy,
  error,
  language,
  loading,
  canManage,
  contentActionLabel,
  emptyLabel,
  onAdd,
  onDelete,
  onEdit,
  onOpenContent
}: {
  title: string;
  columns: string[];
  rows: string[][];
  apiData: ResourceTableData | null;
  copy: AppCopy;
  error: string;
  language: Language;
  loading: boolean;
} & ModuleControls) {
  const displayColumns = apiData?.columns ?? columns;
  const displayRows = apiData?.rows ?? rows;
  const displayIds = apiData?.ids ?? [];
  const [filterQuery, setFilterQuery] = useState("");
  const normalizedFilter = filterQuery.trim().toLowerCase();
  const filteredRows = displayRows
    .map((row, rowIndex) => ({ id: displayIds[rowIndex], row }))
    .filter(({ row }) =>
      normalizedFilter
        ? row.some((cell) => translateValue(cell, language).toLowerCase().includes(normalizedFilter) || cell.toLowerCase().includes(normalizedFilter))
        : true
    );
  const showActions = (canManage || Boolean(onOpenContent)) && displayIds.length > 0;
  const actionColumnWidth = canManage && onOpenContent ? "132px" : "88px";
  const gridColumns = `repeat(${displayColumns.length}, minmax(0, 1fr))${showActions ? ` ${actionColumnWidth}` : ""}`;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          {loading || error ? (
            <p className="table-subtitle">
              {loading ? (
                <>
                  <span className="ec-spinner" style={{ "--ec-spinner-size": "13px", "--ec-spinner-width": "2px" } as CSSProperties} />
                  {copy.common.loadingRecords}
                </>
              ) : (
                error
              )}
            </p>
          ) : null}
        </div>
        <div className="table-actions">
          <label className="table-filter">
            <Search aria-hidden="true" size={17} />
            <Input aria-label={copy.common.filterRecords} value={filterQuery} onChange={(event) => setFilterQuery(event.target.value)} placeholder={copy.common.filterRecords} />
          </label>
          {canManage ? (
            <Button onClick={onAdd} type="button">
              <Plus size={17} />
              {copy.common.add}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="ec-table">
          <div className="ec-table-head" style={{ gridTemplateColumns: gridColumns }}>
            {displayColumns.map((column) => (
              <span key={column}>{translateColumn(column, language)}</span>
            ))}
            {showActions ? <span className="table-action-title">{copy.common.actions}</span> : null}
          </div>
          {loading && displayRows.length === 0 ? (
            <TableSkeletonRows columns={displayColumns} gridColumns={gridColumns} language={language} />
          ) : filteredRows.length > 0 ? (
            filteredRows.map(({ id, row }) => (
              <div className="ec-table-row" key={id ?? row.join("-")} style={{ gridTemplateColumns: gridColumns }}>
                {row.map((cell, index) => (
                  <span data-label={translateColumn(displayColumns[index], language)} key={`${cell}-${index}`}>
                    {displayColumns[index] === "File" ? (
                      /^(\/|https?:\/\/)/.test(cell) ? (
                        <button
                          className="file-open-action"
                          onClick={() => {
                            openStoredFile(cell).catch(() => window.alert(language === "mn" ? "Файлыг нээж чадсангүй" : "Could not open the file"));
                          }}
                          type="button"
                        >
                          <ExternalLink size={14} />
                          {language === "mn" ? "Нээх" : "Open"}
                        </button>
                      ) : (
                        "—"
                      )
                    ) : ["Paid", "Unpaid", "Partial", "Present", "Absent", "Late"].includes(cell) ? (
                      <Badge tone={statusTone(cell)}>{translateValue(cell, language)}</Badge>
                    ) : (
                      translateValue(cell, language)
                    )}
                  </span>
                ))}
                {showActions ? (
                  <span className="row-actions">
                    {onOpenContent ? (
                      <button aria-label={contentActionLabel} className="content-action" onClick={() => id && onOpenContent(id, row)} type="button">
                        <BookOpen size={15} />
                      </button>
                    ) : null}
                    {canManage ? (
                      <>
                        <button aria-label={copy.common.editRecord} onClick={() => id && onEdit(id, row, displayColumns)} type="button">
                          <Pencil size={15} />
                        </button>
                        <button aria-label={copy.common.deleteRecord} className="delete-action" onClick={() => id && onDelete(id, row)} type="button">
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : null}
                  </span>
                ) : null}
              </div>
            ))
          ) : (
            <div className="table-empty">
              <span className="table-empty-icon" aria-hidden="true">
                {normalizedFilter ? <SearchX size={22} /> : <Inbox size={22} />}
              </span>
              <strong>
                {normalizedFilter
                  ? (language === "mn" ? "Илэрц олдсонгүй" : "No matches found")
                  : language === "mn"
                    ? `Одоогоор ${(emptyLabel || "бүртгэл").toLocaleLowerCase("mn")} алга`
                    : `No ${(emptyLabel || "").toLowerCase()} records yet`.replace("  ", " ")}
              </strong>
              <p>
                {normalizedFilter
                  ? (language === "mn" ? "Хайлтын үгээ өөрчлөөд дахин оролдоно уу." : "Try a different filter term.")
                  : (language === "mn" ? "Шинэ бүртгэл нэмэгдмэгц энд харагдана." : "New records will appear here once they are added.")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
