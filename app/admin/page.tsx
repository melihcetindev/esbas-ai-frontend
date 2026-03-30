"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useModal } from "../components/ModalContext";
import {
  Activity,
  Clock,
  Database,
  List,
  Trash2,
  Sun,
  Moon,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  CheckCircle2,
  Globe
} from "lucide-react";

// DİNAMİK API URL TANIMLAMASI
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://esbasai.melihcetin.dev";

interface Metrikler {
  soruyu_anlama?: number;
  belge_bulma?: number;
  kalite_filtresi?: number;
  cevap_yazma_hizi?: number;
  toplam_islem?: number;
  prompt_hazirligi?: number;
  toplam_sure?: number;
  vektor_arama?: number;
  yeniden_siralama?: number;
}

interface LogEntry {
  tarih: string;
  soru: string;
  cevap: string;
  metrikler_saniye: Metrikler;
}

interface DocEntry {
  name: string;
  type?: string;
}

interface UrlEntry {
  url: string;
  filename: string;
}

const docSteps = [
  "Bağlantı kuruluyor...",
  "Dosyalar okunup temizleniyor...",
  "Yapay zeka için parçalara ayrılıyor (Chunking)...",
  "Hafızaya (ChromaDB) kazınıyor...",
  "Yapay Zeka motoru yeniden başlatılıyor..."
];

const urlSteps = [
  "Bağlantı kuruluyor...",
  "Web sayfası okunarak sadeleştiriliyor...",
  "Yapay zeka için parçalara ayrılıyor (Chunking)...",
  "Hafızaya (ChromaDB) kazınıyor...",
  "Yapay Zeka motoru yeniden başlatılıyor..."
];

const deepUrlSteps = [
  "Bağlantı kuruluyor ve Örümcek Ağı başlatılıyor...",
  "Tüm alt sayfalar geziliyor ve sadeleştiriliyor...",
  "Yüzlerce sayfa Yapay Zeka için parçalara ayrılıyor...",
  "Toplu veriler Hafızaya (ChromaDB) kazınıyor...",
  "Yapay Zeka motoru devasa veriyle yeniden başlatılıyor..."
];

