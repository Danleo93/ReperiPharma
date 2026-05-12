"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { generateCalendarYear } from "@/lib/db/calendar-generation";
import { assignmentSchema, calendarStatusSchema, calendarYearSchema } from "@/lib/validations/schemas";

export async function createCalendarYearAction(formData: FormData) {
  const input = calendarYearSchema.parse(Object.fromEntries(formData));
  await generateCalendarYear(input);
  revalidatePath("/calendari");
  revalidatePath("/calendario-mensile");
}

export async function updateCalendarStatusAction(formData: FormData) {
  const input = calendarStatusSchema.parse(Object.fromEntries(formData));

  await prisma.calendarYear.update({
    where: { id: input.id },
    data: { status: input.status },
  });

  revalidatePath("/calendari");
  revalidatePath("/calendario-mensile");
}

export async function deleteCalendarYearAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const confirmSensitiveDelete = formData.get("confirmSensitiveDelete") === "on";
  const calls = await prisma.onCallRecord.count({
    where: {
      calendarDay: {
        calendarYearId: id,
      },
    },
  });

  if (calls > 0 && !confirmSensitiveDelete) {
    throw new Error("Il calendario contiene chiamate: conferma esplicitamente l'eliminazione.");
  }

  await prisma.calendarYear.delete({ where: { id } });
  revalidatePath("/calendari");
}

export async function updateShiftAssignmentAction(formData: FormData) {
  const input = assignmentSchema.parse(Object.fromEntries(formData));
  const assignment = await prisma.shiftAssignment.findUniqueOrThrow({
    where: { id: input.id },
    select: { siteId: true },
  });

  if (input.pharmacistId) {
    const membership = await prisma.pharmacistSite.count({
      where: {
        pharmacistId: input.pharmacistId,
        siteId: assignment.siteId,
      },
    });

    if (membership === 0) {
      throw new Error("Il farmacista selezionato non e associato a questo presidio.");
    }
  }

  await prisma.shiftAssignment.update({
    where: { id: input.id },
    data: {
      pharmacistId: input.pharmacistId || null,
    },
  });

  revalidatePath("/calendario-mensile");
  revalidatePath("/dashboard");
}
