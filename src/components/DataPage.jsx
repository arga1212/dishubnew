import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileDown, RefreshCw, AlertCircle, MapPin } from 'lucide-react';

export const DataPage = ({ apiBaseUrl, apiAuthToken }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeDownloadId, setActiveDownloadId] = useState('');
  const [csvDownloading, setCsvDownloading] = useState(false);

  const canCallApi = useMemo(() => Boolean(apiAuthToken), [apiAuthToken]);

  const fetchData = useCallback(async () => {
    if (!canCallApi) {
      setErrorMessage('VITE_API_AUTH_TOKEN belum di-set pada .env');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/submissions`, {
        headers: {
          Authorization: `Bearer ${apiAuthToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil data submissions');
      }

      const payload = await response.json();
      setItems(Array.isArray(payload.data) ? payload.data : []);
    } catch {
      setErrorMessage('Tidak bisa memuat data. Pastikan server aktif dan token benar.');
    } finally {
      setLoading(false);
    }
  }, [apiAuthToken, apiBaseUrl, canCallApi]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchData]);

  const handleReprint = async (id, nama) => {
    if (!canCallApi) {
      alert('VITE_API_AUTH_TOKEN belum di-set pada .env');
      return;
    }

    setActiveDownloadId(id);
    try {
      const response = await fetch(`${apiBaseUrl}/api/submissions/${id}/pdf`, {
        headers: {
          Authorization: `Bearer ${apiAuthToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('File PDF tidak dapat diambil');
      }

      const blob = await response.blob();
      const downloadName = `${String(nama || 'petugas').replace(/\s+/g, '_')}_reprint.pdf`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadName;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal cetak ulang PDF. Coba lagi.');
    } finally {
      setActiveDownloadId('');
    }
  };

  const resolveFileUrl = (value) => {
    if (!value) {
      return '';
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return `${apiBaseUrl.replace(/\/$/, '')}/uploads/${value}`;
  };

  const handleDownloadCsv = async () => {
    if (!canCallApi) {
      alert('VITE_API_AUTH_TOKEN belum di-set pada .env');
      return;
    }

    setCsvDownloading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/submissions/csv`, {
        headers: {
          Authorization: `Bearer ${apiAuthToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('File CSV tidak dapat diambil');
      }

      const blob = await response.blob();
      const datePart = new Date().toISOString().slice(0, 10);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `submissions_${datePart}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Gagal download CSV. Coba lagi.');
    } finally {
      setCsvDownloading(false);
    }
  };

  const hasCoordinates = (item) => item.latitude && item.longitude;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10 text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-md border border-slate-200 shadow-xl p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-black uppercase">Data Jukir</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/"
                className="inline-flex items-center gap-2 bg-slate-200 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-300 transition"
              >
                <ArrowLeft size={16} /> Halaman Form
              </a>
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 bg-blue-900 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-950 transition"
              >
                <RefreshCw size={16} /> Update
              </button>
              <button
                onClick={handleDownloadCsv}
                disabled={csvDownloading}
                className="inline-flex items-center gap-2 bg-emerald-700 text-white px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-800 transition disabled:opacity-50"
              >
                <FileDown size={16} /> {csvDownloading ? 'Memproses' : 'Download CSV'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md border border-slate-200 shadow-xl overflow-hidden">
          {loading && (
            <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat data...</div>
          )}

          {!loading && errorMessage && (
            <div className="p-8 flex items-center justify-center gap-2 text-red-600 bg-red-50">
              <AlertCircle size={18} />
              <span className="font-bold text-sm">{errorMessage}</span>
            </div>
          )}

          {!loading && !errorMessage && items.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada data tersimpan.</div>
          )}

          {!loading && !errorMessage && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px]">
                <thead className="bg-slate-900 text-white text-xs uppercase tracking-widest">
                  <tr>
                    <th className="text-left px-4 py-3">Nama</th>
                    <th className="text-left px-4 py-3">Lokasi</th>
                    <th className="text-left px-4 py-3">Alamat</th>
                    <th className="text-left px-4 py-3">Koordinat</th>
                    <th className="text-left px-4 py-3">File Petugas</th>
                    <th className="text-left px-4 py-3">File Rambu</th>
                    <th className="text-left px-4 py-3">File KTA</th>
                    <th className="text-left px-4 py-3">Waktu Simpan</th>
                    <th className="text-left px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="px-4 py-4 font-black text-blue-900">{item.nama}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{item.lokasi_parkir}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{item.alamat_parkir}</td>
                      <td className="px-4 py-4">
                        {hasCoordinates(item) ? (
                          <div className="space-y-2">
                            <div className="text-xs font-black text-slate-700">
                              {Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}
                            </div>
                            {item.location_accuracy && (
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Akurasi ±{Math.round(Number(item.location_accuracy))} m
                              </div>
                            )}
                            <a
                              href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-emerald-100 transition"
                            >
                              <MapPin size={14} /> Maps
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {item.foto_petugas_filename ? (
                          <a
                            href={resolveFileUrl(item.foto_petugas_filename)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-indigo-100 transition"
                          >
                            Lihat
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {item.foto_rambu_filename ? (
                          <a
                            href={resolveFileUrl(item.foto_rambu_filename)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-indigo-100 transition"
                          >
                            Lihat
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {item.foto_kta_filename ? (
                          <a
                            href={resolveFileUrl(item.foto_kta_filename)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-indigo-100 transition"
                          >
                            Lihat
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-400">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleReprint(item.id, item.nama)}
                          disabled={activeDownloadId === item.id}
                          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          {activeDownloadId === item.id ? 'Memproses' : 'Cetak Ulang'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
