import React, { useState, useCallback, useRef } from 'react';
import { pdf } from '@react-pdf/renderer';
import Cropper from 'react-easy-crop';
import { Camera, Upload, RotateCcw, FileCheck, Loader2, CheckCircle2, X, SwitchCamera, Image as ImageIcon } from 'lucide-react';
import { getCroppedImg } from './utils/imageHelpers';
import { PdfDocument } from './components/PdfDocument';

// GANTI DENGAN URL WEB APP GAS ANDA
const GAS_URL = "https://script.google.com/macros/s/AKfycbzE9tGyPMkDNRBhkall_ldKAX6BsqX9d_NiNIz3YAdatOcu4RYTzrxV1WGQVXkRIaPt/exec";
export default function App() {
  const [nama, setNama] = useState('');
  const [lokasiParkir, setLokasiParkir] = useState('');
  const [alamatParkir, setAlamatParkir] = useState('');
  
  const [image, setImage] = useState(null); // Foto Petugas
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedImage, setCroppedImage] = useState(null);
  
  const [fotoRambu, setFotoRambu] = useState(null);
  const [fotoKTA, setFotoKTA] = useState(null);

  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  
  const [activeWebcamType, setActiveWebcamType] = useState(null); // 'petugas', 'rambu', 'kta'
  const [facingMode, setFacingMode] = useState("environment");

  const fileInputPetugasRef = useRef(null);
  const fileInputRambuRef = useRef(null);
  const fileInputKTARef = useRef(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const onCropComplete = useCallback(async (_, pixelCrop) => {
    if (image) {
      const cropped = await getCroppedImg(image, pixelCrop);
      setCroppedImage(cropped);
    }
  }, [image]);

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Compress and read to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        if (type === 'petugas') setImage(dataUrl);
        else if (type === 'rambu') setFotoRambu(dataUrl);
        else if (type === 'kta') setFotoKTA(dataUrl);
      };
    };
  };

  const startWebcam = async (type, mode = facingMode) => {
    const finalMode = typeof mode === 'string' ? mode : facingMode;
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { exact: finalMode } } 
        });
      } catch (fallbackErr) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }

      streamRef.current = stream;
      setActiveWebcamType(type);
      setFacingMode(finalMode);
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
    startWebcam(activeWebcamType, newMode);
  };

  const captureWebcam = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      if (activeWebcamType === 'petugas') setImage(dataUrl);
      else if (activeWebcamType === 'rambu') setFotoRambu(dataUrl);
      else if (activeWebcamType === 'kta') setFotoKTA(dataUrl);
      
      stopWebcam();
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setActiveWebcamType(null);
  };

  const handleGenerate = async () => {
    if (!nama || !croppedImage || !lokasiParkir || !alamatParkir || !fotoRambu || !fotoKTA) {
      alert("Mohon lengkapi semua data wajib (Nama, Lokasi, Alamat, Foto Petugas, Foto Rambu, dan KTA Jukir)!");
      return;
    }
    setLoading(true);
    try {
      const blob = await pdf(<PdfDocument name={nama} photo={croppedImage} />).toBlob();
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        const petugasBase64 = croppedImage.split(',')[1];
        const rambuBase64 = fotoRambu.split(',')[1];
        const ktaBase64 = fotoKTA ? fotoKTA.split(',')[1] : null;

        await fetch(GAS_URL, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({ 
            nama, 
            lokasiParkir, 
            alamatParkir, 
            pdfBase64: base64data,
            fotoPetugasBase64: petugasBase64,
            fotoRambuBase64: rambuBase64,
            fotoKTABase64: ktaBase64
          })
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${nama.replace(/\s+/g, '_')}_ID.pdf`;
        link.click();
        setLoading(false);
        setSukses(true);
      };
    } catch (err) {
      setLoading(false);
      alert('Gagal generate PDF. Coba lagi.');
    }
  };

  const renderPhotoSection = (title, type, ref, stateImg, isRequired) => (
    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <div className="flex justify-between items-center mb-3">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title} {isRequired && <span className="text-red-500">*</span>}</label>
        {stateImg && <CheckCircle2 className="text-emerald-500" size={16} />}
      </div>
      
      {!stateImg ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => ref.current.click()} className="flex flex-col items-center p-3 border-2 border-dashed border-slate-200 rounded-xl hover:bg-blue-50 transition-all group">
            <Upload className="text-blue-600 mb-1 w-5 h-5 group-hover:scale-110 transition" />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Upload</span>
            <input type="file" ref={ref} hidden onChange={(e) => handleFileUpload(e, type)} accept="image/*" />
          </button>
          <button onClick={() => startWebcam(type)} className="flex flex-col items-center p-3 border-2 border-slate-200 rounded-xl hover:bg-orange-50 transition-all group">
            <Camera className="text-orange-500 mb-1 w-5 h-5 group-hover:scale-110 transition" />
            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Kamera</span>
          </button>
        </div>
      ) : (
        <div className="relative group rounded-xl overflow-hidden h-24 bg-slate-900 flex items-center justify-center">
          <img src={stateImg} className="w-full h-full object-cover opacity-80" alt={title} />
          <button 
            onClick={() => {
              if(type === 'petugas') { setImage(null); setCroppedImage(null); }
              else if(type === 'rambu') setFotoRambu(null);
              else if(type === 'kta') setFotoKTA(null);
            }} 
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white text-[10px] font-bold uppercase tracking-widest"
          >
            <RotateCcw size={14} /> Ganti Foto
          </button>
        </div>
      )}
    </div>
  );

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderPhotoSection("1. Foto Petugas (Wajib)", "petugas", fileInputPetugasRef, image, true)}
            {renderPhotoSection("2. Rambu Digital (Wajib)", "rambu", fileInputRambuRef, fotoRambu, true)}
          </div>
          <div className="w-full">
            {renderPhotoSection("3. KTA Jukir (Wajib)", "kta", fileInputKTARef, fotoKTA, true)}
          </div>

          {image && (
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sesuaikan Crop Foto Petugas</label>
              <div className="relative h-64 bg-slate-900 rounded-[2rem] overflow-hidden shadow-xl border-4 border-slate-100">
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
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl">
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Petugas (Max 15) <span className="text-red-500">*</span></label>
              <input 
                type="text" maxLength={15} value={nama}
                onChange={(e) => setNama(e.target.value.toUpperCase())}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-[#1e3a8a] focus:bg-white transition-all rounded-2xl mt-1 font-black text-lg text-blue-950 uppercase"
                placeholder="CONTOH: EKO SUSILO"
              />
              <div className={`absolute right-4 bottom-4 text-[10px] font-black ${nama.length >= 15 ? 'text-red-500' : 'text-slate-300'}`}>
                {nama.length}/15
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lokasi Parkir (di depan persis apa) <span className="text-red-500">*</span></label>
              <input 
                type="text" value={lokasiParkir}
                onChange={(e) => setLokasiParkir(e.target.value.toUpperCase())}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-[#1e3a8a] focus:bg-white transition-all rounded-2xl mt-1 font-bold text-slate-700 uppercase"
                placeholder="CONTOH: DEPAN ALFAMART A YANI"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Lokasi Sesuai Rambu <span className="text-red-500">*</span></label>
              <input 
                type="text" value={alamatParkir}
                onChange={(e) => setAlamatParkir(e.target.value.toUpperCase())}
                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-[#1e3a8a] focus:bg-white transition-all rounded-2xl mt-1 font-bold text-slate-700 uppercase"
                placeholder="CONTOH: JL. A. YANI NO 10"
              />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <button 
              disabled={loading || !nama || !croppedImage || !lokasiParkir || !alamatParkir || !fotoRambu || !fotoKTA}
              onClick={handleGenerate}
              className="w-full bg-[#1e3a8a] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-950 hover:-translate-y-1 transition-all disabled:opacity-20 disabled:translate-y-0"
            >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : "Buat & Simpan"}
            </button>
            <button onClick={() => window.location.reload()} className="w-full text-slate-400 py-2 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
              <RotateCcw size={12} /> Reset Form
            </button>
          </div>
        </div>

        {/* PREVIEW PANEL */}
        <div className="flex flex-col items-center sticky top-10 h-fit">
          <div className="bg-emerald-500 text-white px-6 py-1 rounded-full text-[10px] font-black uppercase mb-8 shadow-lg tracking-widest">Live Preview PDF</div>
          
          <div 
            className="bg-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] flex flex-col items-center relative overflow-hidden border border-black"
            style={{ width: '14cm', height: '17cm', transform: 'scale(0.8)', transformOrigin: 'top center' }}
          >
            <div className="w-[13cm] h-[13.5cm] bg-slate-50 mt-[0.5cm] overflow-hidden">
              {croppedImage ? (
                <img src={croppedImage} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ImageIcon size={64} />
                </div>
              )}
            </div>
            <div className="mt-8 px-8 w-full text-center">
              <h2 className="text-[36px] font-black text-[#1e3a8a] leading-[0.9] uppercase" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>
                {nama || "NAMA PETUGAS"}
              </h2>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-300 mt-[-2cm] uppercase tracking-widest">Ukuran PDF: 14cm x 17cm</p>
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
            <p className="text-slate-500 text-sm font-medium">Data <span className="font-black text-slate-700">{nama}</span> beserta foto telah disimpan ke cloud.</p>
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
      {activeWebcamType && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-[2rem] w-full max-w-lg relative shadow-2xl">
            <button onClick={stopWebcam} className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg z-10">
              <X size={24} />
            </button>
            <button onClick={toggleCamera} className="absolute -top-4 -left-4 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition shadow-lg z-10">
              <SwitchCamera size={24} />
            </button>
            <div className="text-center mb-3 mt-2">
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">
                Kalibrasi Kamera ({activeWebcamType === 'petugas' ? 'Petugas' : activeWebcamType === 'rambu' ? 'Rambu Digital' : 'KTA Jukir'})
              </h3>
              <p className="text-[10px] font-bold text-slate-400">Posisikan objek dengan jelas</p>
            </div>
            
            <div 
              className="rounded-[1.5rem] overflow-hidden bg-black relative flex items-center justify-center mx-auto"
              style={{ aspectRatio: activeWebcamType === 'petugas' ? '13/13.5' : '3/4', width: '100%', maxWidth: '350px' }}
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
                 {activeWebcamType === 'petugas' && (
                    <div className="w-3/4 h-3/4 border border-white/30 rounded-full" style={{ aspectRatio: '1/1' }}></div>
                 )}
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