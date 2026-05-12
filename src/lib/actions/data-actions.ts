"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { applyHolidayToExistingCalendars } from "@/lib/db/calendar-generation";
import { generatePharmacistInitials } from "@/lib/domain";
import { holidaySchema, pharmacistSchema, settingsSchema, siteSchema } from "@/lib/validations/schemas";

export async function upsertPharmacistAction(formData: FormData) {
  const input = pharmacistSchema.parse({
    ...Object.fromEntries(formData),
    siteIds: formData.getAll("siteIds").map(String),
  });
  const initials = (input.initials || generatePharmacistInitials(input.firstName, input.lastName)).toUpperCase();

  if (input.id) {
    await prisma.$transaction(async (tx) => {
      await tx.pharmacist.update({
        where: { id: input.id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          initials,
          color: input.color,
        },
      });
      await tx.pharmacistSite.deleteMany({ where: { pharmacistId: input.id } });
      if (input.siteIds.length > 0) {
        await tx.pharmacistSite.createMany({
          data: input.siteIds.map((siteId) => ({
            pharmacistId: input.id!,
            siteId,
          })),
          skipDuplicates: true,
        });
      }
    });
  } else {
    await prisma.pharmacist.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        initials,
        color: input.color,
        sites: {
          create: input.siteIds.map((siteId) => ({
            siteId,
          })),
        },
      },
    });
  }

  revalidatePath("/dati/farmacisti");
  revalidatePath("/calendario-mensile");
  revalidatePath("/chiamate");
  revalidatePath("/dashboard");
}

export async function setPharmacistActiveAction(formData: FormData) {
  await prisma.pharmacist.update({
    where: { id: String(formData.get("id") ?? "") },
    data: { active: formData.get("active") === "true" },
  });
  revalidatePath("/dati/farmacisti");
}

export async function upsertSiteAction(formData: FormData) {
  const input = siteSchema.parse(Object.fromEntries(formData));

  if (input.id) {
    await prisma.site.update({
      where: { id: input.id },
      data: { name: input.name },
    });
  } else {
    await prisma.site.create({
      data: { name: input.name },
    });
  }

  revalidatePath("/dati/presidi");
  revalidatePath("/calendari");
}

export async function setSiteActiveAction(formData: FormData) {
  await prisma.site.update({
    where: { id: String(formData.get("id") ?? "") },
    data: { active: formData.get("active") === "true" },
  });
  revalidatePath("/dati/presidi");
  revalidatePath("/calendari");
}

export async function deleteSiteAction(formData: FormData) {
  await prisma.site.delete({
    where: { id: String(formData.get("id") ?? "") },
  });
  revalidatePath("/dati/presidi");
}

export async function upsertHolidayAction(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const input = holidaySchema.parse({
    ...raw,
    siteId: raw.siteId === "__all" ? undefined : raw.siteId,
    type: raw.type || "MANUAL",
    confirmOverwrite: formData.get("confirmOverwrite") === "on",
  });

  const data = {
    date: input.date,
    name: input.name,
    score: input.score,
    type: input.type,
    siteId: input.siteId || null,
    defaultShiftFramework: input.defaultShiftFramework,
  };

  const holiday = input.id
    ? await prisma.holiday.update({ where: { id: input.id }, data })
    : await prisma.holiday.create({ data });

  await applyHolidayToExistingCalendars({
    holidayId: holiday.id,
    confirmOverwrite: input.confirmOverwrite,
  });

  revalidatePath("/dati/festivi");
  revalidatePath("/calendario-mensile");
  revalidatePath("/dashboard");
}

export async function updateSettingsAction(formData: FormData) {
  const input = settingsSchema.parse(Object.fromEntries(formData));
  const existing = input.id ? await prisma.settings.findUnique({ where: { id: input.id } }) : await prisma.settings.findFirst();
  const data = {
    dayOnCallStartTime: input.dayOnCallStartTime,
    dayOnCallEndTime: input.dayOnCallEndTime,
    nightOnCallStartTime: input.nightOnCallStartTime,
    nightOnCallEndTime: input.nightOnCallEndTime,
    holidayScoreMode: input.holidayScoreMode,
  };

  if (existing) {
    await prisma.settings.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.settings.create({ data });
  }

  revalidatePath("/impostazioni");
}
