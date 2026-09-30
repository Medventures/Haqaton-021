import { prisma } from "../lib/db";
import { SEED_ACCOUNTS, SEED_PASSWORD, seedDemo } from "../lib/seed";

seedDemo()
  .then(() => {
    const lines = SEED_ACCOUNTS.map((account) => `  ${account.role.padEnd(11)} ${account.email}`);
    process.stdout.write(`Тестовые данные созданы. Пароль для всех аккаунтов: ${SEED_PASSWORD}\n${lines.join("\n")}\n`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
