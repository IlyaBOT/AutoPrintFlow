import "dotenv/config";
import { Role } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { getEnv } from "../src/lib/env";
import { prisma } from "../src/lib/prisma";

async function main() {
  const env = getEnv();

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    update: {},
    create: {
      name: "AutoPrintFlow Admin",
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
    },
  });

  const profiles = [
    {
      slug: "sticker-stripe",
      name: "Sticker stripe / A4",
      description: "Current queue-based sticker stripe and A4 sheet workflow.",
      type: "STICKER_STRIPE" as const,
      productionUnit: "SHEET" as const,
      acceptsMaterials: false,
      materials: [],
    },
    {
      slug: "laser-mono",
      name: "Laser B/W printer",
      description: "PNG, PDF, or DOCX jobs for monochrome laser printing.",
      type: "LASER_MONO" as const,
      productionUnit: "SHEET" as const,
      acceptsMaterials: false,
      materials: [],
    },
    {
      slug: "photo-a4",
      name: "Matte A4 photo print",
      description: "Photo print workflow with selectable paper materials.",
      type: "PHOTO_A4" as const,
      productionUnit: "SHEET" as const,
      acceptsMaterials: true,
      materials: [
        {
          name: "Office paper",
          weightGsm: 80,
          finish: "Plain",
          isDefault: true,
          sortOrder: 0,
        },
        {
          name: "Matte photo paper",
          weightGsm: 220,
          finish: "Matte",
          isDefault: false,
          sortOrder: 1,
        },
        {
          name: "Glossy photo paper",
          weightGsm: 230,
          finish: "Glossy",
          isDefault: false,
          sortOrder: 2,
        },
        {
          name: "Self-adhesive office paper",
          weightGsm: 80,
          finish: "Adhesive",
          isDefault: false,
          sortOrder: 3,
        },
      ],
    },
    {
      slug: "disc-print",
      name: "CD / DVD print",
      description:
        "Disc-centric print workflow counted in discs instead of sheets.",
      type: "DISC_PRINT" as const,
      productionUnit: "DISK" as const,
      acceptsMaterials: false,
      materials: [],
    },
    {
      slug: "business-card",
      name: "Business cards",
      description: "Card-based print workflow counted in plastic cards.",
      type: "BUSINESS_CARD" as const,
      productionUnit: "CARD" as const,
      acceptsMaterials: false,
      materials: [],
    },
  ];

  await prisma.$transaction(async (tx) => {
    for (const { materials, ...profile } of profiles) {
      const [createdProfile] = await tx.printProfile.createManyAndReturn({
        data: profile,
        skipDuplicates: true,
        select: { id: true },
      });

      if (createdProfile && materials.length > 0) {
        await tx.printMaterial.createMany({
          data: materials.map((material) => ({
            ...material,
            profileId: createdProfile.id,
          })),
        });
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
