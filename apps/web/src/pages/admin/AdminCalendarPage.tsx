import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { eventApi } from "@/services/api";
import { AdminSeo, LoadingRows, PageHeading } from "@/components/admin/AdminUI";
import { cn } from "@/utils/cn";
import { BOOKING_STATUS_LABELS } from "@bandhan/shared";
import type { BookingStatus } from "@bandhan/shared";

const STATUS_DOT: Record<string, string> = {
  ENQUIRY: "bg-gray-400",
  QUOTATION_SENT: "bg-blue-400",
  NEGOTIATION: "bg-yellow-400",
  CONFIRMED: "bg-green-400",
  PLANNING: "bg-indigo-400",
  IN_PROGRESS: "bg-purple-400",
  COMPLETED: "bg-emerald-400",
  CANCELLED: "bg-red-400",
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const events = useQuery({
    queryKey: ["calendar", year, month],
    queryFn: () => eventApi.calendar(startDate, endDate),
  });

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Group events by day
  const eventsByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    if (events.data) {
      for (const e of events.data) {
        const day = new Date(e.eventDate).getDate();
        if (!map[day]) map[day] = [];
        map[day].push(e);
      }
    }
    return map;
  }, [events.data]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <>
      <AdminSeo title="Calendar" />
      <PageHeading
        eyebrow="Events"
        title="Event Calendar"
        description="Visual overview of upcoming and past events."
      />

      {/* Month Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded border border-forest/15 p-2 hover:bg-forest/5">
          <ChevronLeft className="h-4 w-4 text-forest" />
        </button>
        <h2 className="font-serif text-xl font-medium text-forest">{MONTHS[month]} {year}</h2>
        <button onClick={nextMonth} className="rounded border border-forest/15 p-2 hover:bg-forest/5">
          <ChevronRight className="h-4 w-4 text-forest" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="mt-4 border border-forest/10 bg-white">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-forest/10 bg-ivory/50">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="px-2 py-3 text-center text-xs font-medium text-forest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        {events.isLoading ? (
          <LoadingRows rows={5} columns={7} />
        ) : (
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-forest/5 bg-ivory/20" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = eventsByDay[day] || [];
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-[80px] border-b border-r border-forest/5 p-1",
                    isToday && "bg-forest/5"
                  )}
                >
                  <span className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday ? "bg-forest text-ivory" : "text-charcoal-muted"
                  )}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        to={`/admin/events/${e.id}`}
                        className="block truncate rounded px-1 py-0.5 text-[10px] hover:bg-forest/10"
                      >
                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1", STATUS_DOT[e.status] || "bg-gray-400")} />
                        {e.eventName}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="block px-1 text-[10px] text-charcoal-muted">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-charcoal-muted">
        {Object.entries(STATUS_DOT).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", color)} />
            {BOOKING_STATUS_LABELS[status as BookingStatus]}
          </span>
        ))}
      </div>
    </>
  );
}
