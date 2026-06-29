import { useState } from "react";
import { Order, AppSettings } from "../types";
import { APPS_SCRIPT_URL } from "../App";
import { Search, Filter, Phone, CheckCircle2, AlertCircle, Trash2, ExternalLink, Calendar, MessageSquare, Send, RefreshCw, X, DollarSign, Image as ImageIcon } from "lucide-react";

interface OrderListProps {
  orders: Order[];
  onDeleteOrder: (id: string) => void;
  onSyncOrder: (order: Order) => Promise<void>;
  settings: AppSettings;
}

export default function OrderList({ orders, onDeleteOrder, onSyncOrder, settings }: OrderListProps) {
  const [search, setSearch] = useState("");
  const isUrlConfigured = APPS_SCRIPT_URL && APPS_SCRIPT_URL.trim() !== "" && !APPS_SCRIPT_URL.includes("example");
  const [filter, setFilter] = useState<"all" | "synced" | "pending">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Format IDR currency helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  // Filter and search logic
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.name.toLowerCase().includes(search.toLowerCase()) ||
      order.phoneNumber.includes(search);

    if (filter === "all") return matchesSearch;
    if (filter === "synced") return matchesSearch && order.synced;
    if (filter === "pending") return matchesSearch && !order.synced;
    return matchesSearch;
  });

  const handleSingleSync = async (order: Order) => {
    setSyncingId(order.id);
    try {
      await onSyncOrder(order);
    } catch (err) {
      console.error(err);
    } finally {
      setSyncingId(null);
      // Refresh details modal view if it is open
      if (selectedOrder && selectedOrder.id === order.id) {
        const updated = orders.find(o => o.id === order.id);
        if (updated) setSelectedOrder(updated);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus catatan pesanan ini dari riwayat lokal?")) {
      onDeleteOrder(id);
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
    }
  };

  // Generate WhatsApp Invoice link
  const getWhatsAppLink = (order: Order) => {
    // Standardize phone number (e.g. change 08123... to 628123...)
    let cleanPhone = order.phoneNumber.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith("8")) {
      cleanPhone = "62" + cleanPhone;
    }

    let template = settings.whatsappMessageTemplate;
    
    // Replace placeholders
    const formattedDate = new Date(order.timestamp).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const replaced = template
      .replace(/{nama}/g, order.name)
      .replace(/{ukuran}/g, order.photoSize)
      .replace(/{bayar}/g, formatIDR(order.amountPaid))
      .replace(/{hp}/g, order.phoneNumber)
      .replace(/{studio}/g, settings.studioName)
      .replace(/{link}/g, order.driveUrl || "(Tautan foto sedang diproses/gagal sinkron)")
      .replace(/{tanggal}/g, formattedDate);

    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(replaced)}`;
  };

  return (
    <div className="space-y-4" id="order-list-section">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pelanggan berdasarkan nama / No. HP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:border-slate-800 focus:outline-hidden"
          />
        </div>

        {/* Filter Status */}
        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg self-start md:self-auto shrink-0">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              filter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
            type="button"
          >
            Semua ({orders.length})
          </button>
          <button
            onClick={() => setFilter("synced")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              filter === "synced" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-emerald-700"
            }`}
            type="button"
          >
            Tersinkron ({orders.filter(o => o.synced).length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              filter === "pending" ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-amber-700"
            }`}
            type="button"
          >
            Pending ({orders.filter(o => !o.synced).length})
          </button>
        </div>
      </div>

      {/* Orders Grid / List */}
      {filteredOrders.length === 0 ? (
        <div className="border border-slate-200 rounded-xl p-12 text-center bg-white space-y-2">
          <p className="text-sm font-medium text-slate-600">Tidak ada data transaksi ditemukan</p>
          <p className="text-xs text-slate-400">Silakan input pesanan baru lewat form di atas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="orders-grid">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="group bg-white border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
            >
              {/* Photo Thumbnail */}
              <div className="relative aspect-video bg-slate-50 border-b border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                {order.photoBase64 ? (
                  <img
                    src={order.photoBase64}
                    alt={order.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-slate-300">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                
                {/* Status Tag */}
                <div className="absolute top-2.5 right-2.5 flex items-center">
                  {order.synced ? (
                    <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      <CheckCircle2 className="w-3 h-3" /> Sheets
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      <AlertCircle className="w-3 h-3" /> Pending
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2.5 left-2.5 bg-black/75 text-white text-[10px] font-medium font-mono px-2 py-0.5 rounded-sm">
                  {order.photoSize}
                </div>
              </div>

              {/* Order Info */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-slate-400 font-mono">
                    {new Date(order.timestamp).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </p>
                  <h4 className="font-semibold text-slate-800 line-clamp-1">{order.name}</h4>
                  <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {order.phoneNumber || "-"}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <span className="text-xs font-bold text-slate-950">
                    {formatIDR(order.amountPaid)}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 hover:underline inline-flex items-center gap-0.5">
                    Detail Pesanan &rarr;
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="order-detail-modal">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col md:flex-row animate-scale-up">
            {/* Left: Photo display */}
            <div className="md:w-1/2 bg-slate-900 flex flex-col justify-between relative p-4 min-h-[300px] md:min-h-0">
              <div className="flex-1 flex items-center justify-center">
                {selectedOrder.photoBase64 ? (
                  <img
                    src={selectedOrder.photoBase64}
                    alt={selectedOrder.name}
                    className="max-h-[50vh] md:max-h-[70vh] w-full object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-slate-600 flex flex-col items-center gap-2">
                    <ImageIcon className="w-12 h-12" />
                    <span className="text-xs">Foto tidak tersedia</span>
                  </div>
                )}
              </div>

              {selectedOrder.driveUrl && (
                <a
                  href={selectedOrder.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs py-2 px-3 rounded-lg backdrop-blur-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka Gambar di Google Drive
                </a>
              )}
            </div>

            {/* Right: Info Details */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between bg-white overflow-y-auto max-h-[50vh] md:max-h-[90vh]">
              <div className="space-y-5">
                {/* Modal Title */}
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 py-0.5 px-2 rounded-sm font-semibold">
                      ID: {selectedOrder.id}
                    </span>
                    <h3 className="font-bold text-slate-800 text-lg mt-1">Detail Pesanan</h3>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    type="button"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Info Fields */}
                <div className="space-y-3 text-sm">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 text-xs">Status Sinkronisasi</span>
                    {selectedOrder.synced ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Tersinkron ke Sheets
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Belum Tersinkron
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Tanggal Input
                    </span>
                    <span className="text-slate-700 font-medium text-xs">
                      {new Date(selectedOrder.timestamp).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })}
                    </span>
                  </div>

                  {/* Customer Name */}
                  <div className="space-y-0.5 py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 text-xs block">Nama Pelanggan</span>
                    <span className="text-slate-800 font-bold text-base">{selectedOrder.name}</span>
                  </div>

                  {/* Photo Size */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 text-xs">Ukuran Foto</span>
                    <span className="text-slate-800 font-semibold">{selectedOrder.photoSize}</span>
                  </div>

                  {/* Amount Paid */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Pembayaran
                    </span>
                    <span className="text-emerald-700 font-bold text-base">
                      {formatIDR(selectedOrder.amountPaid)}
                    </span>
                  </div>

                  {/* Phone number */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 text-xs">Nomor HP</span>
                    <span className="text-slate-800 font-mono font-medium">
                      {selectedOrder.phoneNumber || "-"}
                    </span>
                  </div>

                  {/* Description */}
                  <div className="space-y-1 py-1.5">
                    <span className="text-slate-400 text-xs block">Keterangan Tambahan</span>
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs leading-relaxed max-h-24 overflow-y-auto">
                      {selectedOrder.description || "Tidak ada keterangan."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Actions inside Modal */}
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                {/* WhatsApp button */}
                {selectedOrder.phoneNumber && (
                  <a
                    href={getWhatsAppLink(selectedOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Kirim Nota ke WhatsApp
                  </a>
                )}

                {/* Sync & Delete row buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSingleSync(selectedOrder)}
                    disabled={syncingId === selectedOrder.id || !isUrlConfigured}
                    className="flex items-center justify-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 py-2 px-3 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    type="button"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingId === selectedOrder.id ? "animate-spin text-emerald-600" : ""}`} />
                    {selectedOrder.synced ? "Re-Sync Sheets" : "Sync Sekarang"}
                  </button>

                  <button
                    onClick={() => handleDelete(selectedOrder.id)}
                    className="flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    type="button"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Riwayat
                  </button>
                </div>
                
                {!isUrlConfigured && !selectedOrder.synced && (
                  <p className="text-[10px] text-amber-600 text-center mt-1">
                    ⚠️ Silakan masukkan URL Apps Script di dalam coding file App.tsx untuk mensinkronisasi data ke Google Sheets.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
