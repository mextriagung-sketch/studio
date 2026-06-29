import { useState, useEffect } from "react";
import { AppSettings } from "../types";
import { APPS_SCRIPT_URL } from "../App";
import { Settings, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Save } from "lucide-react";

interface AppSettingsPanelProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export default function AppSettingsPanel({ settings, onSaveSettings }: AppSettingsPanelProps) {
  const [studioName, setStudioName] = useState(settings.studioName);
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState(settings.whatsappMessageTemplate);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setStudioName(settings.studioName);
    setWhatsappMessageTemplate(settings.whatsappMessageTemplate);
  }, [settings]);

  const handleSave = () => {
    onSaveSettings({
      appsScriptUrl: APPS_SCRIPT_URL,
      studioName: studioName.trim() || "Studio Mextri",
      whatsappMessageTemplate
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    const isUrlConfigured = APPS_SCRIPT_URL && APPS_SCRIPT_URL.trim() !== "" && !APPS_SCRIPT_URL.includes("example");
    if (!isUrlConfigured) {
      setTestStatus("error");
      setTestMessage("Mohon masukkan URL Google Apps Script terlebih dahulu di dalam file coding (src/App.tsx).");
      return;
    }

    setTestStatus("testing");
    setTestMessage("Menghubungi Google Apps Script...");

    try {
      // Create a controller to abort if too slow (e.g. 8 seconds)
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(id);

      const data = await response.json();
      
      if (data && (data.status === "ok" || data.status === "success")) {
        setTestStatus("success");
        setTestMessage(data.message || "Koneksi berhasil! Apps Script aktif.");
      } else {
        setTestStatus("error");
        setTestMessage(data.message || "Apps Script merespon, namun format tidak dikenali.");
      }
    } catch (err: any) {
      console.error("Test connection failed:", err);
      if (err.name === 'AbortError') {
        setTestStatus("error");
        setTestMessage("Timeout: Melebihi batas waktu 8 detik. Pastikan URL benar.");
      } else {
        setTestStatus("error");
        setTestMessage("Koneksi gagal. Pastikan Anda telah me-deploy sebagai 'Aplikasi Web' dengan akses ke 'Siapa saja' (Anyone).");
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6" id="settings-panel">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <Settings className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">Pengaturan Studio & Integrasi</h3>
      </div>

      <div className="space-y-4">
        {/* Studio Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Studio Foto</label>
          <input
            type="text"
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="Contoh: Studio Foto Smile"
            className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:border-slate-800 focus:outline-hidden"
          />
        </div>

        {/* Live Test Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testStatus === "testing"}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            type="button"
          >
            {testStatus === "testing" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Menguji...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Uji Koneksi Sheets</span>
              </>
            )}
          </button>
        </div>

        {/* Test Result Message */}
        {testStatus !== "idle" && (
          <div className={`p-3 rounded-lg flex items-start gap-2.5 text-xs ${
            testStatus === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
            testStatus === "testing" ? "bg-slate-50 text-slate-600 border border-slate-100" :
            "bg-rose-50 text-rose-800 border border-rose-100"
          }`}>
            {testStatus === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
            {testStatus === "error" && <XCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            {testStatus === "testing" && <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-slate-500" />}
            <span className="leading-relaxed">{testMessage}</span>
          </div>
        )}

        {/* WhatsApp Invoice Template */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Template Pesan WhatsApp</label>
          <textarea
            value={whatsappMessageTemplate}
            onChange={(e) => setWhatsappMessageTemplate(e.target.value)}
            rows={4}
            className="w-full border border-slate-300 rounded-lg py-2 px-3 text-sm focus:border-slate-800 focus:outline-hidden"
            placeholder="Tulis template nota WhatsApp di sini..."
          />
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 mt-1 space-y-1">
            <span className="font-semibold block text-slate-600">Daftar Variabel yang Dapat Digunakan:</span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono">
              <div><code>{"{nama}"}</code>: Nama Pelanggan</div>
              <div><code>{"{ukuran}"}</code>: Ukuran Foto</div>
              <div><code>{"{bayar}"}</code>: Nominal Bayar</div>
              <div><code>{"{hp}"}</code>: Nomor HP</div>
              <div><code>{"{studio}"}</code>: Nama Studio</div>
              <div><code>{"{link}"}</code>: Link Foto Drive</div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-6 rounded-lg transition-colors cursor-pointer shadow-xs"
            type="button"
          >
            <Save className="w-4 h-4" />
            {isSaved ? "Tersimpan!" : "Simpan Pengaturan"}
          </button>
        </div>
      </div>
    </div>
  );
}
