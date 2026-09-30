export const EVENT_TYPES = ["meal", "training", "specialist", "medical", "medication", "sleep", "other"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type CalendarEventView = {
  id: string;
  caseId: string | null;
  childName: string | null;
  type: EventType;
  title: string;
  startsAt: string;
  endsAt: string | null;
  notes: string | null;
  ownerName: string;
  canDelete: boolean;
};
