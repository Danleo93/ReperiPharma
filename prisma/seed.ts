import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generatePharmacistInitials } from "../src/lib/domain/initials";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? "",
  }),
});

const pharmacistSeeds = [
  { firstName: "Mario", lastName: "Rossi", color: "#0f766e" },
  { firstName: "Anna Maria", lastName: "Bianchi", color: "#2563eb" },
  { firstName: "Giulia", lastName: "Ferraro", color: "#7c3aed" },
  { firstName: "Luca", lastName: "Romano", color: "#dc2626" },
];

async function main() {
  const sites = [];
  for (const name of ["Cervello", "Villa Sofia"]) {
    const site = await prisma.site.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
    sites.push(site);
  }

  for (const pharmacist of pharmacistSeeds) {
    const initials = generatePharmacistInitials(pharmacist.firstName, pharmacist.lastName);

    const createdPharmacist = await prisma.pharmacist.upsert({
      where: {
        id: `seed-${initials.toLowerCase()}`,
      },
      update: {
        firstName: pharmacist.firstName,
        lastName: pharmacist.lastName,
        initials,
        color: pharmacist.color,
        active: true,
      },
      create: {
        id: `seed-${initials.toLowerCase()}`,
        firstName: pharmacist.firstName,
        lastName: pharmacist.lastName,
        initials,
        color: pharmacist.color,
        active: true,
      },
    });

    for (const site of sites) {
      await prisma.pharmacistSite.upsert({
        where: {
          pharmacistId_siteId: {
            pharmacistId: createdPharmacist.id,
            siteId: site.id,
          },
        },
        update: {},
        create: {
          pharmacistId: createdPharmacist.id,
          siteId: site.id,
        },
      });
    }
  }

  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        dayOnCallStartTime: "08:00",
        dayOnCallEndTime: "20:00",
        nightOnCallStartTime: "20:00",
        nightOnCallEndTime: "08:00",
        holidayScoreMode: "SPLIT_BETWEEN_ON_CALL_SHIFTS",
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
