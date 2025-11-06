import type { Class, ClassSession } from "../types";

interface GenerateSessionsOptions {
  startDate: Date;
  endDate: Date;
  class: Class;
}

interface SessionDate {
  date: Date;
  time: string;
}

export const DAY_NAME_TO_ISO_DAY: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function generateSessionsFromSchedule({
  startDate,
  endDate,
  class: classData,
}: GenerateSessionsOptions): SessionDate[] {
  if (!classData.schedule_days || classData.schedule_days.length === 0) {
    console.debug("No schedule_days defined for class:", classData.id);
    return [];
  }

  const sessions: SessionDate[] = [];
  const sessionTime = classData.schedule_time || "18:00";

  classData.schedule_days.forEach((dayName) => {
    const targetDayOfWeek = DAY_NAME_TO_ISO_DAY[dayName.toLowerCase()];

    if (targetDayOfWeek === undefined) {
      console.debug(`Invalid day name: ${dayName}`);
      return;
    }

    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    const currentDayOfWeek = currentDate.getDay();
    let daysUntilTarget = targetDayOfWeek - currentDayOfWeek;

    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    }

    if (daysUntilTarget > 0) {
      currentDate.setDate(currentDate.getDate() + daysUntilTarget);
    }

    while (currentDate <= endDate) {
      sessions.push({
        date: new Date(currentDate),
        time: sessionTime,
      });

      currentDate.setDate(currentDate.getDate() + 7);
    }
  });

  sessions.sort((a, b) => a.date.getTime() - b.date.getTime());

  return sessions;
}

export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatSessionDate(date: Date): string {
  return formatDateLocal(date);
}

export function formatSessionDateTime(date: Date, time: string): string {
  return `${formatSessionDate(date)} ${time}`;
}

export function isSessionInPast(
  sessionDate: string,
  sessionTime: string
): boolean {
  const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
  return sessionDateTime < new Date();
}

export function canRescheduleSession(
  sessionDate: string,
  sessionTime: string
): boolean {
  const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
  const now = new Date();
  const hoursUntilSession =
    (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilSession >= 24;
}

export function getSessionsForDateRange(
  classData: Class,
  startDate: Date,
  endDate: Date
): SessionDate[] {
  return generateSessionsFromSchedule({
    startDate,
    endDate,
    class: classData,
  });
}

export function getSessionsForWeek(
  classData: Class,
  weekStart: Date
): SessionDate[] {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return getSessionsForDateRange(classData, weekStart, weekEnd);
}

export function getSessionsForMonth(
  classData: Class,
  month: Date
): SessionDate[] {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  return getSessionsForDateRange(classData, monthStart, monthEnd);
}

export function getUpcomingSessions(
  classData: Class,
  limit: number = 10
): SessionDate[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDate = new Date(today);
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const allSessions = getSessionsForDateRange(classData, today, futureDate);

  const upcomingSessions = allSessions.filter((session) => {
    const sessionDateTime = new Date(
      `${formatSessionDate(session.date)}T${session.time}`
    );
    return sessionDateTime > new Date();
  });

  return upcomingSessions.slice(0, limit);
}

export function groupSessionsByDate(
  sessions: ClassSession[]
): Map<string, ClassSession[]> {
  const grouped = new Map<string, ClassSession[]>();

  sessions.forEach((session) => {
    const dateKey = session.session_date;
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(session);
  });

  return grouped;
}

export function getDayOfWeekName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

export function getWeekBoundaries(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getCurrentWeekBoundaries(): { start: Date; end: Date } {
  return getWeekBoundaries(new Date());
}

export function getPaymentWeekBoundaries(paymentDayOfWeek: number = 5): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const currentDayOfWeek = now.getDay();

  let daysUntilPaymentDay = paymentDayOfWeek - currentDayOfWeek;
  if (daysUntilPaymentDay <= 0) {
    daysUntilPaymentDay += 7;
  }

  const nextPaymentDay = new Date(now);
  nextPaymentDay.setDate(now.getDate() + daysUntilPaymentDay);
  nextPaymentDay.setHours(0, 0, 0, 0);

  const weekStart = new Date(nextPaymentDay);
  weekStart.setDate(weekStart.getDate() - 6);

  return { start: weekStart, end: nextPaymentDay };
}
