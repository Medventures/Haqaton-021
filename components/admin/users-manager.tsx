"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LockOpen, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { errorMessage, postJson } from "@/lib/client-api";
import { formatDateTime } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { Role } from "@/lib/session";
import { cn } from "@/lib/utils";

export type AdminUser = { id: string; name: string; email: string; role: Role; status: string; createdAt: string };

const STAFF_ROLES = ["curator", "commission", "moderator", "admin"] as const;

export function UsersManager({ users, currentUserId }: { users: AdminUser[]; currentUserId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "curator" as (typeof STAFF_ROLES)[number] });

  const toggle = async (user: AdminUser) => {
    setBusy(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: user.status === "active" ? "blocked" : "active" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error);
      }
      toast.success(t.admin.userUpdated);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    setBusy("create");
    try {
      await postJson("/api/admin/users", form);
      toast.success(t.admin.userCreated);
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "curator" });
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const shown = filter === "all" ? users : users.filter((user) => user.role === filter);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-52 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.common.all}</SelectItem>
            {(["parent", "specialist", ...STAFF_ROLES] as const).map((role) => (
              <SelectItem key={role} value={role}>
                {t.roles[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus /> {t.admin.createStaff}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.admin.createStaff}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="staff-name">{t.auth.name}</Label>
                <Input id="staff-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="staff-email">{t.auth.email}</Label>
                <Input id="staff-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="staff-password">{t.auth.password}</Label>
                <Input
                  id="staff-password"
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t.admin.role}</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as typeof form.role })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {t.roles[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={busy !== null || form.name.trim().length < 2 || !form.email || form.password.length < 8}
                onClick={() => void create()}
              >
                {busy === "create" ? <Loader2 className="animate-spin" /> : null}
                {t.common.save}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.auth.name}</TableHead>
              <TableHead>{t.auth.email}</TableHead>
              <TableHead>{t.admin.role}</TableHead>
              <TableHead>{t.common.status}</TableHead>
              <TableHead>{t.admin.registered}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-sm">{user.email}</TableCell>
                <TableCell>{t.roles[user.role]}</TableCell>
                <TableCell>
                  <span className={cn("text-sm", user.status === "active" ? "text-emerald-700" : "text-red-700")}>
                    {user.status === "active" ? t.admin.activeUser : t.admin.blocked}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(user.createdAt)}</TableCell>
                <TableCell>
                  {user.id !== currentUserId ? (
                    <Button size="sm" variant="outline" className="h-8" disabled={busy !== null} onClick={() => void toggle(user)}>
                      {busy === user.id ? <Loader2 className="animate-spin" /> : user.status === "active" ? <Lock /> : <LockOpen />}
                      {user.status === "active" ? t.admin.block : t.admin.unblock}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
