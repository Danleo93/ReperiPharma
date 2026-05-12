"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { onCallRecordSchema } from "@/lib/validations/schemas";

export async function upsertOnCallRecordAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const input = onCallRecordSchema.parse({
    ...raw,
    shiftAssignmentId: raw.shiftAssignmentId || undefined,
  });

  const data = {
    calendarDayId: input.calendarDayId,
    siteId: input.siteId,
    pharmacistId: input.pharmacistId,
    shiftAssignmentId: input.shiftAssignmentId || null,
    startTime: input.startTime,
    endTime: input.endTime,
    department: input.department,
    physician: input.physician,
    notes: input.notes || null,
  };

  const membership = await prisma.pharmacistSite.count({
    where: {
      pharmacistId: input.pharmacistId,
      siteId: input.siteId,
    },
  });

  if (membership === 0) {
    throw new Error("Il farmacista selezionato non e associato al presidio della chiamata.");
  }

  if (input.id) {
    await prisma.onCallRecord.update({
      where: { id: input.id },
      data,
    });
  } else {
    await prisma.onCallRecord.create({ data });
  }

  revalidatePath("/chiamate");
  revalidatePath("/calendario-mensile");
  revalidatePath("/dashboard");
}

export async function deleteOnCallRecordAction(formData: FormData) {
  await prisma.onCallRecord.delete({
    where: { id: String(formData.get("id") ?? "") },
  });

  revalidatePath("/chiamate");
  revalidatePath("/calendario-mensile");
  revalidatePath("/dashboard");
}
