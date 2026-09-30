import { FileManager } from "@/components/files/file-manager";
import { requirePageUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export default async function ParentDocumentsPage() {
  await requirePageUser("parent");
  const { t } = await getI18n();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{t.files.title}</h1>
        <p className="text-sm text-muted-foreground">{t.files.subtitle}</p>
      </div>
      <FileManager mode="case" />
    </div>
  );
}
