import React, { useState, useEffect } from "react";
import { Order, AppSettings, PHOTO_SIZES } from "./types";
import CameraCapture from "./components/CameraCapture";
import OrderList from "./components/OrderList";
import AppSettingsPanel from "./components/AppSettingsPanel";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  History, 
  Settings, 
  HelpCircle, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  Sparkles,
  RefreshCw,
  X,
  Smartphone
} from "lucide-react";

// =========================================================================
// PENTING: MASUKKAN URL GOOGLE APPS SCRIPT ANDA DI SINI!
// Ganti URL contoh di bawah ini dengan URL Web App milik Anda yang didapat
// setelah men-Deploy (penerapan baru) Google Apps Script Anda.
// URL ini dikunci di dalam coding agar tersimpan aman selamanya dan tidak hilang.
// =========================================================================
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx2wJ5t298D5XgVT1MMingENNOK5hrRkm-mJ3o2SKEZfAe4r-5ItZ-lCYGY3Vo_DYc/exec";

// Default settings setup
const DEFAULT_SETTINGS: AppSettings = {
  appsScriptUrl: APPS_SCRIPT_URL,
  studioName: "Studio Mextri",
  whatsappMessageTemplate: `Halo {nama},\n\nTerima kasih telah mencetak foto di *{studio}*! 📸\n\nBerikut rincian pesanan Anda:\n📅 Tanggal: {tanggal}\n👤 Nama: {nama}\n📏 Ukuran: {ukuran}\n💰 Uang Dibayar: {bayar}\n💬 Keterangan: {keterangan}\n\nLink unduh foto resolusi penuh Anda di Google Drive:\n🔗 {link}\n\nSimpan link di atas dengan baik ya! Semoga harimu menyenangkan! ✨`
};

