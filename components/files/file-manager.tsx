"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Download, ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catalog, documentName } from "@/lib/catalog";
import { errorMessage } from "@/lib/client-api";
import { formatDateTime } from "@/lib/dates";
import type { FileView } from "@/lib/files-types";
import { useI18n } from "@/lib/i18n/client";

type Mode = "case" | "specialist" | "review";

const CASE_CATEGORIES = ["medical", "education", "social", "identity", "photo", "other"] as const;
const SPECIALIST_CATEGORIES = ["diploma", "certificate", "license", "photo", "other"] as const;
const NONE = "__none";

export function FileManager({ mode, caseId, specialistId }: { mode: Mode; caseId?: string; specialistId?: string }) {
  const { locale, t } = useI18n();
  const [files, setFiles] = useState<FileView[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const categories = mode === "specialist" ? SPECIALIST_CATEGORIES : CASE_CATEGORIES;
  const [category, setCategory] = useState<string>(categories[0]);
  const [documentId, setDocumentId] = useState<string>(NONE);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = caseId ? `caseId=${caseId}` : specialistId ? `specialistId=${specialistId}` : "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/files${query ? `?${query}` : ""}`);
      const data = (await response.json()) as { files?: FileView[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error);
      }
      setFiles(data.files ?? []);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        void load();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const upload = async () => {
    if (!file) {
      toast.error(t.errors.fileRequired);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.errors.fileTooLarge);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("category", category);
      form.set("title", title.trim());
      if (caseId) {
        form.set("caseId", caseId);
      }
      if (documentId !== NONE) {
        form.set("documentId", documentId);
      }
      const response = await fetch("/api/files", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error);
      }
      toast.success(t.files.uploaded);
      setFile(null);
      setTitle("");
      setDocumentId(NONE);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error);
      }
      toast.success(t.files.deleted);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {mode !== "review" ? (
        <section className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="file-input">{t.files.chooseFile}</Label>
            <Input
              id="file-input"
              ref={inputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.odt,.txt"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                if (selected && !title) {
                  setTitle(selected.name.replace(/\.[^.]+$/, ""));
                }
              }}
            />
            <span className="text-xs text-muted-foreground">{t.files.fileHint}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="file-title">{t.files.fileTitle}</Label>
              <Input id="file-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} />
            </div>
            <div className="grid gap-1.5">
              <Label>{t.files.category}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t.files.categories[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {mode === "case" ? (
            <div className="grid gap-1.5">
              <Label>{t.files.planDocument}</Label>
              <Select value={documentId} onValueChange={setDocumentId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t.files.planDocumentNone}</SelectItem>
                  {catalog.documents.map((document) => (
                    <SelectItem key={document.id} value={document.id}>
                      {documentName(document.id, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">{t.files.planDocumentHint}</span>
            </div>
          ) : null}
          <Button className="h-10" disabled={uploading || !file} onClick={() => void upload()}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />} {t.files.upload}
          </Button>
        </section>
      ) : null}

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{mode === "review" ? t.commission.noCredentials : t.files.noFiles}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {files.map((item) => {
              const isImage = item.mimeType.startsWith("image/");
              return (
                <li key={item.id} className="flex gap-3 rounded-xl border p-3">
                  <a
                    href={`/api/files/${item.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
                  >
                    {isImage ? (
                      <Image src={`/api/files/${item.id}`} alt={item.title} width={64} height={64} unoptimized className="size-full object-cover" />
                    ) : (
                      <FileText className="size-7 text-primary" />
                    )}
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium" title={item.title}>
                      {item.title}
                    </div>
                    <div className="text-xs text-primary">{t.files.categories[item.category as keyof typeof t.files.categories] ?? item.category}</div>
                    {item.documentId ? <div className="truncate text-xs text-muted-foreground">{documentName(item.documentId, locale)}</div> : null}
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.files.uploadedBy(item.uploaderName, formatDateTime(item.createdAt))} · {t.files.size((item.size / 1024 / 1024).toFixed(2))}
                    </div>
                    <div className="mt-1 flex gap-1">
                      <Button asChild variant="ghost" size="icon-sm" aria-label={t.common.open}>
                        <a href={`/api/files/${item.id}`} target="_blank" rel="noreferrer">
                          <ExternalLink />
                        </a>
                      </Button>
                      <Button asChild variant="ghost" size="icon-sm" aria-label={t.common.download}>
                        <a href={`/api/files/${item.id}?download=1`}>
                          <Download />
                        </a>
                      </Button>
                      {item.canDelete && mode !== "review" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-red-700" aria-label={t.common.delete}>
                              <Trash2 />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.files.deleteTitle}</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => void remove(item.id)}>{t.common.delete}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
