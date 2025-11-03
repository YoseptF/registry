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
        .from("class_enrollments")
        .select("id, class_session_id, checked_in")
        .eq("user_id", profile.id);

      if (enrollmentsError) throw enrollmentsError;

      const enrollmentMap = new Map(
        enrollmentsData?.map((e) => [e.class_session_id, { id: e.id, checked_in: e.checked_in }]) || []
      );

      const sessionsWithEnrollment = (sessionsData || []).map((session) => {
        const enrollment = enrollmentMap.get(session.id);
        return {
          ...session,
          isEnrolled: !!enrollment,
          enrollmentId: enrollment?.id,
          checked_in: enrollment?.checked_in,
        };
      });

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

  const handleRescheduleClick = async (session: ClassSessionWithDetails) => {
    if (!session.isEnrolled || !session.enrollmentId || session.checked_in) return;

    setSelectedSession(session);
    setNewSessionDate(undefined);
    setRescheduleReason("");

    // Load available sessions for the same class
    const { data: availableSessionsData, error } = await supabase
      .from("class_sessions")
      .select("*")
      .eq("class_id", session.class_id)
      .gte("session_date", new Date().toISOString().split('T')[0])
      .neq("id", session.id)
      .order("session_date", { ascending: true })
      .limit(30);

    if (!error && availableSessionsData) {
      setAvailableSessions(availableSessionsData);
    }

    setRescheduleDialogOpen(true);
  };

  const handleRescheduleSubmit = async () => {
    if (!selectedSession || !newSessionDate || !profile) return;

    setSubmitting(true);
    try {
      // Find the session for the selected date
      const targetSession = availableSessions.find(s =>
        isSameDay(parseISO(s.session_date), newSessionDate)
      );

      if (!targetSession) {
        toast.error(t("errors.sessionNotFound"));
        return;
      }

      // Create reschedule request
      const { error } = await supabase
        .from("reschedule_requests")
        .insert({
          enrollment_id: selectedSession.enrollmentId,
          user_id: profile.id,
          current_session_id: selectedSession.id,
          requested_session_id: targetSession.id,
          reason: rescheduleReason,
          status: "pending",
        });

      if (error) throw error;

      toast.success(t("reschedule.requestSubmitted"));
      setRescheduleDialogOpen(false);
      loadSessions(); // Reload to show updated state
    } catch (error) {
      console.error("Error submitting reschedule request:", error);
      toast.error(t("reschedule.requestError"));
    } finally {
      setSubmitting(false);
    }
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
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold truncate">
                                {session.class.name}
                              </div>
                              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(session.session_date), "HH:mm")}</span>
                              </div>
                            </div>
                            {session.isEnrolled && !session.checked_in && (
                              <button
                                onClick={() => handleRescheduleClick(session)}
                                className="flex-shrink-0 p-1 hover:bg-pink-200 dark:hover:bg-pink-800 rounded transition-colors"
                                title={t("reschedule.requestReschedule")}
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            )}
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

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("reschedule.requestReschedule")}</DialogTitle>
            <DialogDescription>
              {selectedSession && (
                <span>
                  {t("reschedule.rescheduleDescription")} <strong>{selectedSession.class.name}</strong> on{" "}
                  <strong>{format(parseISO(selectedSession.session_date), "MMMM d, yyyy")}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">{t("reschedule.reason")}</Label>
              <Textarea
                id="reason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder={t("reschedule.reasonPlaceholder")}
                rows={3}
              />
            </div>

            <div>
              <Label>{t("reschedule.selectNewDate")}</Label>
              <CalendarComponent
                mode="single"
                selected={newSessionDate}
                onSelect={setNewSessionDate}
                disabled={(date) => {
                  const hasSession = availableSessions.some(s =>
                    isSameDay(parseISO(s.session_date), date)
                  );
                  return !hasSession || date < new Date(new Date().setHours(0, 0, 0, 0));
                }}
                modifiers={{
                  available: (date) => availableSessions.some(s =>
                    isSameDay(parseISO(s.session_date), date)
                  )
                }}
                modifiersClassNames={{
                  available: "bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 font-semibold"
                }}
                className="rounded-md border"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {t("reschedule.highlightedDatesInfo")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleDialogOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleRescheduleSubmit}
              disabled={!newSessionDate || submitting}
            >
              {submitting ? t("common.submitting") : t("reschedule.submitRequest")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
