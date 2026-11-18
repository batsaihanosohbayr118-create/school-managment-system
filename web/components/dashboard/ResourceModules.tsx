"use client";

import { Card, CardContent } from "@/components/ui/card";
import { subjects } from "@/lib/demo-data";
import { type Language, translateValue } from "@/lib/i18n";
import type { SubjectScopeOption } from "./dashboard-shared";
import { type ModuleApiProps, ModuleTable } from "./ModuleTable";

export function StudentsModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.students}
      columns={["Name", "Email", "Subjects", "Attendance", "GPA", "Payment", "Parent Email"]}
      rows={[]}
      {...controls}
    />
  );
}

export function TeachersModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.teachers}
      columns={["Name", "Email", "Subject", "Experience", "Salary", "Contact"]}
      rows={[]}
      {...controls}
    />
  );
}

export function ParentsModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.parents}
      columns={["Name", "Email", "Student", "Phone", "Occupation"]}
      rows={[]}
      {...controls}
    />
  );
}

export function SubjectsModule({
  apiData,
  copy,
  error,
  language,
  loading,
  onOpenContent,
  ...controls
}: ModuleApiProps & { onOpenContent: (recordId: string, row: string[]) => void }) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.subjects}
      columns={["Name", "Code", "Description", "Teacher", "Category", "Grade Levels"]}
      rows={subjects.map((item) => [item.name, item.code, item.description, item.teacherId ?? "", item.category, item.gradeLevels])}
      contentActionLabel={language === "mn" ? "Агуулга нээх" : "Open content"}
      onOpenContent={onOpenContent}
      {...controls}
    />
  );
}

/** Subject picker shown to students and parents above scoped resources. */
export function SubjectScopeTabs({
  options,
  value,
  onChange,
  language
}: {
  options: SubjectScopeOption[];
  value: string;
  onChange: (id: string) => void;
  language: Language;
}) {
  if (options.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="table-empty">
            <strong>{language === "mn" ? "Хичээл олдсонгүй" : "No subjects yet"}</strong>
            <p>
              {language === "mn"
                ? "Та ямар нэг хичээлд бүртгэгдсэний дараа энд харагдана."
                : "Once you are enrolled in a subject it will show up here."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="subject-scope-tabs" role="tablist">
      {options.map((option) => (
        <button
          aria-selected={option.id === value}
          className={option.id === value ? "active" : ""}
          key={option.id}
          onClick={() => onChange(option.id)}
          role="tab"
          type="button"
        >
          {translateValue(option.name, language)}
        </button>
      ))}
    </div>
  );
}

export function AssignmentsModule({ apiData, copy, error, language, loading, scopeLabel, ...controls }: ModuleApiProps & { scopeLabel?: string }) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={scopeLabel ? `${copy.tables.assignments} — ${translateValue(scopeLabel, language)}` : copy.tables.assignments}
      columns={["Subject", "Title", "File", "Due Date", "Max Score", "Description"]}
      rows={[]}
      {...controls}
    />
  );
}

export function MaterialsModule({ apiData, copy, error, language, loading, scopeLabel, ...controls }: ModuleApiProps & { scopeLabel?: string }) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={scopeLabel ? `${copy.tables.materials} — ${translateValue(scopeLabel, language)}` : copy.tables.materials}
      columns={["Subject", "Title", "File Type", "Uploaded By", "File"]}
      rows={[]}
      {...controls}
    />
  );
}

export function AttendanceModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.attendance}
      columns={["Student", "Subject", "Date", "Status"]}
      rows={[]}
      {...controls}
    />
  );
}

export function GradesModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.grades}
      columns={["Student", "Subject", "Score", "Semester"]}
      rows={[]}
      {...controls}
    />
  );
}

export function PaymentsModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.payments}
      columns={["Student", "Amount", "Status", "Due Date", "Fee Type"]}
      rows={[]}
      {...controls}
    />
  );
}

export function TimetableModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.timetable}
      columns={["Subject", "Day", "Time", "Teacher", "Class"]}
      rows={[]}
      {...controls}
    />
  );
}

export function AnnouncementsModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.announcements}
      columns={["Title", "Content", "Audience", "Date"]}
      rows={[]}
      {...controls}
    />
  );
}

export function WellbeingModule({ apiData, copy, error, language, loading, ...controls }: ModuleApiProps) {
  return (
    <ModuleTable
      apiData={apiData}
      copy={copy}
      error={error}
      language={language}
      loading={loading}
      title={copy.tables.wellbeing}
      columns={["Question", "Category", "Note", "Date"]}
      rows={[]}
      {...controls}
    />
  );
}
