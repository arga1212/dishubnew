import React, { useState, useCallback, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import Cropper from 'react-easy-crop';
import { Camera, Upload, RotateCcw, FileCheck, Loader2, CheckCircle2, X, SwitchCamera } from 'lucide-react';
import { getCroppedImg } from './utils/imageHelpers';
import { PdfDocument } from './components/PdfDocument';

// GANTI DENGAN URL WEB APP GAS ANDA
const GAS_URL = "https://script.google.com/macros/s/AKfycbzE9tGyPMkDNRBhkall_ldKAX6BsqX9d_NiNIz3YAdatOcu4RYTzrxV1WGQVXkRIaPt/exec";

export default function App() {
  const [nama, setNama] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedImage, setCroppedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const onCropComplete = useCallback(async (_, pixelCrop) => {
    if (image) {
      const cropped = await getCroppedImg(image, pixelCrop);
      setCroppedImage(cropped);
    }
  }, [image]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) setImage(URL.createObjectURL(file));
  };

  const startWebcam = async (mode = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode } 
      });
      streamRef.current = stream;
      setShowWebcam(true);
      setFacingMode(mode);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert("Akses kamera ditolak atau tidak tersedia di perangkat ini.");
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    startWebcam(newMode);
  };

  const captureWebcam = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setImage(canvas.toDataURL('image/jpeg'));
      stopWebcam();
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowWebcam(false);
  };

  const handleGenerate = async () => {
    if (!nama || !croppedImage) return;
    setLoading(true);
    try {
      const blob = await pdf(<PdfDocument name={nama} photo={croppedImage} />).toBlob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        await fetch(GAS_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({ nama, lokasi, pdfBase64: base64data })
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${nama.replace(/\s+/g, '_')}.pdf`;
        link.click();
        setLoading(false);
        setSukses(true);
      };
    } catch (err) {
      setLoading(false);
      alert('Gagal generate PDF. Coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* INPUT PANEL */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl space-y-8 border border-slate-200">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="w-12 h-12 bg-[#1e3a8a] rounded-2xl flex items-center justify-center text-white">
              <FileCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-none uppercase">Dishub Surabaya</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Card Generator v2.5</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => fileInputRef.current.click()} className="flex flex-col items-center p-6 border-2 border-dashed border-slate-200 rounded-[1.5rem] hover:bg-blue-50 transition-all group">
              <Upload className="text-blue-600 mb-2 group-hover:scale-110 transition" />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Upload Foto</span>
              <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*" />
            </button>
            <button onClick={startWebcam} className="flex flex-col items-center p-6 border-2 border-slate-100 rounded-[1.5rem] hover:bg-orange-50 transition-all group">
              <Camera className="text-orange-500 mb-2 group-hover:scale-110 transition" />
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Ambil Kamera</span>
            </button>
          </div>

          {image && (
            <div className="space-y-4">
              <div className="relative h-80 bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl border-4 border-white">
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={13 / 13.5}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zoom</span>
                <input 
                  type="range" min={1} max={3} step={0.01} value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
                />
              </div>
            </div>
          )}

          <div className="grid gap-6">
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Petugas (Max 15)</label>
              <input 
                type="text" maxLength={15} value={nama}
                onChange={(e) => setNama(e.target.value.toUpperCase())}
                className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-[#1e3a8a] focus:bg-white transition-all rounded-2xl mt-2 font-black text-xl text-blue-950 uppercase"
                placeholder="CONTOH: PAK EKO"
              />
              <div className={`absolute right-5 bottom-5 text-[10px] font-black ${nama.length >= 15 ? 'text-red-500' : 'text-slate-300'}`}>
                {nama.length}/15
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lokasi Tugas</label>
              <input 
                type="text" value={lokasi}
                onChange={(e) => setLokasi(e.target.value.toUpperCase())}
                className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-[#1e3a8a] focus:bg-white transition-all rounded-2xl mt-2 font-bold text-slate-700 uppercase"
                placeholder="CONTOH: TAMAN BUNGKUL"
              />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button 
              disabled={loading || !nama || !croppedImage}
              onClick={handleGenerate}
              className="w-full bg-[#1e3a8a] text-white py-6 rounded-[1.5rem] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-blue-950 hover:-translate-y-1 transition-all disabled:opacity-20 disabled:translate-y-0"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Buat & Unduh PDF"}
            </button>
            <button onClick={() => window.location.reload()} className="w-full text-slate-400 py-2 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
              <RotateCcw size={12} /> Reset Form
            </button>
          </div>
        </div>

        {/* PREVIEW PANEL */}
        <div className="flex flex-col items-center sticky top-10">
          <div className="bg-emerald-500 text-white px-6 py-1 rounded-full text-[10px] font-black uppercase mb-8 shadow-lg tracking-widest">Live Preview</div>
          
          <div 
            className="bg-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] flex flex-col items-center relative overflow-hidden border border-black"
            style={{ width: '14cm', height: '17cm', transform: 'scale(0.8)', transformOrigin: 'top center' }}
          >
            <div className="w-[13cm] h-[13.5cm] bg-slate-50 mt-[0.5cm] overflow-hidden">
              {croppedImage && <img src={croppedImage} className="w-full h-full object-cover" />}
            </div>
            <div className="mt-8 px-8 w-full text-center">
              <h2 className="text-[36px] font-black text-[#1e3a8a] leading-[0.9] uppercase" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>
                {nama || "NAMA PETUGAS"}
              </h2>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-300 mt-[-2cm] uppercase tracking-widest">Ukuran: 14cm x 17cm</p>
        </div>
      </div>

      {/* MODAL SUKSES */}
      {sukses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 flex flex-col items-center gap-4 shadow-2xl max-w-xs w-full text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wide">Berhasil!</h2>
            <p className="text-slate-400 text-sm font-medium">PDF <span className="font-black text-slate-700">{nama}</span> berhasil diunduh & disimpan ke cloud.</p>
            <button
              onClick={() => { setSukses(false); window.location.reload(); }}
              className="mt-2 w-full bg-[#1e3a8a] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-950 transition"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* MODAL WEBCAM */}
      {showWebcam && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-[2rem] w-full max-w-lg relative shadow-2xl">
            <button onClick={stopWebcam} className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg z-10">
              <X size={24} />
            </button>
            <button onClick={toggleCamera} className="absolute -top-4 -left-4 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition shadow-lg z-10">
              <SwitchCamera size={24} />
            </button>
            <div className="text-center mb-3 mt-2">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Kalibrasi Kamera</h3>
              <p className="text-[10px] font-bold text-slate-400">Posisikan wajah di dalam kotak</p>
            </div>
            
            <div 
              className="rounded-[1.5rem] overflow-hidden bg-black relative flex items-center justify-center mx-auto"
              style={{ aspectRatio: '13/13.5', width: '100%', maxWidth: '350px' }}
            >
              {/* Webcam Video */}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${facingMode === 'user' ? '-scale-x-100' : ''}`} 
              />
              
              {/* Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none border-[3px] border-white/50 border-dashed rounded-[1.5rem] z-10 m-4 flex flex-col items-center justify-center">
                 {/* Optional crosshair or frame inner guide */}
                 <div className="w-3/4 h-3/4 border border-white/30 rounded-full" style={{ aspectRatio: '1/1' }}></div>
              </div>
            </div>
            
            <button onClick={captureWebcam} className="mt-5 w-full bg-orange-500 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-orange-600 transition flex items-center justify-center gap-2">
              <Camera size={20} /> Ambil Foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}