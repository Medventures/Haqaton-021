import assert from "node:assert/strict";
import { addDays, toDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { addMeltdown, assertJournalAccess, loadJournal, saveDailyEntry } from "@/lib/journal";
import type { CurrentUser } from "@/lib/auth";

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const created: string[] = [];

async function makeUser(role: CurrentUser["role"]): Promise<CurrentUser> {
  const user = await prisma.user.create({ data: { email: `${role}-${created.length}-${suffix}@example.test`, passwordHash: "test", name: role, role } });
  created.push(user.id);
  return { id: user.id, email: user.email, name: user.name, role };
}

async function main() {
  try {
    const parent = await makeUser("parent");
    const otherParent = await makeUser("parent");
    const specialist = await makeUser("specialist");
    await prisma.specialistProfile.create({ data: { userId: specialist.id, category: "psychologist", city: "Test", experienceYears: 1, aboutRu: "Test", aboutKk: "Test", education: "Test", contact: "Test", status: "approved" } });
    const record = await prisma.case.create({ data: { parentId: parent.id, childName: "Test child" } });
    const day = addDays(toDateOnly(new Date()), -1);

    await saveDailyEntry(record.id, { day, sleepHours: 6.5, mood: "difficult", notes: "Busy day" });
    await saveDailyEntry(record.id, { day, sleepHours: 7, mood: "mixed", notes: "Updated" });
    await addMeltdown(record.id, { day, time: "12:30", durationMinutes: 15, intensity: 2, triggers: ["noise", "fatigue"], before: "In a store", behavior: "Crying", response: "Quiet room", after: "Calm" });
    await addMeltdown(record.id, { day, time: "16:00", durationMinutes: null, intensity: 1, triggers: ["noise"], before: "At home", behavior: "Crying", response: "Break", after: "Calm" });

    const journal = await loadJournal(record.id);
    assert.equal(journal.days.length, 1);
    assert.equal(journal.days[0].sleepHours, 7);
    assert.equal(journal.meltdowns.length, 2);
    assert.deepEqual(journal.triggerCounts.slice(0, 2), [{ trigger: "noise", count: 2 }, { trigger: "fatigue", count: 1 }]);
    await assertJournalAccess(parent, record.id);
    await assert.rejects(() => assertJournalAccess(otherParent, record.id));
    await assert.rejects(() => assertJournalAccess(specialist, record.id));
    await prisma.caseSpecialistAccess.create({ data: { caseId: record.id, specialistId: specialist.id } });
    await assertJournalAccess(specialist, record.id);
    await prisma.specialistProfile.update({ where: { userId: specialist.id }, data: { status: "rejected" } });
    await assert.rejects(() => assertJournalAccess(specialist, record.id));
    await prisma.specialistProfile.update({ where: { userId: specialist.id }, data: { status: "approved" } });
    await prisma.caseSpecialistAccess.delete({ where: { caseId_specialistId: { caseId: record.id, specialistId: specialist.id } } });
    await assert.rejects(() => assertJournalAccess(specialist, record.id));
    console.log("Journal storage, trends, and access checks passed.");
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
