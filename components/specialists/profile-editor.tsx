"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SpecialistProfileFields, toProfileInput, type ProfileDraft } from "@/components/specialists/profile-fields";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/client-api";
import { useI18n } from "@/lib/i18n/client";

export function ProfileEditor({ initial }: { initial: ProfileDraft }) {
  const router = useRouter();
  const { t } = useI18n();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const response = await fetch("/api/specialist/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toProfileInput(value)),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error([data.error, ...(data.issues ?? [])].filter(Boolean).join(": "));
          }
          toast.success(t.specialistCabinet.savedResubmitted);
          router.refresh();
        } catch (error) {
          toast.error(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <SpecialistProfileFields value={value} onChange={setValue} />
      <Button type="submit" className="h-11" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {t.specialistCabinet.saveProfile}
      </Button>
    </form>
  );
}
