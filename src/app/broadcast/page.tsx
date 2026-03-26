"use client";

import React, { useState } from "react";
import {
  MessageSquare,
  ScanLine,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Info,
  User2Icon,
  Search,
  Filter,
  Timer,
  Save,
  Smartphone,
  Loader2,
  StopCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDebiturs } from "@/app/actions/debitur.actions";
import { bulkAddTagsToDebiturs } from "@/app/actions/debitur.actions";
import { getBroadcastLogs, addBroadcastLogs, updateLogStatus } from "@/app/actions/broadcast.actions";
import { getMessageTemplates, upsertMessageTemplate } from "@/app/actions/template.actions";
import { useWhatsappSocket } from "@/hooks/use-whatsapp-socket";
import { toast } from "sonner";

interface Debitur {
  id: string;
  nama: string;
  agunan: string;
  tgk: number;
  so_pokok: number;
  no_whatsapp: string;
  tags: string[];
}

export default function BroadcastPage() {
  const [debiturs, setDebiturs] = React.useState<Debitur[]>([]);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBroadcasting, setIsBroadcasting] = React.useState(false);

  // Tracks the current/last broadcast session for stop & tagging
  const [broadcastSession, setBroadcastSession] = React.useState<{
    targetIds: string[];
    templateName: string;
    total: number;
  } | null>(null);

  // History banners for "dihentikan" or "selesai"
  const [stoppedSessions, setStoppedSessions] = React.useState<{
    id: string;
    type: "stopped" | "done";
    sent: number;
    total: number;
    tag: string;
    timestamp: Date;
  }[]>([]);
  
  const fetchLogs = async () => {
    const res = await getBroadcastLogs();
    if (res.success && res.data) {
      setLogs(res.data);
    }
  };

  React.useEffect(() => {
    getDebiturs().then(res => {
      if(res.success && res.data) {
         setDebiturs(res.data.map(d => ({
           id: d.id,
           nama: d.nama,
           agunan: d.agunan || "-",
           tgk: Number(d.tgk),
           so_pokok: Number(d.so_pokok),
           no_whatsapp: d.no_whatsapp,
           tags: d.tags || []
         })));
      } else {
         toast.error("Gagal menarik data target debitur");
      }
      setIsLoading(false);
    });
    fetchLogs();
    fetchTemplates();
  }, []);

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Template & Draft States
  const DEFAULT_TEMPLATE = "Selamat pagi bapak/ibu {{nama}}\nAlamat agunan: {{agunan}}\n\nKami dari Bank BTN menginformasikan bahwa terdapat tunggakan sebesar Rp {{tgk}}. Mohon segera melakukan pembayaran.";
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_TEMPLATE);
  const [templatePurpose, setTemplatePurpose] = useState("Tagihan Default");
  const [savedDrafts, setSavedDrafts] = useState<{ id?: string; purpose: string; template: string }[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const fetchTemplates = async () => {
    const res = await getMessageTemplates();
    if (res.success && res.data && res.data.length > 0) {
      const mapped = res.data.map(t => ({ id: t.id, purpose: t.purpose, template: t.template }));
      setSavedDrafts(mapped);
      // Auto-load the most recently updated template
      setTemplatePurpose(mapped[0].purpose);
      setMessageTemplate(mapped[0].template);
    }
  };

  const handleSaveDraft = async () => {
    if (!templatePurpose.trim()) {
      toast.warning("Masukkan judul/purpose template terlebih dahulu.");
      return;
    }
    setIsSavingDraft(true);
    const res = await upsertMessageTemplate(templatePurpose.trim(), messageTemplate);
    if (res.success) {
      toast.success(`Template "${templatePurpose}" berhasil disimpan ke database!`);
      await fetchTemplates();
    } else {
      toast.error(res.error || "Gagal menyimpan template.");
    }
    setIsSavingDraft(false);
  };

  const handleLoadDraft = (purpose: string) => {
    const draft = savedDrafts.find(d => d.purpose === purpose);
    if (draft) {
      setTemplatePurpose(draft.purpose);
      setMessageTemplate(draft.template);
    }
  };

  const [newTag, setNewTag] = useState("");
  const [tagTargetId, setTagTargetId] = useState<string | null>(null);
  const [isQROpen, setIsQROpen] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState("ALL");

  // Real-time WhatsApp Socket hook
  const { qrImage, waStatus, phoneNumber: livePhone, isBroadcasting: socketBroadcasting, startBroadcast, stopBroadcast, onLogUpdate, onBroadcastStopped, onBroadcastDone } = useWhatsappSocket();
  const isBotActive = waStatus === "READY";
  const phoneNumber = livePhone ?? (waStatus === "CONNECTING" ? "Menghubungkan..." : "Belum Login");

  // Register log update listener
  React.useEffect(() => {
    const unsub = onLogUpdate(async ({ log_id, status }) => {
      await updateLogStatus(log_id, status);
      fetchLogs();
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: generate tag string  e.g. "26/03/2025 - Tagihan Default"
  const buildBroadcastTag = (templateName: string) => {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, "0");
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    const y = now.getFullYear();
    return `${d}/${m}/${y} - ${templateName}`;
  };

  // Register broadcast stopped listener
  React.useEffect(() => {
    const unsub = onBroadcastStopped(async ({ sent, failed, total }) => {
      if (!broadcastSession) return;
      const tag = buildBroadcastTag(broadcastSession.templateName);

      // Tag only the debiturs that were actually sent (first `sent` IDs — best effort)
      if (sent > 0) {
        const sentIds = broadcastSession.targetIds.slice(0, sent);
        await bulkAddTagsToDebiturs(sentIds, tag);
        // Refresh local debitur list
        getDebiturs().then(res => {
          if (res.success && res.data) {
            setDebiturs(res.data.map(d => ({
              id: d.id, nama: d.nama, agunan: d.agunan || "-",
              tgk: Number(d.tgk), so_pokok: Number(d.so_pokok),
              no_whatsapp: d.no_whatsapp, tags: d.tags || []
            })));
          }
        });
      }

      setStoppedSessions(prev => [{
        id: crypto.randomUUID(),
        type: "stopped",
        sent,
        total,
        tag,
        timestamp: new Date(),
      }, ...prev]);

      toast.warning(`Broadcast dihentikan. ${sent}/${total} kontak terkirim.`);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastSession]);

  // Register broadcast done listener
  React.useEffect(() => {
    const unsub = onBroadcastDone(async ({ sent, failed, total }) => {
      if (!broadcastSession) return;
      const tag = buildBroadcastTag(broadcastSession.templateName);

      if (sent > 0) {
        await bulkAddTagsToDebiturs(broadcastSession.targetIds, tag);
        getDebiturs().then(res => {
          if (res.success && res.data) {
            setDebiturs(res.data.map(d => ({
              id: d.id, nama: d.nama, agunan: d.agunan || "-",
              tgk: Number(d.tgk), so_pokok: Number(d.so_pokok),
              no_whatsapp: d.no_whatsapp, tags: d.tags || []
            })));
          }
        });
      }

      setStoppedSessions(prev => [{
        id: crypto.randomUUID(),
        type: "done",
        sent,
        total,
        tag,
        timestamp: new Date(),
      }, ...prev]);

      toast.success(`Broadcast selesai. ${sent}/${total} kontak terkirim.`);
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [broadcastSession]);

  // Derived Properties
  const allAvailableTags = Array.from(new Set(debiturs.flatMap((d) => d.tags))).sort();

  const filteredDebiturs = debiturs.filter((d) => {
    const matchesSearch =
      d.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.agunan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = filterTag === "ALL" || d.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredDebiturs.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const addTag = (id: string, val: string = newTag) => {
    if (!val.trim()) {
      setTagTargetId(null);
      return;
    }
    setDebiturs((prev) =>
      prev.map((d) =>
        d.id === id && !d.tags.includes(val.trim())
          ? { ...d, tags: [...d.tags, val.trim()] }
          : d,
      ),
    );
    setNewTag("");
    setTagTargetId(null);
  };

  const insertTemplateVar = (variable: string) => {
    setMessageTemplate((prev) => prev + `{{${variable}}}`);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-[calc(100vh-2rem)] overflow-hidden">
      {/* HEADER & INFO BOT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Broadcast Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Persiapkan pesan dan luncurkan kampanye perpesanan.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 p-2 pr-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isBotActive ? "bg-primary" : "bg-destructive"}`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${isBotActive ? "bg-primary" : "bg-destructive"}`}
              ></span>
            </span>
            <span className="text-sm font-medium">
              {isBotActive ? "Bot Aktif" : "Bot Offline"}
            </span>
          </div>
          <div className="w-px h-6 bg-border mx-1"></div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-muted-foreground">
              {phoneNumber}
            </span>
          </div>
          <Button variant="outline" size="sm" className="ml-2 gap-2 h-8" onClick={() => setIsQROpen(true)}>
            <ScanLine className="h-4 w-4" /> Scan QR
          </Button>
        </div>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* KOLOM PERTAMA (Kiri) - Row 1 & Row 2 */}
        <div className="lg:col-span-7 flex flex-col gap-6 min-h-0">
          {/* Card: Template Pesan */}
          <Card className="shadow-sm shrink-0">
            <CardHeader className="bg-muted/10 pb-3 border-b">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-lg shrink-0">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  Template Pesan
                </CardTitle>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  {/* Dropdown: Load Template */}
                  <select
                    className="h-8 px-2 text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring max-w-[200px] truncate"
                    value={savedDrafts.find(d => d.purpose === templatePurpose) ? templatePurpose : ""}
                    onChange={(e) => handleLoadDraft(e.target.value)}
                    title="Pilih template tersimpan"
                  >
                    <option value="" disabled>Pilih template...</option>
                    {savedDrafts.map((d) => (
                      <option key={d.purpose} value={d.purpose}>{d.purpose}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Sesuaikan teks pesan yang akan dikirim ke setiap debitur.
              </p>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="mb-4 bg-muted/30 border border-border p-3 rounded-md text-sm">
                <div className="flex items-center gap-2 font-semibold mb-1 text-foreground">
                  <Info className="h-4 w-4 text-muted-foreground" /> Variabel Dinamis:
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Klik tag di bawah untuk menyisipkan ke dalam isi pesan. Sistem akan otomatis menggantinya saat tahap pengiriman berjalan.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => insertTemplateVar("nama")}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {"{{nama}}"}
                  </Button>
                  <Button
                    onClick={() => insertTemplateVar("agunan")}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {"{{agunan}}"}
                  </Button>
                  <Button
                    onClick={() => insertTemplateVar("tgk")}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {"{{tgk}}"}
                  </Button>
                  <Button
                    onClick={() => insertTemplateVar("so_pokok")}
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs bg-muted/50 hover:bg-muted transition-colors"
                  >
                    {"{{so_pokok}}"}
                  </Button>
                </div>
              </div>
              <Textarea
                className="min-h-[180px] resize-none text-sm leading-relaxed"
                placeholder="Tulis pesan..."
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
              />
            </CardContent>
            <CardFooter className="bg-muted/10 py-3 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Timer className="h-4 w-4 text-muted-foreground mr-1" />
                <span className="text-xs font-semibold text-muted-foreground">Jeda Acak:</span>
                <div className="flex items-center gap-1 mx-1">
                  <Input type="number" defaultValue={5} min={1} className="h-7 w-14 text-center text-xs px-1 bg-background" title="Waktu tunggu minimum (detik)" />
                  <span className="text-muted-foreground text-xs">-</span>
                  <Input type="number" defaultValue={15} min={5} className="h-7 w-14 text-center text-xs px-1 bg-background" title="Waktu tunggu maksimum (detik)" />
                </div>
                <span className="text-[10px] text-muted-foreground">detik/pesan</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  className="h-8 text-xs w-full sm:w-[160px] bg-background"
                  placeholder="Nama draft..."
                  value={templatePurpose}
                  onChange={(e) => setTemplatePurpose(e.target.value)}
                  title="Judul atau purpose dari template ini"
                />
                <Button variant="outline" size="sm" className="gap-2 h-8 w-full sm:w-auto" onClick={handleSaveDraft} disabled={isSavingDraft}>
                  {isSavingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSavingDraft ? "Menyimpan..." : "Simpan Draft"}
                </Button>
                {/* Action Button: Stop / Scan QR / Mulai Broadcast */}
                {socketBroadcasting ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      stopBroadcast();
                      toast.info("Menghentikan broadcast, mohon tunggu...");
                    }}
                    className="gap-2 h-8 w-full sm:w-auto animate-pulse"
                  >
                    <StopCircle className="h-4 w-4" /> Stop Broadcast
                  </Button>
                ) : !isBotActive ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setIsQROpen(true)}
                    className="gap-2 h-8 w-full sm:w-auto bg-primary hover:bg-primary/90"
                  >
                    <ScanLine className="h-4 w-4" /> Hubungkan WhatsApp
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (selectedIds.size === 0) {
                        toast.warning("Pilih minimal 1 debitur untuk broadcast.");
                        return;
                      }
                      
                      const targets = debiturs.filter(d => selectedIds.has(d.id));

                      // 1. Buat log entries di DB dengan status PENDING
                      const payload = targets.map(t => {
                        let msg = messageTemplate;
                        msg = msg.replace(/\{\{nama\}\}/g, t.nama);
                        msg = msg.replace(/\{\{agunan\}\}/g, t.agunan);
                        msg = msg.replace(/\{\{tgk\}\}/g, t.tgk.toString());
                        msg = msg.replace(/\{\{so_pokok\}\}/g, t.so_pokok.toString());
                        return { debitur_id: t.id, pesan: msg, status: "PENDING" as any };
                      });

                      const res = await addBroadcastLogs(payload);
                      if (!res.success) {
                        toast.error("Gagal membuat log broadcast.");
                        return;
                      }

                      await fetchLogs();
                      const freshLogs = await getBroadcastLogs();

                      // 2. Kirim ke WA Engine via Socket.io
                      const socketTargets = targets.map((t) => {
                        const matchingLog = freshLogs.data?.find(l =>
                          l.debitur_id === t.id && l.status === "PENDING"
                        );
                        let msg = messageTemplate;
                        msg = msg.replace(/\{\{nama\}\}/g, t.nama);
                        msg = msg.replace(/\{\{agunan\}\}/g, t.agunan);
                        msg = msg.replace(/\{\{tgk\}\}/g, t.tgk.toString());
                        msg = msg.replace(/\{\{so_pokok\}\}/g, t.so_pokok.toString());
                        return {
                          log_id: matchingLog?.id ?? t.id,
                          no_wa: (t as any).no_whatsapp ?? "",
                          pesan: msg,
                        };
                      });

                      // 3. Simpan sesi broadcast untuk keperluan stop + tagging
                      setBroadcastSession({
                        targetIds: targets.map(t => t.id),
                        templateName: templatePurpose || "Broadcast",
                        total: targets.length,
                      });

                      startBroadcast(socketTargets);
                      toast.success(`Broadcast ke ${targets.length} target dimulai. Lihat panel log.`);
                    }}
                    className="gap-2 h-8 w-full sm:w-auto"
                  >
                    <Send className="h-4 w-4" /> Mulai Broadcast
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>

          {/* Card: Log Pengiriman */}
          <Card className="shadow-sm border-border flex flex-col h-full flex-1">
            <CardHeader className="bg-muted/10 pb-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                Riwayat Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">

                  {/* Stopped/Done Session Banners */}
                  {stoppedSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-xs ${
                        session.type === "stopped"
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                          : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {session.type === "stopped" ? (
                          <StopCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${
                          session.type === "stopped"
                            ? "text-amber-800 dark:text-amber-300"
                            : "text-emerald-800 dark:text-emerald-300"
                        }`}>
                          {session.type === "stopped" ? "Dihentikan" : "Selesai"},{" "}
                          {session.sent}/{session.total} kontak terkirim
                        </p>
                        <p className="text-muted-foreground truncate mt-0.5" title={session.tag}>
                          Tag: <span className="font-mono">{session.tag}</span>
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {session.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}

                  {/* Individual Log Entries */}
                  {logs.length === 0 && stoppedSessions.length === 0 ? (
                    <div className="text-center text-muted-foreground text-xs py-10">Belum ada riwayat pengiriman.</div>
                  ) : [...logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((log, index) => (
                    <div
                      key={log.id}
                      className="flex gap-3 items-center text-sm border-b pb-3 last:border-0 last:pb-0 py-1"
                    >
                      {/* Left Side: Numbering */}
                      <div className="w-5 text-[10px] text-muted-foreground font-mono shrink-0">
                        {logs.length - index}.
                      </div>
                      
                      {/* Middle: Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={
                            log.status === "FAILED"
                              ? "text-destructive font-medium truncate"
                              : "text-foreground truncate"
                          }
                        >
                          <span className="font-semibold text-xs">{log.debitur_nama}</span>: <span className="text-[10px] opacity-80">{log.status}</span>
                        </p>
                        {log.error_reason && (
                          <p className="text-[10px] text-destructive opacity-80 mt-0.5 truncate italic">
                            {log.error_reason}
                          </p>
                        )}
                      </div>

                      {/* Right Side: Time & Status Icon */}
                      <div className="flex items-center gap-3 shrink-0">
                        <p 
                          className="text-[10px] text-muted-foreground whitespace-nowrap" 
                          title={new Date(log.created_at).toLocaleString()}
                        >
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <div className="w-4 flex justify-center">
                          {log.status === "SENT" && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                          {log.status === "FAILED" && (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          )}
                          {log.status === "PENDING" && (
                            <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KEDUA (Kanan) - List Debitur */}
        <div className="lg:col-span-5 flex flex-col h-full min-h-0">
          <Card className="shadow-sm h-full flex flex-col">
            <CardHeader className="bg-muted/10 pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User2Icon className="h-5 w-5 text-muted-foreground" />
                  Daftar Debitur
                </CardTitle>
                <CardDescription>
                  Pilih debitur yang akan menerima broadcast.
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="px-3 py-1 text-sm"
              >
                Terpilih: {selectedIds.size}
              </Badge>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {/* Filter Area Row */}
              <div className="flex gap-2 p-3 bg-muted/5 border-b">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Cari nama/kelurahan..." 
                    className="h-8 pl-8 text-xs w-full bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="relative w-32">
                  <Filter className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    className="h-8 pl-7 pr-2 w-full text-xs border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                  >
                    <option value="ALL">Semua Tags</option>
                    {allAvailableTags.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table Header Row */}
              <div className="flex items-center gap-4 bg-muted/20 px-4 py-2 border-b text-xs font-semibold text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      selectedIds.size === filteredDebiturs.length &&
                      filteredDebiturs.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </div>
                <div className="flex-1">Info Debitur Target</div>
                <div className="w-24 text-right pr-2">Total TGK</div>
              </div>

              {/* Table List Items */}
              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {filteredDebiturs.length > 0 ? (
                    filteredDebiturs.map((debitur) => (
                      <div
                        key={debitur.id}
                        className="flex items-start gap-4 p-4 hover:bg-muted/10 transition-colors group"
                      >
                        <div className="pt-1">
                          <Checkbox
                            checked={selectedIds.has(debitur.id)}
                            onCheckedChange={(c) =>
                              handleSelectOne(debitur.id, !!c)
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 line-clamp-1">
                            <span className="font-semibold text-foreground truncate">
                              {debitur.nama}
                            </span>

                            {/* Tags Area */}
                            {debitur.tags.map((tag, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="bg-muted/30 text-[9px] h-4 py-0 px-1.5 border-dashed font-normal cursor-pointer hover:bg-muted/50"
                                onClick={() => setFilterTag(tag)}
                                title="Klik untuk filter tag ini"
                              >
                                {tag}
                              </Badge>
                            ))}

                            {/* Create Tag Trigger */}
                            {tagTargetId === debitur.id ? (
                              <div className="flex items-center gap-1 relative">
                                <Input
                                  autoFocus
                                  list={`datalist-tags-${debitur.id}`}
                                  className="h-5 w-24 text-[9px] px-2 py-0"
                                  placeholder="Nama tag..."
                                  value={newTag}
                                  onChange={(e) => setNewTag(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") addTag(debitur.id);
                                    if (e.key === "Escape") setTagTargetId(null);
                                  }}
                                  onBlur={(e) => {
                                    if (!e.target.value) setTagTargetId(null);
                                    // Delay hiding slightly to allow clicking datalist
                                    setTimeout(() => addTag(debitur.id, newTag), 150);
                                  }}
                                />
                                <datalist id={`datalist-tags-${debitur.id}`}>
                                  {allAvailableTags.map((t) => (
                                    <option key={t} value={t} />
                                  ))}
                                </datalist>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                onClick={() => setTagTargetId(debitur.id)}
                                className="h-4 px-1 py-0 text-[10px] text-muted-foreground hover:text-foreground border border-transparent hover:border-border bg-muted/20 hover:bg-muted/50 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              >
                                + Tag Baru
                              </Button>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {debitur.agunan}
                          </div>
                        </div>
                        <div className="w-24 text-right">
                          <div className="font-semibold tabular-nums text-sm text-destructive">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              maximumFractionDigits: 0,
                            }).format(debitur.tgk)}
                          </div>
                          <div
                            className="text-[10px] text-muted-foreground tabular-nums mt-0.5"
                            title="Sisa Pokok"
                          >
                            OS:{" "}
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              maximumFractionDigits: 0,
                            }).format(debitur.so_pokok)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      <User2Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Tidak ada target debitur ditemukan.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* --- QR SCAN MODAL --- */}
      <Dialog open={isQROpen} onOpenChange={setIsQROpen}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden outline-none">
          <div className="p-6 pb-4">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Tautkan WhatsApp Web
              </DialogTitle>
              <DialogDescription className="mt-2 text-xs leading-relaxed">
                1. Buka aplikasi WhatsApp di HP Anda.<br/>
                2. Tap menu <strong>Pengaturan</strong> atau ikon <strong>Tiga Titik</strong>.<br/>
                3. Pilih <strong>Perangkat Tautkan</strong> dan arahkan kamera ke layar ini.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-10 flex flex-col items-center justify-center bg-muted/20 border-t border-border relative">
            <div className="relative w-[220px] h-[220px] bg-white rounded-xl p-2 flex items-center justify-center overflow-hidden shadow-md ring-2 ring-border">
              {waStatus === "READY" ? (
                <div className="flex flex-col items-center gap-3 p-4 text-center">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-foreground font-semibold text-sm">WhatsApp Terhubung!</p>
                  <p className="text-muted-foreground text-xs">{livePhone}</p>
                </div>
              ) : qrImage ? (
                // QR real dari whatsapp-web.js
                <img src={qrImage} alt="Scan QR WhatsApp" className="w-full h-full object-contain" />
              ) : (
                // Placeholder saat loading
                <div className="flex flex-col items-center gap-3">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
                  <p className="text-muted-foreground text-xs mt-2">
                    {waStatus === "CONNECTING" ? "Menghubungkan ke server..." :
                     waStatus === "AUTHENTICATED" ? "Mengautentikasi..." :
                     "Menunggu QR Code..."}
                  </p>
                </div>
              )}
            </div>
            
            <Badge variant="outline" className={`mt-8 px-4 py-1.5 ${
              waStatus === "READY" ? "bg-primary/10 text-primary border-primary/20" :
              waStatus === "QR_READY" ? "bg-secondary/50 text-secondary-foreground border-secondary animate-pulse" :
              "bg-muted text-muted-foreground border-border animate-pulse"
            }`}>
              {waStatus === "READY" ? "Terhubung" :
               waStatus === "QR_READY" ? "Arahkan kamera WhatsApp ke QR ini" :
               waStatus === "AUTHENTICATED" ? "Mengautentikasi..." :
               "Menunggu QR Code..."}
            </Badge>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
