"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";
import {
  SPECIALIST_CATEGORIES,
  SPECIALIST_FORMATS,
  SPECIALIST_LANGUAGES,
  type SpecialistProfileInput,
} from "@/lib/specialists";
import { cn } from "@/lib/utils";

export type ProfileDraft = Omit<SpecialistProfileInput, "priceKzt" | "experienceYears"> & { priceKzt: string; experienceYears: string };

export const EMPTY_PROFILE: ProfileDraft = {
  category: "speech_therapist",
  city: "",
  experienceYears: "",
  aboutRu: "",
  aboutKk: "",
  education: "",
  priceKzt: "",
  formats: ["offline"],
  languages: ["ru", "kk"],
  contact: "",
};

export function toProfileInput(draft: ProfileDraft): SpecialistProfileInput {
  return {
    ...draft,
    experienceYears: Number(draft.experienceYears) || 0,
    priceKzt: draft.priceKzt.trim() ? Number(draft.priceKzt) : null,
  };
}

function Toggle<T extends string>({ values, selected, label, onChange }: { values: readonly T[]; selected: T[]; label: (value: T) => string; onChange: (next: T[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => {
        const active = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(active ? selected.filter((item) => item !== value) : [...selected, value])}
            className={cn(
              "h-9 rounded-full border px-3 text-sm",
              active ? "border-primary bg-primary text-primary-foreground" : "bg-white text-foreground hover:bg-muted",
            )}
          >
            {label(value)}
          </button>
        );
      })}
    </div>
  );
}

export function SpecialistProfileFields({ value, onChange }: { value: ProfileDraft; onChange: (next: ProfileDraft) => void }) {
  const { t } = useI18n();
  const set = <K extends keyof ProfileDraft>(key: K, next: ProfileDraft[K]) => onChange({ ...value, [key]: next });
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>{t.specialistCabinet.category}</Label>
          <Select value={value.category} onValueChange={(next) => set("category", next as ProfileDraft["category"])}>
            <SelectTrigger className="w-full bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPECIALIST_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {t.specialists.categories[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sp-city">{t.specialistCabinet.city}</Label>
          <Input id="sp-city" value={value.city} onChange={(event) => set("city", event.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sp-exp">{t.specialistCabinet.experienceYears}</Label>
          <Input
            id="sp-exp"
            type="number"
            min={0}
            max={60}
            value={value.experienceYears}
            onChange={(event) => set("experienceYears", event.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sp-price">{t.specialistCabinet.price}</Label>
          <Input id="sp-price" type="number" min={0} value={value.priceKzt} onChange={(event) => set("priceKzt", event.target.value)} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sp-about-ru">{t.specialistCabinet.aboutRu}</Label>
        <Textarea id="sp-about-ru" rows={3} value={value.aboutRu} onChange={(event) => set("aboutRu", event.target.value)} required minLength={20} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sp-about-kk">{t.specialistCabinet.aboutKk}</Label>
        <Textarea id="sp-about-kk" rows={3} value={value.aboutKk} onChange={(event) => set("aboutKk", event.target.value)} required minLength={20} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sp-edu">{t.specialistCabinet.education}</Label>
        <Textarea id="sp-edu" rows={2} value={value.education} onChange={(event) => set("education", event.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label>{t.specialistCabinet.formats}</Label>
        <Toggle values={SPECIALIST_FORMATS} selected={value.formats} label={(item) => t.specialists.formats[item]} onChange={(next) => set("formats", next)} />
      </div>
      <div className="grid gap-1.5">
        <Label>{t.specialistCabinet.languages}</Label>
        <Toggle values={SPECIALIST_LANGUAGES} selected={value.languages} label={(item) => t.specialists.languages[item]} onChange={(next) => set("languages", next)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="sp-contact">{t.specialistCabinet.contact}</Label>
        <Input
          id="sp-contact"
          value={value.contact}
          placeholder={t.specialistCabinet.contactPlaceholder}
          onChange={(event) => set("contact", event.target.value)}
          required
        />
      </div>
    </div>
  );
}
