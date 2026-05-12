import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  assertCalendarYearNotDuplicated,
  buildYearPlan,
  dateKey,
  getItalianNationalHolidays,
  monthDateRange,
  shiftTypesForFramework,
} from "@/lib/domain";
import type { ShiftFramework } from "@/lib/domain";

async function ensureNationalHolidays(year: number, tx: Prisma.TransactionClient = prisma) {
  const seeds = getItalianNationalHolidays(year);
  const holidays = [];

  for (const seed of seeds) {
    const existing = await tx.holiday.findFirst({
      where: {
        date: seed.date,
        type: "NATIONAL",
        siteId: null,
        name: seed.name,
      },
    });

    if (existing) {
      holidays.push(
        await tx.holiday.update({
          where: { id: existing.id },
          data: {
            score: seed.score,
            defaultShiftFramework: seed.defaultShiftFramework,
          },
        }),
      );
      continue;
    }

    holidays.push(
      await tx.holiday.create({
        data: {
          date: seed.date,
          name: seed.name,
          score: seed.score,
          type: seed.type,
          defaultShiftFramework: seed.defaultShiftFramework,
        },
      }),
    );
  }

  return holidays;
}

export async function generateCalendarYear(input: { year: number; siteId: string }) {
  const { year, siteId } = input;
  const { start } = monthDateRange(year, 1);
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.calendarYear.findUnique({
      where: { year_siteId: { year, siteId } },
    });

    assertCalendarYearNotDuplicated(duplicate ? [duplicate] : [], year, siteId);

    await ensureNationalHolidays(year, tx);

    const holidays = await tx.holiday.findMany({
      where: {
        date: { gte: start, lt: yearEnd },
        OR: [{ siteId: null }, { siteId }],
      },
    });

    const calendarYear = await tx.calendarYear.create({
      data: {
        year,
        siteId,
        status: "DRAFT",
      },
    });

    const dayPlans = buildYearPlan(year, siteId, holidays);

    await tx.calendarDay.createMany({
      data: dayPlans.map((dayPlan) => ({
        calendarYearId: calendarYear.id,
        date: dayPlan.date,
        dayOfWeek: dayPlan.dayOfWeek,
        dayType: dayPlan.dayType,
        holidayId: dayPlan.holiday?.id,
        shiftFramework: dayPlan.shiftFramework,
      })),
    });

    const createdDays = await tx.calendarDay.findMany({
      where: { calendarYearId: calendarYear.id },
      select: { id: true, date: true },
    });
    const dayIdByDate = new Map(createdDays.map((day) => [dateKey(day.date), day.id]));

    await tx.shiftAssignment.createMany({
      data: dayPlans.flatMap((dayPlan) => {
        const calendarDayId = dayIdByDate.get(dateKey(dayPlan.date));
        if (!calendarDayId) {
          throw new Error(`Giorno non trovato dopo la generazione: ${dateKey(dayPlan.date)}`);
        }

        return dayPlan.shiftTypes.map((shiftType) => ({
          calendarDayId,
          siteId,
          shiftType,
        }));
      }),
    });

    return tx.calendarYear.findUniqueOrThrow({
      where: { id: calendarYear.id },
      include: {
        site: true,
        _count: {
          select: {
            days: true,
          },
        },
      },
    });
  }, { timeout: 20_000 });
}

export async function applyHolidayToExistingCalendars(input: {
  holidayId: string;
  confirmOverwrite?: boolean;
}) {
  const holiday = await prisma.holiday.findUniqueOrThrow({
    where: { id: input.holidayId },
  });

  const start = new Date(Date.UTC(holiday.date.getUTCFullYear(), holiday.date.getUTCMonth(), holiday.date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const affectedDays = await prisma.calendarDay.findMany({
    where: {
      date: { gte: start, lt: end },
      calendarYear: holiday.siteId ? { siteId: holiday.siteId } : undefined,
    },
    include: {
      calendarYear: true,
      assignments: true,
    },
  });

  const targetShiftTypes = shiftTypesForFramework(holiday.defaultShiftFramework as ShiftFramework);

  const conflicts = affectedDays.filter((day) =>
    day.assignments.some(
      (assignment) => assignment.pharmacistId && !targetShiftTypes.includes(assignment.shiftType as never),
    ),
  );

  if (conflicts.length > 0 && !input.confirmOverwrite) {
    throw new Error("Il nuovo framework eliminerebbe assegnazioni esistenti. Conferma la sovrascrittura.");
  }

  for (const day of affectedDays) {
    await prisma.$transaction(async (tx) => {
      await tx.calendarDay.update({
        where: { id: day.id },
        data: {
          holidayId: holiday.id,
          dayType:
            holiday.type === "NATIONAL"
              ? "NATIONAL_HOLIDAY"
              : holiday.type === "LOCAL"
                ? "LOCAL_HOLIDAY"
                : holiday.type === "COMPANY"
                  ? "COMPANY_HOLIDAY"
                  : "MANUAL_HOLIDAY",
          shiftFramework: holiday.defaultShiftFramework,
        },
      });

      await tx.shiftAssignment.deleteMany({
        where: {
          calendarDayId: day.id,
          shiftType: { notIn: targetShiftTypes },
        },
      });

      for (const shiftType of targetShiftTypes) {
        await tx.shiftAssignment.upsert({
          where: {
            calendarDayId_shiftType: {
              calendarDayId: day.id,
              shiftType,
            },
          },
          update: {},
          create: {
            calendarDayId: day.id,
            siteId: day.calendarYear.siteId,
            shiftType,
          },
        });
      }
    });
  }
}