export default function AdminDashboard() {
  const { showConfirm, showToast, isDarkMode, setIsDarkMode } = useModal();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Upload States (Docs)
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [docStepIndex, setDocStepIndex] = useState(0);

  // Upload States (URLs)
  const [urlInput, setUrlInput] = useState("");
  const [isUrlUploading, setIsUrlUploading] = useState(false);
  const [urlUploadProgress, setUrlUploadProgress] = useState(0);
  const [urlStepIndex, setUrlStepIndex] = useState(0);
  const [isDeepCrawl, setIsDeepCrawl] = useState(false);

  // Veri Çekme Mimarisi
  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api_logs`);
      const data = await res.json();
      const logsArray = Array.isArray(data) ? data : data.logs || [];
      setLogs(logsArray);
    } catch (error) {
      console.error("Loglar çekilirken hata:", error);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/list_docs`);
      const data = await res.json();
      setDocs(data.documents || []);
    } catch (error) {
      console.error("Dokümanlar çekilirken hata:", error);
    }
  };

  const fetchUrls = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/list_urls`);
      const data = await res.json();
      setUrls(data.urls || []);
    } catch (error) {
      console.error("URL'ler çekilirken hata:", error);
    }
  };

  useEffect(() => {
    Promise.all([fetchLogs(), fetchDocs(), fetchUrls()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  // ====== LOG SİLME ======
  const handleDeleteAll = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api_logs/all`, { method: "DELETE" });
      if (res.ok) setLogs([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSingle = async (tarih: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api_logs/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarih }),
      });
      if (res.ok) setLogs((prev) => prev.filter((log) => log.tarih !== tarih));
    } catch (e) {
      console.error(e);
    }
  };

  // ====== BULK SİLME (DOCS) ======
  const handleDeleteBulkDocs = () => {
    if (selectedDocs.length === 0) return;
    showConfirm(
      "Belgeleri Sil",
      `${selectedDocs.length} adet belgeyi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/delete_docs/bulk`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filenames: selectedDocs })
          });
          if (res.ok) {
            setDocs(prev => prev.filter(d => !selectedDocs.includes(d.name)));
            setSelectedDocs([]);
            showToast(`${selectedDocs.length} belge başarıyla silindi.`, "success");
          } else {
            const err = await res.json();
            showToast("Hata: " + err.message, "error");
          }
        } catch (e) {
          console.error(e);
          showToast("Silme işlemi sırasında ağ hatası oluştu.", "error");
        }
      }
    );
  };

  // ====== BULK SİLME (URLS) ======
  const handleDeleteBulkUrls = () => {
    if (selectedUrls.length === 0) return;
    showConfirm(
      "Web Sitelerini Sil",
      `${selectedUrls.length} adet web sitesini kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/delete_urls/bulk`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: selectedUrls })
          });
          if (res.ok) {
            setUrls(prev => prev.filter(u => !selectedUrls.includes(u.url)));
            setSelectedUrls([]);
            showToast(`${selectedUrls.length} web sitesi başarıyla silindi.`, "success");
          } else {
            const err = await res.json();
            showToast("Hata: " + err.message, "error");
          }
        } catch (e) {
          console.error(e);
          showToast("Silme işlemi sırasında ağ hatası oluştu.", "error");
        }
      }
    );
  };

  // ====== DOKÜMAN YÜKLEME ======
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(Array.from(e.target.files));
    }
  };

  const handleFileUpload = async (selectedFiles: File[]) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(10);
    setDocStepIndex(0);

    const stepInterval = setInterval(() => {
      setDocStepIndex((prev) => {
        if (prev < docSteps.length - 1) {
          setUploadProgress((p) => Math.min(p + 18, 90));
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));

    try {
      const res = await fetch(`${API_BASE_URL}/upload_doc`, {
        method: "POST",
        body: formData,
      });

      clearInterval(stepInterval);
      setDocStepIndex(4);
      setUploadProgress(100);
      const data = await res.json();

      if (res.ok && data.status === "success") {
        await fetchDocs();
        setTimeout(() => showToast(`${selectedFiles.length} adet belge başarıyla hafızaya işlendi! 🚀`, "success"), 500);
      } else {
        throw new Error(data.message || "Sunucudan hata döndü.");
      }
    } catch (e: any) {
      clearInterval(stepInterval);
      showToast("Hata: " + (e.message || "Beklenmeyen bir sorun oluştu."), "error");
    } finally {
      setTimeout(() => { setIsUploading(false); setUploadProgress(0); setDocStepIndex(0); }, 1500);
    }
  };

  // ====== URL YÜKLEME ======
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsUrlUploading(true);
    setUrlUploadProgress(10);
    setUrlStepIndex(0);

    const currentUrlSteps = isDeepCrawl ? deepUrlSteps : urlSteps;
    const intervalTime = isDeepCrawl ? 8000 : 2000;

    const stepInterval = setInterval(() => {
      setUrlStepIndex((prev) => {
        if (prev < currentUrlSteps.length - 1) {
          setUrlUploadProgress((p) => Math.min(p + 18, 90));
          return prev + 1;
        }
        return prev;
      });
    }, intervalTime);

    try {
      const res = await fetch(`${API_BASE_URL}/upload_url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim(), is_deep_crawl: isDeepCrawl })
      });
      
      clearInterval(stepInterval);
      setUrlStepIndex(4);
      setUrlUploadProgress(100);
      const data = await res.json();
      
      if (res.ok && data.status === "success") {
        await fetchUrls();
        setUrlInput("");
        setTimeout(() => showToast(data.message || "Web sitesi başarıyla öğrenildi! 🚀", "success"), 500);
      } else {
        showToast("Hata: " + data.message, "error");
      }
    } catch (err) {
      clearInterval(stepInterval);
      showToast("Ağ hatası oluştu.", "error");
    } finally {
      setTimeout(() => { setIsUrlUploading(false); setUrlUploadProgress(0); setUrlStepIndex(0); }, 1500);
    }
  };

  // ====== PERFORMANCE METRICS ======
  const totalQuestions = logs.length;
  const avgResponseTime = totalQuestions > 0
    ? logs.reduce((acc, log) => acc + (log.metrikler_saniye?.cevap_yazma_hizi || 0), 0) / totalQuestions
    : 0;
  const avgSearchTime = totalQuestions > 0
    ? logs.reduce((acc, log) => acc + (log.metrikler_saniye?.belge_bulma || 0), 0) / totalQuestions
    : 0;

  const glassPanelClass = `backdrop-blur-xl border rounded-3xl p-6 transition-all duration-500 relative z-10 ${
    isDarkMode
      ? "bg-slate-900/40 border-white/10 shadow-lg"
      : "bg-white/70 border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
  }`;

  return (
    <main
      className={`min-h-screen p-6 md:p-10 overflow-x-hidden transition-colors duration-500 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-950 via-slate-900 to-[#2a000a] text-white"
          : "bg-[#f8f9fa] text-slate-800"
      }`}
    >
      <div className="max-w-[1400px] w-full mx-auto space-y-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
              isDarkMode ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" : "bg-white text-blue-600 border border-slate-100"
            }`}>
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">ESBAŞ Yönetici Paneli</h1>
              <p className={`text-sm mt-1 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Yapay zeka veri merkezini ve performans altyapısını yönetin.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-2xl backdrop-blur-md border transition-all duration-300 shadow-sm hover:scale-105 ${
              isDarkMode
                ? "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:shadow-md"
            }`}
            title={isDarkMode ? "Açık Temaya Geç" : "Koyu Temaya Geç"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-32">
            <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDarkMode ? "border-blue-400" : "border-blue-600"}`}></div>
          </div>
        ) : (
          <>
            {/* ── YAPAY ZEKA HAFIZASI (VERİ GİRİŞİ) ── */}
            <section className="space-y-6">
              <h2 className={`text-2xl font-bold tracking-tight px-1 transition-colors duration-500 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                Veri Öğretme Merkezi
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* SOL: Dosya Yükle */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center p-10 h-full min-h-[260px] rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
                    isDragging
                      ? "border-blue-500 bg-blue-500/5 scale-[1.02] shadow-[0_0_30px_rgba(0,122,255,0.15)]"
                      : isDarkMode
                      ? "bg-slate-900/40 border-white/20 hover:border-white/40"
                      : "bg-white/50 border-slate-300 hover:border-blue-400 hover:bg-white/80"
                  }`}
                >
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx"
                    multiple
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                    title="Dosyaları Seçin veya Sürükleyin"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center w-full max-w-sm space-y-6 z-20">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <UploadCloud className="w-6 h-6 text-blue-500" />
                        </div>
                      </div>
                      
                      <div className="w-full space-y-3 text-center">
                        <div className="h-6 relative flex justify-center items-center">
                          <AnimatePresence mode="wait">
                            <motion.p
                              key={docStepIndex}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              transition={{ duration: 0.3 }}
                              className={`absolute text-[13px] font-bold tracking-wider ${isDarkMode ? "text-white/90" : "text-slate-700"}`}
                            >
                              {docSteps[docStepIndex]}
                            </motion.p>
                          </AnimatePresence>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200/30">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#007AFF] via-[#AF52DE] to-[#FF2D55] transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center z-20 pointer-events-none">
                      <div className={`p-5 rounded-2xl mb-5 transition-all duration-300 shadow-sm ${
                        isDarkMode ? "bg-white/10 text-white/80" : "bg-white text-blue-600 border border-slate-100"
                      } ${isDragging ? "animate-bounce" : ""}`}>
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        Toplu Dosya Yükle
                      </h3>
                      <p className={`text-[13.5px] max-w-[280px] mx-auto leading-relaxed ${isDarkMode ? "text-white/50" : "text-slate-500"}`}>
                        Dosyaları sürükleyin veya seçmek için tıklayın (PDF, TXT, DOCX).
                      </p>
                    </div>
                  )}
                </div>

                {/* SAĞ: Web Sitesi Öğret */}
                <div className={`relative flex flex-col justify-center p-10 h-full min-h-[260px] rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isDarkMode
                      ? "bg-slate-900/40 border-white/10"
                      : "bg-white/60 border-slate-200 shadow-sm hover:shadow-md"
                  }`}>
                  <div className="flex flex-col items-center text-center z-20 w-full max-w-sm mx-auto">
                    {isUrlUploading ? (
                      <div className="flex flex-col items-center w-full max-w-sm space-y-6 z-20 mt-2">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Globe className="w-6 h-6 text-indigo-500" />
                          </div>
                        </div>
                        
                        <div className="w-full space-y-3 text-center">
                          <div className="h-6 relative flex justify-center items-center">
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={urlStepIndex}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.3 }}
                                className={`absolute text-[13px] font-bold tracking-wider ${isDarkMode ? "text-white/90" : "text-slate-700"} ${isDeepCrawl ? "text-[11.5px]" : ""}`}
                              >
                                {isDeepCrawl ? deepUrlSteps[urlStepIndex] : urlSteps[urlStepIndex]}
                              </motion.p>
                            </AnimatePresence>
                          </div>
                          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200/30">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-300 ease-out"
                              style={{ width: `${urlUploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`p-5 rounded-2xl mb-5 transition-all duration-300 shadow-sm ${
                            isDarkMode ? "bg-white/10 text-white/80" : "bg-white text-indigo-600 border border-slate-100"
                        }`}>
                          <LinkIcon className="w-8 h-8" />
                        </div>
                        <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                          Web Sitesi Öğret
                        </h3>
                        <p className={`text-[13.5px] max-w-[280px] mx-auto mb-6 leading-relaxed ${isDarkMode ? "text-white/50" : "text-slate-500"}`}>
                           Yapay zekanın okumasını istediğiniz açık bir URL girin.
                        </p>

                        <form onSubmit={handleUrlSubmit} className="w-full flex flex-col gap-3">
                          <input 
                            type="url" 
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder="https://ornek.com"
                            required
                            className={`w-full px-5 py-3.5 rounded-xl border font-medium outline-none transition-all ${
                              isDarkMode 
                                ? "bg-slate-800/80 border-white/10 text-white placeholder-white/30 focus:border-indigo-400/50" 
                                : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                            }`}
                          />
                          <button 
                            type="submit" 
                            disabled={!urlInput.trim()}
                            className={`w-full px-5 py-3.5 rounded-xl font-bold tracking-wide transition-all shadow-md ${
                              !urlInput.trim() 
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                                : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg hover:-translate-y-0.5"
                            }`}
                          >
                            Öğretmeye Başla
                          </button>
                          
                          <div className="flex items-center gap-2 mt-2 ml-1">
                            <input 
                                type="checkbox" 
                                id="deep-crawl" 
                                checked={isDeepCrawl}
                                onChange={(e) => setIsDeepCrawl(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="deep-crawl" className={`text-xs tracking-wide font-semibold cursor-pointer select-none ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
                                Derin Tarama (Tüm alt sayfaları otomatik bul)
                            </label>
                          </div>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* ── YÖNETİM TABLOLARI ── */}
            <section className="space-y-6 pt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* SOL TABLO: Belgeler */}
                <div className={`${glassPanelClass} flex flex-col`}>
                  <div className="flex items-center justify-between mb-5 px-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600"}`}>
                        <Database className="w-5 h-5" />
                      </div>
                      <h3 className={`text-lg font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        Sistem Hafızası (Belgeler)
                      </h3>
                    </div>
                    {selectedDocs.length > 0 && (
                      <button
                        onClick={handleDeleteBulkDocs}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500 text-white shadow-md hover:bg-red-600 transition-all hover:-translate-y-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Sil ({selectedDocs.length})
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-x-auto w-full border border-slate-200/50 dark:border-white/5 rounded-2xl custom-scrollbar max-h-[340px]">
                    <table className="w-full text-left text-[13.5px] whitespace-nowrap min-w-max">
                      <thead className="sticky top-0 z-10">
                        <tr className={`border-b tracking-wide font-medium backdrop-blur-md ${isDarkMode ? "text-slate-400 border-white/10 bg-slate-900/90" : "text-slate-500 border-slate-200/80 bg-white/90"}`}>
                          <th className="px-4 py-3.5 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={docs.length > 0 && selectedDocs.length === docs.length}
                              onChange={(e) => setSelectedDocs(e.target.checked ? docs.map(d => d.name) : [])}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3.5">Dosya Adı</th>
                          <th className="px-4 py-3.5 w-24">Tür</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.length > 0 ? (
                          docs.map((doc, idx) => (
                            <tr
                              key={idx}
                              className={`border-b last:border-0 transition-colors duration-200 group ${
                                selectedDocs.includes(doc.name)
                                  ? isDarkMode ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50/60 border-blue-200"
                                  : isDarkMode ? "border-white/5 hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-4 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedDocs.includes(doc.name)}
                                  onChange={() => setSelectedDocs(prev => prev.includes(doc.name) ? prev.filter(n => n !== doc.name) : [...prev, doc.name])}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3.5 min-w-[200px] max-w-[280px]">
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded-lg ${isDarkMode ? "bg-red-500/20 text-red-400" : "bg-red-50 text-red-500 border border-red-100"}`}>
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <span className={`truncate font-semibold text-[13px] ${isDarkMode ? "text-slate-200" : "text-slate-700"}`} title={doc.name}>
                                    {doc.name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                  isDarkMode ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-500 border border-slate-200"
                                }`}>
                                  {(doc.type || doc.name.split('.').pop() || "BELGE").toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className={`py-12 text-center ${isDarkMode ? "text-white/30" : "text-slate-400"}`}>
                              <AlertCircle className="w-8 h-8 mb-3 opacity-40 mx-auto" />
                              <p className="text-sm font-medium">Hafıza Boş</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SAĞ TABLO: Web Siteleri */}
                <div className={`${glassPanelClass} flex flex-col`}>
                  <div className="flex items-center justify-between mb-5 px-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <h3 className={`text-lg font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                        Sistem Hafızası (URL'ler)
                      </h3>
                    </div>
                    {selectedUrls.length > 0 && (
                      <button
                        onClick={handleDeleteBulkUrls}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500 text-white shadow-md hover:bg-red-600 transition-all hover:-translate-y-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Sil ({selectedUrls.length})
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-x-auto w-full border border-slate-200/50 dark:border-white/5 rounded-2xl custom-scrollbar max-h-[340px]">
                    <table className="w-full text-left text-[13.5px] whitespace-nowrap min-w-max">
                      <thead className="sticky top-0 z-10">
                        <tr className={`border-b tracking-wide font-medium backdrop-blur-md ${isDarkMode ? "text-slate-400 border-white/10 bg-slate-900/90" : "text-slate-500 border-slate-200/80 bg-white/90"}`}>
                          <th className="px-4 py-3.5 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={urls.length > 0 && selectedUrls.length === urls.length}
                              onChange={(e) => setSelectedUrls(e.target.checked ? urls.map(u => u.url) : [])}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3.5">URL Adresi</th>
                          <th className="px-4 py-3.5 w-24 text-center">Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {urls.length > 0 ? (
                          urls.map((u, idx) => (
                            <tr
                              key={idx}
                              className={`border-b last:border-0 transition-colors duration-200 group ${
                                selectedUrls.includes(u.url)
                                  ? isDarkMode ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50/60 border-indigo-200"
                                  : isDarkMode ? "border-white/5 hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"
                              }`}
                            >
                              <td className="px-4 py-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedUrls.includes(u.url)}
                                  onChange={() => setSelectedUrls(prev => prev.includes(u.url) ? prev.filter(n => n !== u.url) : [...prev, u.url])}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="px-4 py-3.5 min-w-[200px] max-w-[280px]">
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded-lg ${isDarkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>
                                    <LinkIcon className="w-4 h-4" />
                                  </div>
                                  <a href={u.url} target="_blank" rel="noopener noreferrer" className={`truncate font-semibold text-[13px] hover:underline transition-colors ${
                                    isDarkMode ? "text-slate-200 hover:text-blue-400" : "text-slate-700 hover:text-blue-600"
                                  }`} title={u.url}>
                                    {u.url.replace("https://", "").replace("http://", "")}
                                  </a>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <CheckCircle2 className={`w-4 h-4 mx-auto ${isDarkMode ? "text-green-400/80" : "text-green-500"}`} />
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className={`py-12 text-center ${isDarkMode ? "text-white/30" : "text-slate-400"}`}>
                              <AlertCircle className="w-8 h-8 mb-3 opacity-40 mx-auto" />
                              <p className="text-sm font-medium">Burası Boş</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* ── PERFORMANS İZLEME ── */}
            <section className="space-y-6 pt-10">
              <h2 className={`text-2xl font-bold tracking-tight px-1 transition-colors duration-500 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                Sistem Performansı
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`${glassPanelClass} group hover:-translate-y-1`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Database className={`w-5 h-5 transition-transform group-hover:scale-110 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                    <h3 className={`text-xs font-bold tracking-widest ${isDarkMode ? "text-white/50" : "text-slate-500"}`}>TOPLAM SORU</h3>
                  </div>
                  <p className="text-5xl font-light tracking-tight">{totalQuestions}</p>
                </div>

                <div className={`${glassPanelClass} group hover:-translate-y-1`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className={`w-5 h-5 transition-transform group-hover:scale-110 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
                    <h3 className={`text-xs font-bold tracking-widest ${isDarkMode ? "text-white/50" : "text-slate-500"}`}>ORTALAMA YANIT SÜRESİ</h3>
                  </div>
                  <p className="text-5xl font-light tracking-tight flex items-baseline gap-1.5">
                    {avgResponseTime.toFixed(2)}
                    <span className={`text-base font-medium ${isDarkMode ? "text-white/40" : "text-slate-400"}`}>sn</span>
                  </p>
                </div>

                <div className={`${glassPanelClass} group hover:-translate-y-1`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className={`w-5 h-5 transition-transform group-hover:scale-110 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                    <h3 className={`text-xs font-bold tracking-widest ${isDarkMode ? "text-white/50" : "text-slate-500"}`}>ORTALAMA ARAMA SÜRESİ</h3>
                  </div>
                  <p className="text-5xl font-light tracking-tight flex items-baseline gap-1.5">
                    {avgSearchTime.toFixed(2)}
                    <span className={`text-base font-medium ${isDarkMode ? "text-white/40" : "text-slate-400"}`}>sn</span>
                  </p>
                </div>
              </div>

              {/* LOG TABLOSU */}
              <div className={`${glassPanelClass} mt-8 overflow-hidden w-full !p-0`}>
                <div className={`flex items-center justify-between p-6 border-b ${isDarkMode ? "border-white/5 bg-slate-900/50" : "border-slate-100 bg-white/50"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                      <List className="w-5 h-5" />
                    </div>
                    <h3 className={`text-lg font-bold tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>Son İşlemler</h3>
                  </div>
                  {logs.length > 0 && (
                    <button
                      onClick={handleDeleteAll}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Tümünü Temizle
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-[13px] whitespace-nowrap min-w-max">
                    <thead className={isDarkMode ? "bg-slate-900/40 text-slate-400" : "bg-slate-50/80 text-slate-500"}>
                      <tr className="border-b border-transparent">
                        <th className="px-5 py-4 font-semibold">Tarih</th>
                        <th className="px-5 py-4 font-semibold">Soru</th>
                        <th className="px-5 py-4 font-semibold text-right">Anlama</th>
                        <th className="px-5 py-4 font-semibold text-right">Arama</th>
                        <th className="px-5 py-4 font-semibold text-right">LLM (Hız)</th>
                        <th className="px-5 py-4 font-semibold text-right">Toplam</th>
                        <th className="px-5 py-4 font-semibold text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length > 0 ? (
                        logs.slice(0, 50).reverse().map((log, idx) => (
                          <tr
                            key={idx}
                            className={`border-b transition-colors duration-200 ${
                              isDarkMode ? "border-white/5 hover:bg-white/[0.03]" : "border-slate-100 hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-5 py-4 font-mono text-xs opacity-70">
                              {new Date(log.tarih).toLocaleString("tr-TR")}
                            </td>
                            <td className="px-5 py-4 max-w-[280px] truncate font-semibold" title={log.soru}>
                              {log.soru}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-xs opacity-70">
                              {(log.metrikler_saniye?.soruyu_anlama || 0).toFixed(2)}s
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-xs opacity-70">
                              {(log.metrikler_saniye?.belge_bulma || 0).toFixed(2)}s
                            </td>
                            <td className={`px-5 py-4 text-right font-mono text-xs font-bold ${isDarkMode ? "text-red-400" : "text-red-500"}`}>
                              {(log.metrikler_saniye?.cevap_yazma_hizi || 0).toFixed(2)}s
                            </td>
                            <td className={`px-5 py-4 text-right font-mono text-xs font-bold ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                              {(log.metrikler_saniye?.toplam_islem || 0).toFixed(2)}s
                            </td>
                            <td className="px-5 py-4 text-center">
                              <button
                                onClick={() => handleDeleteSingle(log.tarih)}
                                className={`p-2 rounded-lg transition-all ${
                                  isDarkMode ? "text-white/30 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-10 text-center opacity-50">Log bulunamadı.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}