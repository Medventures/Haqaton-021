"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseMedical, HeartHandshake, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EMPTY_PROFILE, SpecialistProfileFields, toProfileInput, type ProfileDraft } from "@/components/specialists/profile-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage, postJson } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

function Consent({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
      <Label htmlFor={id} className="text-sm leading-snug font-normal">
        <span>{children}</span>
      </Label>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const result = await postJson<{ redirect: string }>("/api/auth/login", { email, password });
          router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : result.redirect);
          router.refresh();
        } catch (error) {
          toast.error(errorMessage(error));
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <Button type="submit" className="h-11 text-base" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {t.auth.submitLogin}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t.common.register}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ initialRole }: { initialRole: "parent" | "specialist" }) {
  const router = useRouter();
  const { t } = useI18n();
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [childName, setChildName] = useState("");
  const [profile, setProfile] = useState<ProfileDraft>(EMPTY_PROFILE);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [representative, setRepresentative] = useState(false);
  const [accurate, setAccurate] = useState(false);
  const [busy, setBusy] = useState(false);

  const ready = acceptTerms && acceptPrivacy && (role === "parent" ? representative : accurate);

  return (
    <form
      className="grid gap-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) {
          toast.error(t.errors.consentRequired);
          return;
        }
        setBusy(true);
        try {
          const base = { name, email, password, phone: phone || undefined, acceptTerms, acceptPrivacy };
          const body =
            role === "parent"
              ? { ...base, role, childName, legalRepresentative: representative }
              : { ...base, role, accurateInfo: accurate, profile: toProfileInput(profile) };
          const result = await postJson<{ redirect: string }>("/api/auth/register", body);
          router.push(result.redirect);
          router.refresh();
        } catch (error) {
          toast.error(errorMessage(error));
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            { value: "parent", icon: HeartHandshake, title: t.auth.asParent, text: t.auth.asParentText },
            { value: "specialist", icon: BriefcaseMedical, title: t.auth.asSpecialist, text: t.auth.asSpecialistText },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRole(option.value)}
            className={cn(
              "flex items-start gap-3 rounded-xl border bg-white p-4 text-left transition",
              role === option.value ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/50",
            )}
          >
            <option.icon className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>
              <span className="block font-semibold">{option.title}</span>
              <span className="block text-xs text-muted-foreground">{option.text}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="reg-name">{t.auth.name}</Label>
          <Input id="reg-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reg-email">{t.auth.email}</Label>
          <Input id="reg-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reg-phone">{t.auth.phone}</Label>
          <Input id="reg-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="reg-password">{t.auth.password}</Label>
          <Input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <span className="text-xs text-muted-foreground">{t.auth.passwordHint}</span>
        </div>
        {role === "parent" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="reg-child">{t.auth.childName}</Label>
            <Input id="reg-child" value={childName} onChange={(event) => setChildName(event.target.value)} required />
          </div>
        ) : null}
      </div>

      {role === "specialist" ? (
        <div className="rounded-xl border bg-white/60 p-4">
          <h2 className="mb-3 font-semibold">{t.auth.specialistSection}</h2>
          <SpecialistProfileFields value={profile} onChange={setProfile} />
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border bg-white p-4">
        <Consent id="c-terms" checked={acceptTerms} onChange={setAcceptTerms}>
          {t.auth.acceptTermsPrefix}{" "}
          <Link href="/legal/terms" target="_blank" className="text-primary underline">
            {t.auth.termsLink}
          </Link>
        </Consent>
        <Consent id="c-privacy" checked={acceptPrivacy} onChange={setAcceptPrivacy}>
          {t.auth.acceptPrivacyPrefix}{" "}
          <Link href="/legal/privacy" target="_blank" className="text-primary underline">
            {t.auth.privacyLink}
          </Link>
          {role === "parent" ? t.auth.acceptPrivacySuffix : ""}
        </Consent>
        {role === "parent" ? (
          <Consent id="c-rep" checked={representative} onChange={setRepresentative}>
            {t.auth.legalRepresentative}
          </Consent>
        ) : (
          <Consent id="c-accurate" checked={accurate} onChange={setAccurate}>
            {t.auth.accurateInfo}
          </Consent>
        )}
      </div>

      <Button type="submit" className="h-11 text-base" disabled={busy || !ready}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {t.auth.submitRegister}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t.common.login}
        </Link>
      </p>
    </form>
  );
}
