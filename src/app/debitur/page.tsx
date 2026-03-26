"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Upload, Trash2, Search, FileEdit, FileSpreadsheet, Send, MessageCircle, Users, FileText, Info, Download, Loader2 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import Papa from "papaparse";
import { toast } from "sonner";
import { getDebiturs, addDebitur, updateDebitur, deleteDebitur, bulkAddDebiturs, bulkDeleteDebiturs } from "@/app/actions/debitur.actions";

// Define the shape of our data matching Drizzle schema
interface Debitur {
  id: string;
  no_debitur: string;
  nama: string;
  agunan: string;
  so_pokok: number;
  tgk: number;
  no_whatsapp: string;
  tags: string[];
  status: "PENDING" | "SENT" | "FAILED";
}

export default function DebiturPage() {
  const [data, setData] = useState<Debitur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form States
  const [newItem, setNewItem] = useState<Partial<Debitur>>({
    no_debitur: "",
    nama: "",
    agunan: "",
    so_pokok: 0,
    tgk: 0,
    no_whatsapp: "",
  });
  
  const [editItem, setEditItem] = useState<Debitur | null>(null);

  // --- Data Fetching ---
  const fetchDebiturs = async () => {
    setIsLoading(true);
    const res = await getDebiturs();
    if (res.success && res.data) {
      const mapped = res.data.map(d => ({
        id: d.id,
        no_debitur: d.no_debitur,
        nama: d.nama,
        agunan: d.agunan || "-",
        so_pokok: Number(d.so_pokok),
        tgk: Number(d.tgk),
        no_whatsapp: d.no_whatsapp,
        tags: d.tags || [],
        status: "PENDING" as any
      }));
      setData(mapped);
    } else {
      toast.error("Gagal memuat data debitur");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDebiturs();
  }, []);

  // --- Computed Properties ---
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const search = searchTerm.toLowerCase();
      return (
        item.nama.toLowerCase().includes(search) ||
        item.no_debitur.toLowerCase().includes(search) ||
        item.agunan.toLowerCase().includes(search) ||
        item.no_whatsapp.includes(search)
      );
    });
  }, [data, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // --- Handlers for Selection ---
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length && filteredData.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map((item) => item.id)));
    }
  };

  const isAllSelected = filteredData.length > 0 && selectedIds.size === filteredData.length;
  const isSomeSelected = selectedIds.size > 0 && !isAllSelected;

  const totalTunggakan = data.reduce((acc, curr) => acc + curr.tgk, 0);
  const totalSOPokok = data.reduce((acc, curr) => acc + curr.so_pokok, 0);

  // --- Handlers ---
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    const res = await deleteDebitur(deleteId);
    if (res.success) {
      toast.success("Berhasil menghapus debitur");
      setData((prev) => prev.filter((item) => item.id !== deleteId));
      if (paginatedData.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } else {
      toast.error(res.error || "Gagal menghapus data");
    }
    setDeleteId(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const res = await bulkDeleteDebiturs(Array.from(selectedIds));
    if (res.success) {
      toast.success(`Berhasil menghapus ${selectedIds.size} debitur`);
      setSelectedIds(new Set());
      fetchDebiturs();
    } else {
      toast.error(res.error || "Gagal menghapus data");
    }
    setIsBulkDeleteOpen(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      no_debitur: newItem.no_debitur,
      nama: newItem.nama,
      agunan: newItem.agunan || "-",
      so_pokok: Number(newItem.so_pokok) || 0,
      tgk: Number(newItem.tgk) || 0,
      no_whatsapp: newItem.no_whatsapp?.replace(/\D/g, "") || "",
      tags: []
    };

    const res = await addDebitur(payload);
    if (res.success) {
      toast.success("Debitur berhasil ditambahkan");
      setIsAddOpen(false);
      setNewItem({ no_debitur: "", nama: "", agunan: "", so_pokok: 0, tgk: 0, no_whatsapp: "" });
      fetchDebiturs();
    } else {
      toast.error(res.error || "Gagal menyimpan");
    }
  };

  const handleEditClick = (item: Debitur) => {
    setEditItem(item);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const payload = {
      no_debitur: editItem.no_debitur,
      nama: editItem.nama,
      agunan: editItem.agunan || "-",
      so_pokok: editItem.so_pokok,
      tgk: editItem.tgk,
      no_whatsapp: editItem.no_whatsapp?.replace(/\D/g, "") || "",
      tags: editItem.tags
    };

    const res = await updateDebitur(editItem.id, payload);
    if (res.success) {
      toast.success("Data berhasil diperbarui");
      setIsEditOpen(false);
      setEditItem(null);
      fetchDebiturs();
    } else {
      toast.error(res.error || "Gagal update");
    }
  };

  // --- Upload Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleProcessUpload = () => {
    if (!selectedFile) return;
    setIsUploading(true);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedData = results.data.map((row: any) => ({
            no_debitur: row.no_debitur || `DB-${Math.floor(Math.random()*100000)}`,
            nama: row.nama || "Unknown",
            agunan: row.agunan || "-",
            so_pokok: Number(row.so_pokok) || 0,
            tgk: Number(row.tgk) || 0,
            no_whatsapp: (row.no_whatsapp || "").toString().replace(/\D/g, ""),
            tags: []
          }));
          
          if (parsedData.length === 0) {
            toast.error("File CSV/Excel kosong atau format salah");
            setIsUploading(false);
            return;
          }

          const res = await bulkAddDebiturs(parsedData);
          if (res.success) {
            toast.success("Upload Berhasil", { description: res.message });
            setIsUploadOpen(false);
            setSelectedFile(null);
            fetchDebiturs();
          } else {
            toast.error("Upload Sebagian Gagal", { description: res.error });
          }
        } catch(err: any) {
            toast.error("Terjadi Kesalahan", { description: err.message });
        } finally {
          setIsUploading(false);
        }
      },
      error: (error: any) => {
        setIsUploading(false);
        toast.error("Gagal membaca CSV", { description: error.message });
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "no_debitur,nama,agunan,so_pokok,tgk,no_whatsapp\nDB-001,Budi Santoso,Blok A2,100000000,2500000,628123456789\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_debitur.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Utils ---
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);
  };

  const formatBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">Pending</Badge>;
      case "SENT":
        return <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Sent</Badge>;
      case "FAILED":
        return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header and Call to Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Data Debitur</h1>
          <p className="text-muted-foreground mt-1">
            Kelola data penagihan, tambah manual, bulk upload file CSV, dan jalankan Broadcast.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => { setIsUploadOpen(true); setSelectedFile(null); }} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-primary">
            <Plus className="h-4 w-4" />
            Tambah Manual
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Data Antrean</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{data.length} <span className="text-sm font-normal text-muted-foreground">Debitur</span></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tunggakan (TGK)</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalTunggakan)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">O/S Pokok Keseluruhan</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(totalSOPokok)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Interface */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-4 border-b flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-muted/20">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, WA, No Debitur..."
                className="pl-9 w-full sm:w-[320px] bg-background"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset page on query
                }}
              />
            </div>
            {searchTerm && <span className="text-sm text-muted-foreground ml-2 hidden sm:block">Ditemukan: {filteredData.length}</span>}
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                {selectedIds.size} Terpilih
              </span>
              <Button 
                variant="destructive" 
                size="sm" 
                className="gap-2" 
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Hapus Terpilih
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto min-h-[300px]">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox 
                      checked={isAllSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-[150px]">No. Debitur</TableHead>
                  <TableHead>Nama & Agunan</TableHead>
                  <TableHead>No. WhatsApp</TableHead>
                  <TableHead className="text-right">Tunggakan (TGK)</TableHead>
                  <TableHead className="text-center">Status DB</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                     <TableCell colSpan={7} className="h-48 text-center bg-muted/5">
                        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Memuat data dari database...</p>
                     </TableCell>
                  </TableRow>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-muted/40 transition-colors [&:nth-child(even)]:bg-muted/10">
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Select ${item.nama}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-xs font-mono">{item.no_debitur}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{item.nama}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-[250px]" title={item.agunan}>{item.agunan}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 opacity-80">
                           <MessageCircle className="h-3 w-3 text-emerald-500" />
                           <span className="font-mono text-sm">{item.no_whatsapp}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="font-semibold text-destructive">{formatCurrency(item.tgk)}</div>
                        <div className="text-[10px] text-muted-foreground">OS: {formatCurrency(item.so_pokok)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">Tersimpan</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => handleEditClick(item)}>
                            <FileEdit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                         <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30" />
                         <p>Belum ada data debitur ditemukan.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {/* Pagination Section */}
        {filteredData.length > 0 && !isLoading && (
           <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground bg-muted/10">
             <div>
               Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} dari {filteredData.length} data
             </div>
             <div className="flex items-center gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 disabled={currentPage === 1}
                 onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
               >
                 Sebelumnya
               </Button>
               <div className="font-medium text-foreground px-2">Hal {currentPage} / {totalPages}</div>
               <Button
                 variant="outline"
                 size="sm"
                 disabled={currentPage === totalPages}
                 onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
               >
                 Selanjutnya
               </Button>
             </div>
           </div>
        )}
      </Card>

      {/* --- ADD MODAL --- */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tambah Data Debitur</DialogTitle>
            <DialogDescription>
              Masukkan informasi debitur baru ke dalam sistem (pastikan nomor WhatsApp awalan 62...).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="no_debitur">No. Debitur</Label>
                <Input id="no_debitur" placeholder="DB-..." value={newItem.no_debitur} onChange={(e) => setNewItem({ ...newItem, no_debitur: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input id="nama" placeholder="Budi S." value={newItem.nama} onChange={(e) => setNewItem({ ...newItem, nama: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agunan">Alamat Agunan / Keterangan</Label>
              <Input id="agunan" placeholder="Perumahan Indah..." value={newItem.agunan} onChange={(e) => setNewItem({ ...newItem, agunan: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="so_pokok">O/S Pokok (Rp)</Label>
                <Input id="so_pokok" type="number" min="0" value={newItem.so_pokok || ""} onChange={(e) => setNewItem({ ...newItem, so_pokok: Number(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tgk">Total Tunggakan (Rp)</Label>
                <Input id="tgk" type="number" min="0" value={newItem.tgk || ""} onChange={(e) => setNewItem({ ...newItem, tgk: Number(e.target.value) })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="no_whatsapp">No. WhatsApp</Label>
              <Input id="no_whatsapp" placeholder="62812xxxxxx" value={newItem.no_whatsapp} onChange={(e) => setNewItem({ ...newItem, no_whatsapp: e.target.value })} required />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Batal</Button>
              <Button type="submit">Simpan ke DB</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* --- EDIT MODAL --- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Data Debitur</DialogTitle>
            <DialogDescription>
              Perbarui informasi debitur.
            </DialogDescription>
          </DialogHeader>
          {editItem && (
            <form onSubmit={handleUpdate} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_no_debitur">No. Debitur</Label>
                  <Input id="edit_no_debitur" value={editItem.no_debitur} onChange={(e) => setEditItem({ ...editItem, no_debitur: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_nama">Nama Lengkap</Label>
                  <Input id="edit_nama" value={editItem.nama} onChange={(e) => setEditItem({ ...editItem, nama: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_agunan">Alamat Agunan / Keterangan</Label>
                <Input id="edit_agunan" value={editItem.agunan} onChange={(e) => setEditItem({ ...editItem, agunan: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_so_pokok">O/S Pokok (Rp)</Label>
                  <Input id="edit_so_pokok" type="number" min="0" value={editItem.so_pokok} onChange={(e) => setEditItem({ ...editItem, so_pokok: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_tgk">Total Tunggakan (Rp)</Label>
                  <Input id="edit_tgk" type="number" min="0" value={editItem.tgk} onChange={(e) => setEditItem({ ...editItem, tgk: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_no_whatsapp">No. WhatsApp</Label>
                <Input id="edit_no_whatsapp" value={editItem.no_whatsapp} onChange={(e) => setEditItem({ ...editItem, no_whatsapp: e.target.value })} required />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Batal</Button>
                <Button type="submit">Update DB</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* --- UPLOAD CSV MODAL --- */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Bulk Excel/CSV</DialogTitle>
            <DialogDescription>
              Unggah file data nasabah secara massal. Sistem membaca baris pertama sebagai <strong>header</strong> kolom.
            </DialogDescription>
          </DialogHeader>

          {/* Panduan Format Data */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-md p-4 text-sm text-blue-900 mb-2">
            <div className="flex items-center gap-2 font-semibold mb-2">
              <Info className="h-4 w-4 text-blue-600" /> Aturan Format File:
            </div>
            <ul className="list-disc list-inside space-y-1 text-blue-800/80 mb-3 text-xs leading-relaxed">
              <li>Pastikan penamaan baris pertama (judul kolom) persis seperti tabel cetak biru di bawah.</li>
              <li>Urutan posisi kolom boleh terbalik/acak, asalkan nama persis sesuai. Tanda (*) = Wajib isi.</li>
              <li>No WA <strong>wajib</strong> berawalan <code className="bg-blue-100 px-1 rounded">62</code> tanpa tambahan karakter apa pun (Contoh: <code className="bg-blue-100 px-1 rounded">628123456789</code>).</li>
              <li>Input nominal (SO Pokok & TGK) berupa angka polos tanpa titik/koma/Rp (Contoh: <code className="bg-blue-100 px-1 rounded">15000000</code>).</li>
            </ul>
            <div className="overflow-x-auto border border-blue-200/50 rounded-md bg-white">
              <Table className="text-xs">
                <TableHeader className="bg-blue-100/30">
                  <TableRow>
                    <TableHead className="py-2 text-blue-900 font-bold whitespace-nowrap">no_debitur *</TableHead>
                    <TableHead className="py-2 text-blue-900 font-bold whitespace-nowrap">nama *</TableHead>
                    <TableHead className="py-2 text-blue-900 font-bold whitespace-nowrap">agunan</TableHead>
                    <TableHead className="py-2 text-blue-900 font-bold whitespace-nowrap">so_pokok *</TableHead>
                    <TableHead className="py-2 text-blue-900 font-bold whitespace-nowrap">tgk *</TableHead>
                    <TableHead className="py-2 text-blue-900 font-bold whitespace-nowrap">no_whatsapp *</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="text-blue-800/70 hover:bg-transparent pointer-events-none">
                    <TableCell className="py-2">DB-001</TableCell>
                    <TableCell className="py-2">Budi Santoso</TableCell>
                    <TableCell className="py-2">Blok A2</TableCell>
                    <TableCell className="py-2">100000000</TableCell>
                    <TableCell className="py-2">2500000</TableCell>
                    <TableCell className="py-2">628123456789</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()} 
            className={`py-6 my-2 flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-colors cursor-pointer text-center px-4 ${selectedFile ? 'border-primary bg-primary/5' : 'border-border bg-muted/10 hover:bg-muted/30'}`}
          >
            {selectedFile ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-emerald-500 mb-3" />
                <h3 className="font-semibold text-emerald-700 text-base">{selectedFile.name}</h3>
                <p className="text-xs text-emerald-600/70 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB (Klik untuk ganti file)</p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="font-semibold text-base">Klik atau Drag & Drop File CSV Di Sini</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                  Mendukung format .csv (Max. 5MB)
                </p>
              </>
            )}
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
          </div>
          
          <DialogFooter className="sm:justify-between items-center">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 mt-2 sm:mt-0 w-full sm:w-auto">
              <Download className="h-4 w-4" /> Download Template CSV
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button type="button" variant="ghost" onClick={() => setIsUploadOpen(false)} className="flex-1 sm:flex-none">Kembali</Button>
              <Button onClick={handleProcessUpload} disabled={!selectedFile || isUploading} className="flex-1 sm:flex-none w-32">
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload Ekstrak"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- DELETE CONFIRMATION MODAL --- */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Debitur?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data debitur akan dihapus dari Database secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* --- BULK DELETE CONFIRMATION MODAL --- */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedIds.size} Data Debitur?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. {selectedIds.size} data debitur yang dipilih akan dihapus dari Database secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus Semua yang Terpilih
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
