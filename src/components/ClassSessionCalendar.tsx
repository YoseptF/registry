import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ChevronLeft, ChevronRight, Clock, RefreshCw } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import type { ClassSession, Class } from "@/types";
import { toast } from "sonner";

interface ClassSessionWithDetails extends ClassSession {
  class: Class;
  isEnrolled?: boolean;
  enrollmentId?: string;
}

export function ClassSessionCalendar() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessions, setSessions] = useState<ClassSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSessionWithDetails | null>(null);
  const [newSessionDate, setNewSessionDate] = useState<Date | undefined>();
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [availableSessions, setAvailableSessions] = useState<ClassSession[]>([]);

  useEffect(() => {
    loadSessions();
  }, [currentMonth, profile]);

  const loadSessions = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Get all class sessions in the current month
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("class_sessions")
        .select("*, class:classes(*)")
        .gte("session_date", monthStart.toISOString())
        .lte("session_date", monthEnd.toISOString())
        .order("session_date", { ascending: true });

      if (sessionsError) throw sessionsError;

      // Get user's enrollments
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("class_session_id")
        .eq("user_id", profile.id);

      if (enrollmentsError) throw enrollmentsError;

      const enrolledSessionIds = new Set(
        enrollmentsData?.map((e) => e.class_session_id) || []
      );

      const sessionsWithEnrollment = (sessionsData || []).map((session) => ({
        ...session,
        isEnrolled: enrolledSessionIds.has(session.id),
      }));

      setSessions(sessionsWithEnrollment);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const getSessionsForDay = (day: Date) => {
    return sessions.filter((session) =>
      isSameDay(new Date(session.session_date), day)
    );
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const days = getDaysInMonth();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("user.myClasses")}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const daySessions = getSessionsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] border rounded-lg p-2 ${
                      isCurrentMonth
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-900"
                    } ${isToday ? "border-pink-600 border-2" : "border-gray-200 dark:border-gray-700"}`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isCurrentMonth
                          ? "text-gray-900 dark:text-gray-100"
                          : "text-gray-400 dark:text-gray-600"
                      } ${isToday ? "text-pink-600 font-bold" : ""}`}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="space-y-1">
                      {daySessions.map((session) => (
                        <div
                          key={session.id}
                          className={`text-xs p-1 rounded ${
                            session.isEnrolled
                              ? "bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 border border-pink-300 dark:border-pink-700"
                              : "bg-gray-100 dark:bg-gray-700"
                          }`}
                        >
                          <div className="font-semibold truncate">
                            {session.class.name}
                          </div>
                          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{format(new Date(session.session_date), "HH:mm")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 border border-pink-300 dark:border-pink-700"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("user.myClasses")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("common.available")}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
