import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  ClipboardCheck,
  HeartPulse,
  Landmark,
  ListChecks,
  MessagesSquare,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SpecialistCardView } from "@/components/specialists/specialist-card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getI18n } from "@/lib/i18n/server";
import { cabinetPath } from "@/lib/session";
import { formatPrice, toSpecialistCard } from "@/lib/specialists";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const STEP_ICONS = [MessagesSquare, ListChecks, ClipboardCheck, CalendarClock];

function SystemCard({ icon: Icon, title, text, tone }: { icon: typeof Stethoscope; title: string; text: string; tone: string }) {
  return (
    <div className={`relative z-10 rounded-xl border bg-white p-2 text-center shadow-sm sm:p-3 ${tone}`}>
      <Icon className="mx-auto mb-1 size-5" />
      <div className="text-xs font-semibold sm:text-sm">{title}</div>
      <div className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{text}</div>
    </div>
  );
}

export default async function LandingPage() {
  const [{ locale, t }, user] = await Promise.all([getI18n(), getCurrentUser()]);
  const profiles = await prisma.specialistProfile.findMany({
    where: { status: "approved" },
    include: { user: { select: { name: true } }, reviews: { select: { rating: true, status: true } } },
    orderBy: { createdAt: "asc" },
    take: 4,
  });
  const cards = profiles.map((profile) => toSpecialistCard(profile, locale));

  return (
    <AppShell user={user}>
      <section className="grid items-center gap-10 py-6 md:grid-cols-2 md:py-12">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            {t.landing.badge}
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            AqylRoute <span className="text-primary">AI</span>
          </h1>
          <p className="mt-3 text-lg text-foreground/80 sm:text-xl">{t.landing.subtitle}</p>
          <blockquote className="mt-6 border-l-4 border-primary bg-white/70 py-3 pr-3 pl-4 text-base font-medium">{t.landing.thesis}</blockquote>
          <p className="mt-6 text-sm text-muted-foreground">{t.landing.problem}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <Link
                href={cabinetPath(user.role)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t.landing.ctaCabinet} <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t.landing.ctaRegister} <ArrowRight className="size-4" />
                </Link>
                <Link href="/login" className="inline-flex h-11 items-center rounded-lg border bg-white px-5 text-sm font-medium hover:bg-muted">
                  {t.landing.ctaLogin}
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="relative mx-auto grid w-full max-w-md grid-cols-3 grid-rows-3 items-center gap-2 sm:gap-4">
          <svg className="absolute inset-0 size-full" viewBox="0 0 300 300" preserveAspectRatio="none" aria-hidden>
            <g stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-primary/40">
              <line x1="150" y1="150" x2="150" y2="45" />
              <line x1="150" y1="150" x2="50" y2="255" />
              <line x1="150" y1="150" x2="250" y2="255" />
            </g>
          </svg>
          <div className="col-start-2 row-start-1">
            <SystemCard icon={Stethoscope} title={t.tracks.medical} text={t.landing.systemsMedical} tone="text-sky-700" />
          </div>
          <div className="relative z-10 col-start-2 row-start-2 flex aspect-square flex-col items-center justify-center rounded-full bg-primary p-2 text-center text-primary-foreground shadow-lg ring-8 ring-primary/15">
            <HeartPulse className="mb-1 size-6" />
            <div className="text-xs font-semibold leading-tight sm:text-sm">{t.landing.systemsChild}</div>
          </div>
          <div className="col-start-1 row-start-3">
            <SystemCard icon={BookOpen} title={t.tracks.education} text={t.landing.systemsEducation} tone="text-violet-700" />
          </div>
          <div className="col-start-3 row-start-3">
            <SystemCard icon={Landmark} title={t.tracks.social} text={t.landing.systemsSocial} tone="text-teal-700" />
          </div>
        </div>
      </section>

      <section className="-mx-4 border-y bg-white px-4 py-10">
        <h2 className="text-2xl font-semibold">{t.landing.howTitle}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.landing.steps.map((step, index) => {
            const Icon = STEP_ICONS[index];
            return (
              <li key={step.title} className="rounded-xl border bg-background p-4">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </li>
            );
          })}
        </ol>
        <ul className="mt-6 flex flex-wrap gap-2">
          {t.landing.principles.map((principle) => (
            <li key={principle} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              <ShieldCheck className="size-4" />
              {principle}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 py-10 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t.landing.forParentsTitle}</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {t.landing.forParents.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t.landing.forSpecialistsTitle}</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {t.landing.forSpecialists.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border-2 border-primary bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">{t.landing.pricingTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.landing.pricingText}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["month", "quarter"] as const).map((plan) => (
              <div key={plan} className="rounded-lg bg-primary/5 p-3">
                <div className="text-xs text-muted-foreground">{t.subscription.plans[plan].name}</div>
                <div className="text-lg font-semibold">{formatPrice(SUBSCRIPTION_PLANS[plan].priceKzt)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {cards.length > 0 ? (
        <section className="pb-10">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold">{t.landing.specialistsPreview}</h2>
            <Link href="/specialists" className="text-sm font-medium text-primary hover:underline">
              {t.landing.allSpecialists}
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <SpecialistCardView key={card.id} card={card} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="pb-4 text-xs text-muted-foreground">{t.landing.catalogNote}</p>
    </AppShell>
  );
}