export default function App() {
  // State definitions
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"form" | "history" | "settings">("form");
  
  // Form Fields State
  const [customerName, setCustomerName] = useState("");
  const [photoSize, setPhotoSize] = useState("3x4");
  const [customSizeText, setCustomSizeText] = useState("");
  const [amountPaid, setAmountPaid] = useState<number>(15000); // Defaults to 3x4 price
  const [phoneNumber, setPhoneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  
  // Submission & Sync states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncStatusModal, setSyncStatusModal] = useState<{
    show: boolean;
    status: "success" | "warning" | "error";
    title: string;
    message: string;
    orderId?: string;
    driveUrl?: string;
  } | null>(null);

  // Load state from localStorage on init
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem("studio_settings_db");
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        const name = (!parsed.studioName || parsed.studioName === "Studio Foto Kita") ? "Studio Mextri" : parsed.studioName;
        setSettings({
          ...parsed,
          studioName: name,
          appsScriptUrl: parsed.appsScriptUrl || APPS_SCRIPT_URL
        });
      } else {
        setSettings({
          ...DEFAULT_SETTINGS,
          appsScriptUrl: APPS_SCRIPT_URL
        });
      }
      
      const storedOrders = localStorage.getItem("orders_db");
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      }
    } catch (err) {
      console.error("Failed to load data from localStorage:", err);
    }
  }, []);

  // Update payment amount automatically when photo size changes
  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sizeVal = e.target.value;
    setPhotoSize(sizeVal);
    
    if (sizeVal === "Custom") {
      setAmountPaid(0);
    } else {
      const sizeConfig = PHOTO_SIZES.find(s => s.value === sizeVal);
      if (sizeConfig) {
        setAmountPaid(sizeConfig.defaultPrice);
      }
    }
  };

  // Save settings helper
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem("studio_settings_db", JSON.stringify(newSettings));
  };

  // Main Sheets & Drive sync function
  const syncOrderWithSheets = async (orderToSync: Order): Promise<{ driveUrl: string; orderId: string }> => {
    const isUrlConfigured = APPS_SCRIPT_URL && APPS_SCRIPT_URL.trim() !== "" && !APPS_SCRIPT_URL.includes("example");
    if (!isUrlConfigured) {
      throw new Error("URL Google Apps Script belum dikonfigurasi di dalam coding (App.tsx).");
    }

    const payload = {
      name: orderToSync.name,
      photoSize: orderToSync.photoSize,
      amountPaid: orderToSync.amountPaid,
      phoneNumber: orderToSync.phoneNumber,
      description: orderToSync.description,
      photoBase64: orderToSync.photoBase64
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8" // Important: Avoid CORS preflight OPTIONS blocking on simple text post
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Koneksi ke Apps Script gagal dengan status: ${response.status}`);
    }

    const result = await response.json();
    if (result.status === "error") {
      throw new Error(result.message || "Gagal memproses data di Apps Script.");
    }

    return {
      driveUrl: result.driveUrl || "",
      orderId: result.orderId || `STD-${Math.floor(100000 + Math.random() * 900000)}`
    };
  };

  // Individual Order Re-Sync Trigger
  const handleReSyncOrder = async (orderToSync: Order) => {
    try {
      const result = await syncOrderWithSheets(orderToSync);
      
      // Update state & localStorage
      const updatedOrders = orders.map((o) => {
        if (o.id === orderToSync.id) {
          return {
            ...o,
            synced: true,
            driveUrl: result.driveUrl,
            error: undefined
          };
        }
        return o;
      });
      
      setOrders(updatedOrders);
      localStorage.setItem("orders_db", JSON.stringify(updatedOrders));
    } catch (err: any) {
      console.error("Re-sync failed:", err);
      
      // Keep track of sync error locally
      const updatedOrders = orders.map((o) => {
        if (o.id === orderToSync.id) {
          return { ...o, synced: false, error: err.message || "Koneksi terputus" };
        }
        return o;
      });
      setOrders(updatedOrders);
      localStorage.setItem("orders_db", JSON.stringify(updatedOrders));
      throw err;
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert("Mohon masukkan Nama Pelanggan.");
      return;
    }

    if (!photoBase64) {
      alert("Mohon ambil foto pelanggan terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);

    const sizeLabel = photoSize === "Custom" 
      ? `Kustom (${customSizeText || "Kustom"})` 
      : (PHOTO_SIZES.find(s => s.value === photoSize)?.label || photoSize);

    // 1. Create Order Item
    const newOrder: Order = {
      id: `STD-${Math.floor(100000 + Math.random() * 900000)}`,
      name: customerName.trim(),
      photoSize: sizeLabel,
      amountPaid: Number(amountPaid),
      phoneNumber: phoneNumber.trim(),
      description: description.trim(),
      photoBase64: photoBase64,
      timestamp: new Date().toISOString(),
      synced: false
    };

    // Save locally first immediately to prevent data loss!
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem("orders_db", JSON.stringify(updatedOrders));

    // Try syncing to Google Sheets
    const isUrlConfigured = APPS_SCRIPT_URL && APPS_SCRIPT_URL.trim() !== "" && !APPS_SCRIPT_URL.includes("example");
    if (isUrlConfigured) {
      try {
        const syncResult = await syncOrderWithSheets(newOrder);
        
        // Update order in state & localStorage with sync data
        const syncedOrders = updatedOrders.map((o) => {
          if (o.id === newOrder.id) {
            return {
              ...o,
              synced: true,
              driveUrl: syncResult.driveUrl,
              id: syncResult.orderId // Use Apps Script generated ID if available
            };
          }
          return o;
        });
        
        setOrders(syncedOrders);
        localStorage.setItem("orders_db", JSON.stringify(syncedOrders));

        setSyncStatusModal({
          show: true,
          status: "success",
          title: "Transaksi & Foto Tersimpan!",
          message: "Data pelanggan berhasil ditambahkan dan foto diunggah ke Google Drive Anda secara real-time.",
          orderId: syncResult.orderId,
          driveUrl: syncResult.driveUrl
        });

        // Reset Form Fields
        resetForm();

      } catch (err: any) {
        console.error("Instant sync failed, kept in queue:", err);
        
        // Update with error details
        const erroredOrders = updatedOrders.map((o) => {
          if (o.id === newOrder.id) {
            return { ...o, error: err.message || "Gagal menghubungkan" };
          }
          return o;
        });
        setOrders(erroredOrders);
        localStorage.setItem("orders_db", JSON.stringify(erroredOrders));

        setSyncStatusModal({
          show: true,
          status: "warning",
          title: "Simpan Lokal Sukses, Sync Tertunda",
          message: "Data berhasil disimpan di memori lokal aplikasi ini. Namun, pengunggahan ke Google Sheets/Drive tertunda karena: " + (err.message || "Koneksi terganggu.") + " Anda dapat melakukan sinkronisasi ulang nanti di tab Riwayat.",
          orderId: newOrder.id
        });
        
        resetForm();
      }
    } else {
      // Saved in demo/local mode
      setSyncStatusModal({
        show: true,
        status: "warning",
        title: "Tersimpan Lokal (Demo Mode)",
        message: "Data pelanggan telah disimpan di database lokal browser. Silakan atur URL Google Apps Script di tab Pengaturan untuk mengaktifkan sinkronisasi otomatis ke Google Sheets.",
        orderId: newOrder.id
      });
      
      resetForm();
    }

    setIsSubmitting(false);
  };

  const resetForm = () => {
    setCustomerName("");
    setPhotoSize("3x4");
    setCustomSizeText("");
    setAmountPaid(15000);
    setPhoneNumber("");
    setDescription("");
    setPhotoBase64(null);
  };

  // Delete Order Item
  const handleDeleteOrder = (id: string) => {
    const updated = orders.filter((o) => o.id !== id);
    setOrders(updated);
    localStorage.setItem("orders_db", JSON.stringify(updated));
  };

  // Calculate statistics for dashboard
  const stats = {
    totalOrders: orders.length,
    syncedOrders: orders.filter(o => o.synced).length,
    pendingOrders: orders.filter(o => !o.synced).length,
    totalRevenue: orders.reduce((sum, o) => sum + o.amountPaid, 0)
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pb-12" id="app-root">
      
      {/* Top Banner Warning if Sheets not configured */}
      {(!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("example")) && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 text-xs text-amber-800 text-center font-medium flex items-center justify-center gap-1.5 shrink-0 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Aplikasi berjalan dalam <strong>Mode Demo (Lokal)</strong>. Silakan masukkan URL Google Apps Script Anda langsung di dalam coding file <strong>src/App.tsx</strong> (paling atas) agar terhubung secara permanen!</span>
        </div>
      )}

      {/* Elegant Header / Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs shrink-0" id="app-header">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight flex items-center gap-1.5">
                {settings.studioName}
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">Sheets V2</span>
              </h1>
              <p className="text-xs text-slate-500">Pencatatan Pesanan & Kamera Studio Foto Terintegrasi</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex bg-slate-100 p-1 rounded-xl" id="nav-tabs">
            <button
              onClick={() => setActiveTab("form")}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "form" ? "bg-white text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              type="button"
            >
              <PlusCircle className="w-4 h-4" />
              Tambah Pesanan
            </button>
            
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "history" ? "bg-white text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              type="button"
            >
              <History className="w-4 h-4" />
              Riwayat & Sinkron ({stats.pendingOrders > 0 ? `${stats.pendingOrders} Pending` : stats.totalOrders})
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 py-2 px-4 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "settings" ? "bg-white text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              type="button"
            >
              <Settings className="w-4 h-4" />
              Pengaturan
            </button>
          </nav>

        </div>
      </header>

      {/* Main Content Stage */}
      <main className="max-w-6xl mx-auto px-4 mt-6 flex-1 w-full space-y-6">
        
        {/* Statistics Dashboard Banner (Only visible on Form and History) */}
        {activeTab !== "settings" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-banner">
            {/* Total Orders */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
              <div className="p-2.5 bg-slate-50 text-slate-700 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block tracking-wider">Total Pesanan</span>
                <span className="text-xl font-bold text-slate-900">{stats.totalOrders}</span>
              </div>
            </div>

            {/* Synced Orders */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block tracking-wider">Tersinkron</span>
                <span className="text-xl font-bold text-emerald-700">{stats.syncedOrders}</span>
              </div>
            </div>

            {/* Pending Sync */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs">
              <div className={`p-2.5 rounded-lg ${stats.pendingOrders > 0 ? "bg-amber-50 text-amber-700 animate-pulse" : "bg-slate-50 text-slate-400"}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block tracking-wider">Antrean Pending</span>
                <span className={`text-xl font-bold ${stats.pendingOrders > 0 ? "text-amber-600" : "text-slate-900"}`}>{stats.pendingOrders}</span>
              </div>
            </div>

            {/* Total earnings */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3.5 shadow-xs col-span-2 md:col-span-1">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block tracking-wider">Total Pendapatan</span>
                <span className="text-xl font-bold text-slate-900 font-mono">{formatIDR(stats.totalRevenue)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Tab Panel Switching */}
        <div id="tab-content-wrapper">
          <AnimatePresence mode="wait">
            {activeTab === "form" && (
              <motion.div
                key="form-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                
                {/* Form Input Section (2/3 width) */}
                <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6" id="add-order-form">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <h2 className="font-bold text-slate-800 text-base">Formulir Pesanan & Cetak Foto</h2>
                  </div>

                  {/* Customer Camera Capture Component */}
                  <CameraCapture 
                    onPhotoCaptured={setPhotoBase64} 
                    savedPhoto={photoBase64} 
                    onClearPhoto={() => setPhotoBase64(null)} 
                  />

                  {/* Row 1: Name and Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="input-name">Nama Pelanggan *</label>
                      <input
                        type="text"
                        id="input-name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        required
                        className="w-full border border-slate-300 rounded-lg py-2.5 px-3.5 text-sm focus:border-slate-800 focus:outline-hidden bg-slate-50/50"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="input-phone">No. HP / WhatsApp Pelanggan</label>
                      <div className="relative">
                        <input
                          type="tel"
                          id="input-phone"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Contoh: 08123456789"
                          className="w-full border border-slate-300 rounded-lg py-2.5 px-3.5 text-sm focus:border-slate-800 focus:outline-hidden bg-slate-50/50"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk kirim nota pembayaran dan tautan Google Drive.</p>
                    </div>
                  </div>

                  {/* Row 2: Photo size and custom text */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Photo Size Select */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Ukuran Foto *</label>
                      <select
                        value={photoSize}
                        onChange={handleSizeChange}
                        className="w-full border border-slate-300 rounded-lg py-2.5 px-3 bg-slate-50/50 text-sm focus:border-slate-800 focus:outline-hidden font-medium"
                      >
                        {PHOTO_SIZES.map((size) => (
                          <option key={size.value} value={size.value}>
                            {size.label} {size.defaultPrice > 0 ? `(${formatIDR(size.defaultPrice)})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Conditional Custom Size Text */}
                    {photoSize === "Custom" ? (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tulis Ukuran Kustom *</label>
                        <input
                          type="text"
                          value={customSizeText}
                          onChange={(e) => setCustomSizeText(e.target.value)}
                          placeholder="Contoh: Cetak Polaroid, 12R, dll"
                          required={photoSize === "Custom"}
                          className="w-full border border-slate-300 rounded-lg py-2.5 px-3.5 text-sm focus:border-slate-800 focus:outline-hidden bg-slate-50/50"
                        />
                      </div>
                    ) : (
                      <div className="hidden sm:block opacity-0 select-none">Spacer</div>
                    )}
                  </div>

                  {/* Row 3: Amount Paid (Uang yang dibayar) */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Uang Yang Di Bayar (Rp) *</label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                        Rp
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={amountPaid === 0 ? "" : amountPaid}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        placeholder="0"
                        required
                        className="w-full border border-slate-300 rounded-lg py-2.5 pl-10 pr-3.5 text-sm font-mono focus:border-slate-800 focus:outline-hidden bg-slate-50/50"
                      />
                    </div>
                    {/* Quick select presets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[5000, 10000, 15000, 20000, 50000, 100000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmountPaid(preset)}
                          className={`text-[10px] font-bold py-1 px-2.5 rounded-md border transition-all cursor-pointer ${
                            amountPaid === preset
                              ? "bg-slate-900 border-slate-900 text-white"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {formatIDR(preset).replace("Rp", "").trim()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Row 4: Keterangan */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Keterangan Tambahan / Catatan</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Contoh: Background warna biru, minta edit kontras, cetak 3 lembar..."
                      rows={3}
                      className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:border-slate-800 focus:outline-hidden bg-slate-50/50"
                    />
                  </div>

                  {/* Submission Button */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 px-8 rounded-xl transition-all shadow-sm active:scale-98 disabled:opacity-60 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menyimpan & Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Simpan Transaksi & Cetak</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>

                {/* Guide Section (1/3 width) */}
                <div className="space-y-6" id="add-order-guide-column">
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm border-b pb-2">💡 Tips Kamera Studio</h3>
                    <ul className="text-xs text-slate-600 space-y-3">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span><strong>Pencahayaan:</strong> Pastikan wajah pelanggan mendapatkan cahaya yang rata dan tidak membelakangi lampu studio (backlight).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span><strong>Posisi Duduk:</strong> Instruksikan pelanggan untuk duduk tegak, menghadap lurus ke depan, dengan pundak yang sejajar.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span><strong>Ekspresi:</strong> Senyum simpul sewajarnya sesuai kebutuhan foto (pas foto formal biasanya netral/senyum tipis).</span>
                      </li>
                    </ul>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                    <div className="flex items-center gap-2">
                      <History className="w-5 h-5 text-slate-700" />
                      <h2 className="font-bold text-slate-800 text-base">Riwayat & Daftar Antrean Sinkronisasi</h2>
                    </div>
                    {stats.pendingOrders > 0 && (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Ada {stats.pendingOrders} data pending belum disinkron ke Google Sheets</span>
                      </div>
                    )}
                  </div>

                  <OrderList 
                    orders={orders} 
                    onDeleteOrder={handleDeleteOrder} 
                    onSyncOrder={handleReSyncOrder}
                    settings={settings}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "settings" && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18 }}
                className="max-w-3xl mx-auto w-full"
              >
                <AppSettingsPanel 
                  settings={settings} 
                  onSaveSettings={handleSaveSettings} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

      {/* Sync Status Overlay Modal */}
      {syncStatusModal && syncStatusModal.show && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 text-center relative animate-scale-up">
            
            <button
              onClick={() => setSyncStatusModal(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="mx-auto flex items-center justify-center w-14 h-14 rounded-full mt-2">
              {syncStatusModal.status === "success" ? (
                <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-lg">{syncStatusModal.title}</h3>
              <p className="text-xs font-mono text-slate-400">ID Pesanan: {syncStatusModal.orderId}</p>
              <p className="text-sm text-slate-600 leading-relaxed pt-2 px-1">{syncStatusModal.message}</p>
            </div>

            {/* Actions */}
            <div className="pt-4 flex flex-col gap-2">
              {syncStatusModal.driveUrl && (
                <a
                  href={syncStatusModal.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Lihat Foto di Google Drive
                </a>
              )}
              
              <button
                onClick={() => setSyncStatusModal(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                type="button"
              >
                Selesai / Lanjut
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
