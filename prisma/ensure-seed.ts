import { prisma } from "../lib/db";
import { ensureBuiltInQuestions } from "../lib/interview/questions";
import { SEED_ACCOUNTS, SEED_PASSWORD, isDatabaseEmpty, seedDemo } from "../lib/seed";

async function main() {
  const force = process.env.RESEED_ON_START === "true";
  if (force || (await isDatabaseEmpty())) {
    await seedDemo();
    const lines = SEED_ACCOUNTS.map((account) => `  ${account.role.padEnd(11)} ${account.email}`);
    process.stdout.write(`Тестовые данные и аккаунты ролей созданы. Пароль: ${SEED_PASSWORD}\n${lines.join("\n")}\n`);
    return;
  }
  await ensureBuiltInQuestions();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
