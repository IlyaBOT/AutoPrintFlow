import { Role } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { getEnv } from "../src/lib/env";
import { prisma } from "../src/lib/prisma";

async function main() {
  const env = getEnv();

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL.toLowerCase() },
    update: {
      name: "AutoPrintFlow Admin",
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      name: "AutoPrintFlow Admin",
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: Role.ADMIN,
    },
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
