"use client";

import { useEffect, useState } from "react";
import { Wallet, Users, Megaphone, GraduationCap, ClipboardCheck, CalendarDays, BarChart3, Award, Target, type LucideIcon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricWave } from "@/components/dashboard/MetricWave";
import type { AppCopy, Language } from "@/lib/i18n";
import type { Role } from "@/lib/types";
import { type AttendanceSlice, type ResourceTableData, type RevenuePoint, type SchoolResource, attendancePercent, averageScore, buildAttendanceMix, buildRevenueSeries, cellValues, countMatching, dashboardResources, emptyTable, formatTugrik, loadResourceData, parseAmount, toDate, weekdayNames } from "./dashboard-shared";
import { AttendanceMixChart, RevenueEmpty } from "./DashboardCharts";

const metricTones = ["blue", "violet", "green", "amber"];

/** One icon per stat tile, in the order each role's stats are listed. */
const metricIcons: Record<Role, LucideIcon[]> = {
  admin: [Users, GraduationCap, Wallet, Target],
  teacher: [Users, Target, ClipboardCheck, BarChart3],
  student: [Award, Target, CalendarDays, Wallet],
  parent: [Target, Award, Wallet, Megaphone]
};

export function Dashboard({
  copy,
  language,
  onOpenAttendance,
  onOpenPayments,
  role
}: {
  copy: AppCopy;
  language: Language;
  onOpenAttendance?: () => void;
  onOpenPayments?: () => void;
  role: Role;
}) {
  const dashboard = copy.dashboards[role];
  const [liveStats, setLiveStats] = useState<string[][] | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);
  const [attendanceMix, setAttendanceMix] = useState<AttendanceSlice[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchCounts() {
      const s = dashboard.stats;
      const mn = language === "mn";
      const stat = (index: number, value: string, helper: string) => [s[index]?.[0] ?? "", value, helper];

      try {
        const resources = dashboardResources[role];
        const loaded = await Promise.all(resources.map((resource) => loadResourceData(resource)));
        if (cancelled) return;

        const tables = new Map<SchoolResource, ResourceTableData>(
          resources.map((resource, index) => [resource, loaded[index].data])
        );
        const table = (resource: SchoolResource) => tables.get(resource) ?? emptyTable;

        const payments = table("payments");
        const attendance = table("attendance");
        const grades = table("grades");

        const series = buildRevenueSeries(payments, language);
        setRevenueSeries(series);
        setAttendanceMix(buildAttendanceMix(attendance, language));

        const { percent: attPct, present, total: attTotal } = attendancePercent(attendance);
        const attendanceHelper = attTotal > 0
          ? (mn ? `${attTotal} бүртгэлээс ${present}` : `${present} of ${attTotal} records`)
          : (mn ? "Бүртгэл алга" : "No records yet");

        const statuses = cellValues(payments, "Status");
        const amounts = cellValues(payments, "Amount");
        const sumWhereStatus = (expected: string) =>
          amounts.reduce((sum, amount, index) => (statuses[index]?.toLowerCase() === expected ? sum + parseAmount(amount) : sum), 0);
        const paidTotal = sumWhereStatus("paid");
        const unpaidCount = countMatching(payments, "Status", "Unpaid");

        const semesters = cellValues(grades, "Semester").filter(Boolean);
        const latestSemester = semesters.length > 0 ? semesters[semesters.length - 1] : "";
        const gradeHelper = latestSemester || (mn ? `${grades.rows.length} дүн` : `${grades.rows.length} grades`);
        const avg = averageScore(grades);
        const gpa = avg === null ? "0.0" : (avg / 25).toFixed(1);

        if (role === "admin") {
          const students = table("students");
          const teachers = table("teachers");
          const withLogin = countMatching(students, "Payment", "Paid");
          const subjectCount = new Set(
            cellValues(teachers, "Subject").flatMap((value) => value.split(",").map((item) => item.trim())).filter(Boolean)
          ).size;

          // Month-over-month revenue change, only claimed when two months exist.
          const previous = series.length >= 2 ? series[series.length - 2].revenue : 0;
          const current = series.length >= 1 ? series[series.length - 1].revenue : 0;
          const revenueHelper = series.length >= 2 && previous > 0
            ? `${current >= previous ? "+" : ""}${(((current - previous) / previous) * 100).toFixed(1)}%${mn ? " өмнөх сараас" : " vs last month"}`
            : (mn ? `${countMatching(payments, "Status", "Paid")} төлөгдсөн` : `${countMatching(payments, "Status", "Paid")} paid`);

          setLiveStats([
            stat(0, students.rows.length.toString(), mn ? `${withLogin} төлсөн` : `${withLogin} paid`),
            stat(1, teachers.rows.length.toString(), mn ? `${subjectCount} хичээл` : `${subjectCount} subjects`),
            stat(2, formatTugrik(paidTotal), revenueHelper),
            stat(3, `${attPct}%`, attendanceHelper)
          ]);
        }

        if (role === "teacher") {
          const timetable = table("timetable");
          const assignments = table("assignments");
          const today = weekdayNames[new Date().getDay()];
          const todayClasses = countMatching(timetable, "Day", today);
          const dueDates = cellValues(assignments, "Due Date");
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const pastDue = dueDates.filter((value) => {
            const due = toDate(value);
            return due !== null && due < startOfToday;
          }).length;

          setLiveStats([
            stat(0, todayClasses.toString(), mn ? `${timetable.rows.length} долоо хоногт` : `${timetable.rows.length} weekly`),
            stat(1, `${attPct}%`, attendanceHelper),
            stat(2, assignments.rows.length.toString(), mn ? `${pastDue} хугацаа хэтэрсэн` : `${pastDue} past due`),
            stat(3, avg === null ? "0%" : `${Math.round(avg)}%`, gradeHelper)
          ]);
        }

        if (role === "student") {
          const timetable = table("timetable");
          const today = weekdayNames[new Date().getDay()];
          const todayClasses = countMatching(timetable, "Day", today);
          const payStatus = payments.rows.length === 0
            ? (mn ? "Нэхэмжлэх алга" : "No invoices")
            : unpaidCount === 0
              ? (mn ? "Төлсөн" : "Paid")
              : (mn ? `${unpaidCount} төлөөгүй` : `${unpaidCount} unpaid`);

          setLiveStats([
            stat(0, gpa, gradeHelper),
            stat(1, `${attPct}%`, attendanceHelper),
            stat(2, todayClasses.toString(), mn ? `${today} өдөр` : today),
            stat(3, payStatus, mn ? `${payments.rows.length} нэхэмжлэх` : `${payments.rows.length} invoices`)
          ]);
        }

        if (role === "parent") {
          const announcements = table("announcements");
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const recent = cellValues(announcements, "Date").filter((value) => {
            const posted = toDate(value);
            return posted !== null && posted >= weekAgo;
          }).length;
          const openPayments = sumWhereStatus("unpaid");

          setLiveStats([
            stat(0, `${attPct}%`, attendanceHelper),
            stat(1, gpa, gradeHelper),
            stat(2, formatTugrik(openPayments), mn ? `${unpaidCount} төлөөгүй` : `${unpaidCount} unpaid`),
            stat(3, announcements.rows.length.toString(), mn ? `${recent} шинэ` : `${recent} this week`)
          ]);
        }
      } catch {
        // Leave the neutral placeholders from i18n in place rather than inventing numbers.
      }
    }

    fetchCounts();

    return () => {
      cancelled = true;
    };
  }, [role, language, dashboard.stats]);

  const displayStats = liveStats ?? dashboard.stats;
  const attendanceTotal = attendanceMix.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <>
      <section className="metric-grid">
        {displayStats.map(([label, value, helper], index) => {
          const Icon = metricIcons[role][index] ?? BarChart3;
          return (
            <Card className={`metric-card ${metricTones[index % metricTones.length]}`} key={label}>
              <div className="metric-card-head">
                <span className="metric-card-icon">
                  <Icon size={20} />
                </span>
                <p>{label}</p>
              </div>
              <strong>{value}</strong>
              <span className="metric-card-helper">{helper}</span>
              <MetricWave />
            </Card>
          );
        })}
      </section>
      <section className="analytics-grid">
        <Card>
          <CardHeader>
            <CardTitle>{language === "mn" ? "Орлогын анализ" : "Revenue Analytics"}</CardTitle>
            <Badge tone="blue">{copy.common.live}</Badge>
          </CardHeader>
          <CardContent className="chart-box">
            {revenueSeries.length === 0 ? (
              <RevenueEmpty language={language} onOpenPayments={onOpenPayments} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.32)" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value: number) => formatTugrik(value)} width={90} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.3)", borderRadius: 14, color: "#e5eefc" }}
                    formatter={(value) => formatTugrik(Number(value))}
                  />
                  <Area dataKey="revenue" fill="url(#revenue)" name={language === "mn" ? "Орлого" : "Revenue"} stroke="#4f46e5" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="attendance-card-title">
              <span>
                <Target size={20} />
              </span>
              <CardTitle>{language === "mn" ? "Ирцийн бүтэц" : "Attendance Mix"}</CardTitle>
            </div>
            <Badge tone="emerald">
              {attendanceTotal} {language === "mn" ? "бүртгэл" : attendanceTotal === 1 ? "record" : "records"}
            </Badge>
          </CardHeader>
          <CardContent className="chart-box">
            {attendanceTotal === 0 ? (
              <div className="table-empty">
                <strong>{language === "mn" ? "Ирцийн бүртгэл алга" : "No attendance records yet"}</strong>
                <p>
                  {language === "mn"
                    ? "Ирц бүртгэж эхэлмэгц ирсэн, хоцорсон, тасалсны харьцаа энд харагдана."
                    : "The present, late and absent split shows up here once attendance is marked."}
                </p>
              </div>
            ) : (
              <AttendanceMixChart language={language} onOpen={onOpenAttendance} slices={attendanceMix} />
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}
