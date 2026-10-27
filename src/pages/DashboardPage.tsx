import { useAction } from "convex/react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../convex/_generated/api";

type CalendarItem = {
  recordId: string;
  name: string;
  dueDate: string | null;
  owner: string[];
  status: string;
  airtableUrl: string;
};

type ReportSchedule = {
  recordId: string;
  clientName: string;
  dueDay: number | null;
  owner: string[];
  airtableUrl: string;
};

type ReportOccurrence = ReportSchedule & {
  dueDay: number;
  dueDate: string;
};

type MobileMonthEntry =
  | { kind: "work"; key: string; dueDate: string; item: CalendarItem }
  | {
      kind: "report";
      key: string;
      dueDate: string;
      report: ReportOccurrence;
    };

type CalendarView = "month" | "week";
type CalendarSection = "client-due-dates" | "deliverables";
type SummaryFilter = "upcoming" | "no-date" | "this-week" | "next-week" | "all";

const STATUS_LABELS = [
  "Open",
  "In Progress",
  "Waiting Internal",
  "Waiting on Client",
  "Blocked",
  "Done",
  "Archived",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function statusKey(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "waiting internal") return "waiting-internal";
  if (normalized === "waiting on client") return "waiting-on-client";
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isDone(item: CalendarItem) {
  return item.status.trim().toLowerCase() === "done";
}

function compareDueDates(a: CalendarItem, b: CalendarItem) {
  return (
    (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") ||
    a.name.localeCompare(b.name)
  );
}

function reportOccurrencesBetween(
  schedules: ReportSchedule[],
  start: Date,
  end: Date,
) {
  const occurrences: ReportOccurrence[] = [];
  let month = startOfMonth(start);
  const lastMonth = startOfMonth(end);

  while (month <= lastMonth) {
    const lastDay = endOfMonth(month).getDate();
    for (const schedule of schedules) {
      if (schedule.dueDay === null) continue;
      const day = Math.min(schedule.dueDay, lastDay);
      const due = new Date(month.getFullYear(), month.getMonth(), day);
      if (due < start || due > end) continue;
      occurrences.push({
        ...schedule,
        dueDay: schedule.dueDay,
        dueDate: format(due, "yyyy-MM-dd"),
      });
    }
    month = addMonths(month, 1);
  }

  return occurrences.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      a.clientName.localeCompare(b.clientName),
  );
}

function StatusIndicator({ status }: { status: string }) {
  return (
    <span className="status-indicator" data-status={statusKey(status)}>
      {status}
    </span>
  );
}

function ReportLink({
  report,
  variant = "calendar-report",
}: {
  report: ReportOccurrence;
  variant?: "calendar-report" | "upcoming-report";
}) {
  const dueDate = format(parseLocalDate(report.dueDate), "MMM d");
  return (
    <a
      className={variant}
      href={report.airtableUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open monthly report schedule for ${report.clientName} in Airtable. Strategist: ${report.owner.join(", ")}. Scheduled due date: ${format(parseLocalDate(report.dueDate), "EEEE, MMMM d")}.`}
    >
      <span className="report-kind">
        <FileText className="size-3" aria-hidden="true" />
        Monthly report
      </span>
      <span
        className={
          variant === "upcoming-report"
            ? "upcoming-record-name"
            : "calendar-task-name"
        }
      >
        {report.clientName}
      </span>
      <span
        className={
          variant === "upcoming-report"
            ? "upcoming-record-meta"
            : "calendar-task-owner"
        }
      >
        Strategist: {report.owner.join(", ")}
      </span>
      <span
        className={
          variant === "upcoming-report"
            ? "upcoming-record-meta"
            : "calendar-task-owner"
        }
      >
        Due {dueDate}
      </span>
    </a>
  );
}

function MissingReportDayLink({ report }: { report: ReportSchedule }) {
  return (
    <a
      className="upcoming-report"
      href={report.airtableUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${report.clientName} in Airtable. No report due day is set. Strategist: ${report.owner.join(", ")}.`}
    >
      <span className="report-kind">
        <FileText className="size-3" aria-hidden="true" />
        No report day set
      </span>
      <span className="upcoming-record-name">{report.clientName}</span>
      <span className="upcoming-record-meta">
        Strategist: {report.owner.join(", ")}
      </span>
    </a>
  );
}

function WorkItemLink({
  item,
  variant = "calendar-task",
  includeDate = false,
}: {
  item: CalendarItem;
  variant?: "calendar-task" | "agenda-task" | "upcoming-record";
  includeDate?: boolean;
}) {
  return (
    <a
      className={variant}
      data-status={statusKey(item.status)}
      href={item.airtableUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${item.name} in Airtable. Owner: ${item.owner.join(", ")}. Status: ${item.status}.`}
    >
      {includeDate && item.dueDate && (
        <span className="upcoming-record-meta">
          {format(parseLocalDate(item.dueDate), "EEE, MMM d")}
        </span>
      )}
      <span
        className={
          variant === "upcoming-record"
            ? "upcoming-record-name"
            : "calendar-task-name"
        }
      >
        {item.name}
      </span>
      <span
        className={
          variant === "upcoming-record"
            ? "upcoming-record-meta"
            : "calendar-task-owner"
        }
      >
        {item.owner.join(", ")}
      </span>
      <StatusIndicator status={item.status} />
    </a>
  );
}

function EmptyMessage({ children }: { children: string }) {
  return (
    <p className="py-2 text-sm text-muted-foreground" role="status">
      {children}
    </p>
  );
}

function CollapsiblePanel({
  title,
  count,
  detail,
  children,
}: {
  title: string;
  count: number;
  detail?: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <section>
      <Card className="sidebar-panel sidebar-disclosure p-4">
        <h2 className="sidebar-disclosure-heading">
          <Button
            type="button"
            variant="ghost"
            className="sidebar-disclosure-toggle h-auto min-h-10 w-full justify-between rounded-[var(--radius-button)] p-0 text-left hover:bg-transparent"
            aria-expanded={isOpen}
            aria-controls={contentId}
            onClick={() => setIsOpen(open => !open)}
          >
            <span className="sidebar-disclosure-label">
              <span className="sidebar-disclosure-title-row">
                <span className="text-sm font-semibold text-primary">
                  {title}
                </span>
                <span className="sidebar-disclosure-count">{count}</span>
              </span>
              {detail && (
                <span className="sidebar-disclosure-detail">{detail}</span>
              )}
            </span>
            <ChevronDown
              className="sidebar-disclosure-icon size-4"
              aria-hidden="true"
            />
          </Button>
        </h2>
        {isOpen && (
          <div id={contentId} className="sidebar-disclosure-content">
            {children}
          </div>
        )}
      </Card>
    </section>
  );
}

export function DashboardPage() {
  const getWorkCalendar = useAction(api.calendar.getWorkCalendar);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [reports, setReports] = useState<ReportSchedule[]>([]);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [calendarSection, setCalendarSection] =
    useState<CalendarSection>("deliverables");
  const [view, setView] = useState<CalendarView>("month");
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>("upcoming");
  const [showDone, setShowDone] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getWorkCalendar({});
      setItems(result.items);
      setReports(result.reports);
      setSyncedAt(new Date(result.syncedAt));
      setSyncError(false);
    } catch {
      setSyncError(true);
    } finally {
      setNow(new Date());
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [getWorkCalendar]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const visibleItems = useMemo(
    () => items.filter(item => showDone || !isDone(item)).sort(compareDueDates),
    [items, showDone],
  );

  const datedItems = useMemo(
    () =>
      visibleItems.filter((item): item is CalendarItem & { dueDate: string } =>
        Boolean(item.dueDate),
      ),
    [visibleItems],
  );
  const noDateItems = useMemo(
    () =>
      visibleItems
        .filter(item => !item.dueDate)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [visibleItems],
  );

  const itemsByDate = useMemo(() => {
    const groups = new Map<string, CalendarItem[]>();
    for (const item of datedItems) {
      const existing = groups.get(item.dueDate) ?? [];
      existing.push(item);
      groups.set(item.dueDate, existing);
    }
    return groups;
  }, [datedItems]);

  const monthStart = startOfMonth(focusDate);
  const monthEnd = endOfMonth(focusDate);
  const monthDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });
  const weekStart = startOfWeek(focusDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const todayKey = format(now, "yyyy-MM-dd");

  const monthGridReports = reportOccurrencesBetween(
    reports,
    monthDays[0],
    monthDays[monthDays.length - 1],
  );
  const monthReports = reportOccurrencesBetween(reports, monthStart, monthEnd);
  const weekReports = reportOccurrencesBetween(
    reports,
    weekDays[0],
    weekDays[weekDays.length - 1],
  );
  const calendarReports = view === "month" ? monthGridReports : weekReports;
  const reportsByDate = new Map<string, ReportOccurrence[]>();
  for (const report of calendarReports) {
    const existing = reportsByDate.get(report.dueDate) ?? [];
    existing.push(report);
    reportsByDate.set(report.dueDate, existing);
  }

  const missingReportDays = reports.filter(report => report.dueDay === null);

  const reportWindow = useMemo(() => {
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const nextWeekStart = addDays(currentWeekEnd, 1);
    const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 0 });
    const occurrences = reportOccurrencesBetween(
      reports,
      currentWeekStart,
      nextWeekEnd,
    );
    const thisWeekStartKey = format(currentWeekStart, "yyyy-MM-dd");
    const thisWeekEndKey = format(currentWeekEnd, "yyyy-MM-dd");
    const nextWeekStartKey = format(nextWeekStart, "yyyy-MM-dd");
    const nextWeekEndKey = format(nextWeekEnd, "yyyy-MM-dd");

    return {
      today: occurrences.filter(report => report.dueDate === todayKey),
      thisWeek: occurrences.filter(
        report =>
          report.dueDate >= thisWeekStartKey &&
          report.dueDate <= thisWeekEndKey &&
          report.dueDate !== todayKey,
      ),
      nextWeek: occurrences.filter(
        report =>
          report.dueDate >= nextWeekStartKey &&
          report.dueDate <= nextWeekEndKey,
      ),
    };
  }, [reports, now, todayKey]);

  const upcomingRanges = useMemo(() => {
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 0 });
    const nextWeekStart = addDays(thisWeekStart, 7);
    const nextWeekEnd = addDays(nextWeekStart, 6);
    const inRange = (item: CalendarItem, start: Date, end: Date) =>
      Boolean(
        item.dueDate &&
          item.dueDate >= format(start, "yyyy-MM-dd") &&
          item.dueDate <= format(end, "yyyy-MM-dd"),
      );
    return {
      thisWeek: datedItems.filter(item =>
        inRange(item, thisWeekStart, endOfWeek(now, { weekStartsOn: 0 })),
      ),
      nextWeek: datedItems.filter(item =>
        inRange(item, nextWeekStart, nextWeekEnd),
      ),
    };
  }, [datedItems, now]);

  const monthItems = datedItems.filter(
    item =>
      item.dueDate >= format(monthStart, "yyyy-MM-dd") &&
      item.dueDate <= format(monthEnd, "yyyy-MM-dd"),
  );
  const monthEntries: MobileMonthEntry[] = [
    ...(calendarSection === "deliverables"
      ? monthItems.map(item => ({
          kind: "work" as const,
          key: `work-${item.recordId}`,
          dueDate: item.dueDate,
          item,
        }))
      : []),
    ...(calendarSection === "client-due-dates"
      ? monthReports.map(report => ({
          kind: "report" as const,
          key: `report-${report.recordId}-${report.dueDate}`,
          dueDate: report.dueDate,
          report,
        }))
      : []),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const periodTitle =
    view === "month"
      ? format(focusDate, "MMMM yyyy")
      : `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`;

  const navigatePeriod = (direction: -1 | 1) => {
    setFocusDate(current =>
      view === "month"
        ? addMonths(current, direction)
        : addWeeks(current, direction),
    );
  };

  const renderCalendarItems = (
    date: Date,
    variant: "calendar-task" | "agenda-task",
  ) => {
    if (calendarSection !== "deliverables") return null;
    const key = format(date, "yyyy-MM-dd");
    const events = itemsByDate.get(key) ?? [];
    if (!events.length) return null;
    return (
      <div className="calendar-day-events">
        {events.map(item => (
          <WorkItemLink key={item.recordId} item={item} variant={variant} />
        ))}
      </div>
    );
  };

  const renderCalendarReports = (
    date: Date,
    variant: "calendar-report" | "upcoming-report",
  ) => {
    if (calendarSection !== "client-due-dates") return null;
    const key = format(date, "yyyy-MM-dd");
    const events = reportsByDate.get(key) ?? [];
    if (!events.length) return null;
    return (
      <div className="calendar-day-events">
        {events.map(report => (
          <ReportLink
            key={`${report.recordId}-${report.dueDate}`}
            report={report}
            variant={variant}
          />
        ))}
      </div>
    );
  };

  return (
    <main className="calendar-app-main">
      <div className="calendar-window" role="region" aria-label="Work calendar">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Cascade Web Solutions · Airtable
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
              Work due dates
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Client report schedules and deliverables sync from Airtable.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {syncedAt
                ? `Synced from Airtable ${format(syncedAt, "h:mm a")}`
                : initialLoading
                  ? "Connecting to Airtable…"
                  : "Waiting for first sync"}
            </span>
            <Button
              type="button"
              variant="outline"
              className="calendar-toolbar-button"
              onClick={() => void refresh()}
              disabled={refreshing}
              aria-label="Refresh Airtable data"
            >
              {refreshing ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <Tabs
          value={calendarSection}
          onValueChange={value => {
            if (value === "client-due-dates" || value === "deliverables") {
              setCalendarSection(value);
              setSummaryFilter("upcoming");
            }
          }}
        >
          <TabsList
            variant="line"
            className="calendar-section-tabs mb-4 h-auto w-full rounded-none bg-transparent p-0"
            aria-label="Calendar data view"
          >
            <TabsTrigger
              value="client-due-dates"
              className="calendar-section-tab flex-none rounded-none border-0 bg-transparent px-2 py-3 hover:bg-transparent"
            >
              Client Due Dates
            </TabsTrigger>
            <TabsTrigger
              value="deliverables"
              className="calendar-section-tab flex-none rounded-none border-0 bg-transparent px-2 py-3 hover:bg-transparent"
            >
              Deliverables
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {syncError && (
          <div
            className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
            role="status"
          >
            Airtable didn’t respond. Showing the last successful sync and
            retrying automatically.
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="calendar-toolbar-button min-w-10"
              onClick={() => navigatePeriod(-1)}
              aria-label={view === "month" ? "Previous month" : "Previous week"}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="calendar-toolbar-button"
              onClick={() => setFocusDate(new Date())}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="calendar-toolbar-button min-w-10"
              onClick={() => navigatePeriod(1)}
              aria-label={view === "month" ? "Next month" : "Next week"}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
            <h2 className="ml-1 text-lg font-semibold text-primary sm:ml-2 sm:text-xl">
              {periodTitle}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
              {(["month", "week"] as const).map(option => (
                <Button
                  key={option}
                  type="button"
                  variant={view === option ? "default" : "outline"}
                  size="sm"
                  className="calendar-toolbar-button min-h-8 border-0 px-3 py-1 capitalize"
                  aria-pressed={view === option}
                  onClick={() => setView(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
            <div className="calendar-summary-filter">
              <span className="calendar-summary-filter-label">Cards</span>
              <Select
                value={summaryFilter}
                onValueChange={value => {
                  if (value) setSummaryFilter(value as SummaryFilter);
                }}
              >
                <SelectTrigger
                  className="calendar-summary-filter-select"
                  aria-label="Filter summary cards"
                >
                  <SelectValue>
                    {calendarSection === "client-due-dates"
                      ? summaryFilter === "upcoming"
                        ? "Reports due"
                        : summaryFilter === "no-date"
                          ? "No report day set"
                          : "All cards"
                      : summaryFilter === "upcoming"
                        ? "This & next week"
                        : summaryFilter === "no-date"
                          ? "No date"
                          : summaryFilter === "this-week"
                            ? "This week"
                            : summaryFilter === "next-week"
                              ? "Next week"
                              : "All cards"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  {calendarSection === "client-due-dates" ? (
                    <>
                      <SelectItem value="upcoming">Reports due</SelectItem>
                      <SelectItem value="no-date">No report day set</SelectItem>
                      <SelectItem value="all">All cards</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="upcoming">
                        This &amp; next week
                      </SelectItem>
                      <SelectItem value="no-date">No date</SelectItem>
                      <SelectItem value="this-week">This week</SelectItem>
                      <SelectItem value="next-week">Next week</SelectItem>
                      <SelectItem value="all">All cards</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {calendarSection === "deliverables" && (
              <Button
                type="button"
                variant="outline"
                className="calendar-toolbar-button"
                aria-pressed={showDone}
                onClick={() => setShowDone(value => !value)}
              >
                {showDone ? (
                  <Eye className="size-4" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-4" aria-hidden="true" />
                )}
                {showDone ? "Hide Done" : "Show Done"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid items-start gap-4">
          <section aria-label={`${view} calendar`} className="min-w-0">
            {initialLoading ? (
              <div className="calendar-frame flex min-h-64 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Loading work items and report schedules from Airtable…
              </div>
            ) : view === "month" ? (
              <>
                <div className="calendar-frame hidden md:block">
                  <div className="weekday-row" aria-hidden="true">
                    {WEEKDAYS.map(day => (
                      <div key={day} className="weekday-label">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="month-grid">
                    {monthDays.map(date => {
                      const dateKey = format(date, "yyyy-MM-dd");
                      return (
                        <div
                          key={dateKey}
                          role="group"
                          className={[
                            "calendar-day",
                            isSameMonth(date, focusDate)
                              ? ""
                              : "calendar-day--outside",
                            dateKey === todayKey ? "calendar-day--today" : "",
                          ].join(" ")}
                          aria-label={format(date, "EEEE, MMMM d")}
                        >
                          <span className="calendar-day-number">
                            {format(date, "d")}
                          </span>
                          {renderCalendarItems(date, "calendar-task")}
                          {renderCalendarReports(date, "calendar-report")}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="calendar-frame px-4 md:hidden">
                  {monthEntries.length ? (
                    monthEntries.map(entry => (
                      <div className="mobile-agenda-day" key={entry.key}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {format(parseLocalDate(entry.dueDate), "EEE, MMM d")}
                        </p>
                        {entry.kind === "work" ? (
                          <WorkItemLink
                            item={entry.item}
                            variant="agenda-task"
                          />
                        ) : (
                          <ReportLink
                            report={entry.report}
                            variant="calendar-report"
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6">
                      <EmptyMessage>
                        {calendarSection === "deliverables"
                          ? showDone
                            ? "No dated deliverables this month."
                            : "No open deliverables this month."
                          : "No client due dates this month."}
                      </EmptyMessage>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="calendar-frame overflow-x-auto">
                <div className="week-grid">
                  {weekDays.map(date => {
                    const dateKey = format(date, "yyyy-MM-dd");
                    return (
                      <div
                        key={dateKey}
                        className={`week-day ${dateKey === todayKey ? "week-day--today" : ""}`}
                      >
                        <div className="mb-3 border-b border-border pb-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {format(date, "EEE")}
                          </p>
                          <p className="text-lg font-semibold text-primary">
                            {format(date, "MMM d")}
                          </p>
                        </div>
                        {calendarSection === "deliverables"
                          ? (renderCalendarItems(date, "agenda-task") ?? (
                              <span className="text-xs text-muted-foreground">
                                No items
                              </span>
                            ))
                          : (renderCalendarReports(date, "calendar-report") ?? (
                              <span className="text-xs text-muted-foreground">
                                No client due dates
                              </span>
                            ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
              {calendarSection === "deliverables" ? (
                <>
                  {STATUS_LABELS.map(status => (
                    <StatusIndicator key={status} status={status} />
                  ))}
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    Deliverables: {visibleItems.length} shown · {items.length}{" "}
                    total
                  </span>
                </>
              ) : (
                <>
                  <span className="report-legend">
                    <FileText className="size-3.5" aria-hidden="true" />
                    Monthly report schedule
                  </span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    Active client schedules: {reports.length}
                  </span>
                </>
              )}
            </div>
          </section>

          <aside
            className={`grid gap-4 sm:grid-cols-2 ${
              summaryFilter === "all" && calendarSection === "deliverables"
                ? "xl:grid-cols-4 2xl:grid-cols-5"
                : "xl:grid-cols-2"
            }`}
            aria-label={
              calendarSection === "client-due-dates"
                ? "Client report schedules"
                : "Upcoming deliverables and undated work"
            }
          >
            {calendarSection === "client-due-dates" &&
              (summaryFilter === "upcoming" || summaryFilter === "all") && (
                <CollapsiblePanel
                  title="Reports due"
                  count={
                    reportWindow.today.length +
                    reportWindow.thisWeek.length +
                    reportWindow.nextWeek.length
                  }
                  detail={`Today ${reportWindow.today.length} · This week ${reportWindow.thisWeek.length} · Next week ${reportWindow.nextWeek.length}`}
                >
                  {initialLoading ? (
                    <EmptyMessage>Loading report dates…</EmptyMessage>
                  ) : (
                    <>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Scheduled dates only; Airtable doesn’t track report
                        completion.
                      </p>
                      <div className="report-window-grid">
                        <div className="report-window-group">
                          <h3 className="text-xs font-semibold text-foreground">
                            Today
                          </h3>
                          {reportWindow.today.length ? (
                            reportWindow.today.map(report => (
                              <ReportLink
                                key={`${report.recordId}-${report.dueDate}`}
                                report={report}
                                variant="upcoming-report"
                              />
                            ))
                          ) : (
                            <EmptyMessage>No report dates today.</EmptyMessage>
                          )}
                        </div>
                        <div className="report-window-group">
                          <h3 className="text-xs font-semibold text-foreground">
                            This week
                          </h3>
                          {reportWindow.thisWeek.length ? (
                            reportWindow.thisWeek.map(report => (
                              <ReportLink
                                key={`${report.recordId}-${report.dueDate}`}
                                report={report}
                                variant="upcoming-report"
                              />
                            ))
                          ) : (
                            <EmptyMessage>
                              No other report dates this week.
                            </EmptyMessage>
                          )}
                        </div>
                        <div className="report-window-group">
                          <h3 className="text-xs font-semibold text-foreground">
                            Next week
                          </h3>
                          {reportWindow.nextWeek.length ? (
                            reportWindow.nextWeek.map(report => (
                              <ReportLink
                                key={`${report.recordId}-${report.dueDate}`}
                                report={report}
                                variant="upcoming-report"
                              />
                            ))
                          ) : (
                            <EmptyMessage>
                              No report dates next week.
                            </EmptyMessage>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CollapsiblePanel>
              )}

            {(summaryFilter === "no-date" || summaryFilter === "all") &&
              (calendarSection === "client-due-dates" ? (
                <CollapsiblePanel
                  title="No report day set"
                  count={missingReportDays.length}
                >
                  {initialLoading ? (
                    <EmptyMessage>Loading…</EmptyMessage>
                  ) : missingReportDays.length ? (
                    missingReportDays.map(report => (
                      <MissingReportDayLink
                        key={report.recordId}
                        report={report}
                      />
                    ))
                  ) : (
                    <EmptyMessage>
                      All active clients have a report day set.
                    </EmptyMessage>
                  )}
                </CollapsiblePanel>
              ) : (
                <CollapsiblePanel title="No date" count={noDateItems.length}>
                  {initialLoading ? (
                    <EmptyMessage>Loading…</EmptyMessage>
                  ) : noDateItems.length ? (
                    noDateItems.map(item => (
                      <WorkItemLink
                        key={item.recordId}
                        item={item}
                        variant="upcoming-record"
                      />
                    ))
                  ) : (
                    <EmptyMessage>Nothing without a due date.</EmptyMessage>
                  )}
                </CollapsiblePanel>
              ))}

            {calendarSection === "deliverables" &&
              (summaryFilter === "upcoming" ||
                summaryFilter === "this-week" ||
                summaryFilter === "all") && (
                <CollapsiblePanel
                  title="This week"
                  count={upcomingRanges.thisWeek.length}
                  detail={`${format(startOfWeek(now, { weekStartsOn: 0 }), "MMM d")} – ${format(endOfWeek(now, { weekStartsOn: 0 }), "MMM d")}`}
                >
                  {initialLoading ? (
                    <EmptyMessage>Loading…</EmptyMessage>
                  ) : upcomingRanges.thisWeek.length ? (
                    upcomingRanges.thisWeek.map(item => (
                      <WorkItemLink
                        key={item.recordId}
                        item={item}
                        variant="upcoming-record"
                        includeDate
                      />
                    ))
                  ) : (
                    <EmptyMessage>No dated work due this week.</EmptyMessage>
                  )}
                </CollapsiblePanel>
              )}

            {calendarSection === "deliverables" &&
              (summaryFilter === "upcoming" ||
                summaryFilter === "next-week" ||
                summaryFilter === "all") && (
                <CollapsiblePanel
                  title="Next week"
                  count={upcomingRanges.nextWeek.length}
                  detail={`${format(addDays(startOfWeek(now, { weekStartsOn: 0 }), 7), "MMM d")} – ${format(addDays(startOfWeek(now, { weekStartsOn: 0 }), 13), "MMM d")}`}
                >
                  {initialLoading ? (
                    <EmptyMessage>Loading…</EmptyMessage>
                  ) : upcomingRanges.nextWeek.length ? (
                    upcomingRanges.nextWeek.map(item => (
                      <WorkItemLink
                        key={item.recordId}
                        item={item}
                        variant="upcoming-record"
                        includeDate
                      />
                    ))
                  ) : (
                    <EmptyMessage>No dated work due next week.</EmptyMessage>
                  )}
                </CollapsiblePanel>
              )}
          </aside>
        </div>
      </div>
    </main>
  );
}
