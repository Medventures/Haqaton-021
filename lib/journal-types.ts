export const TRIGGERS = ["noise", "crowd", "change", "waiting", "hunger", "fatigue", "sensory", "communication", "unknown", "other"] as const;
export const MOODS = ["calm", "mixed", "difficult"] as const;
export type Trigger = (typeof TRIGGERS)[number];
