import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeDatabase, insertSubmission, getSubmissions, getSubmissionById, getCsvPath } from './db.js';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
dotenv.config({ path: path.join(projectRoot, '.env') });

const app = express();
const port = Number(process.env.PORT || 8787);
const apiAuthToken = process.env.API_AUTH_TOKEN;
const uploadsDir = path.resolve(process.cwd(), 'server', 'uploads');
const publicApiBaseUrl = (process.env.PUBLIC_API_BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');

if (!apiAuthToken) {
  throw new Error('API_AUTH_TOKEN belum di-set pada environment server');
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin Error : Not Allowed'));
    },
    methods: ['POST', 'GET'],
  })
);
app.use(express.json({ limit: '35mb' }));
app.use('/uploads', express.static(uploadsDir));

const requireBearerAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const incomingToken = authHeader.slice(7).trim();
  if (!incomingToken || incomingToken !== apiAuthToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return next();
};

initializeDatabase();

const decodeBase64ToBuffer = (value) => {
  if (!value || typeof value !== 'string') {
    throw new Error('Payload base64 tidak valid');
  }

  const stripped = value.includes(',') ? value.split(',')[1] : value;
  return Buffer.from(stripped, 'base64');
};

const writeFileWithUuid = (buffer, extension) => {
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer, { mode: 0o600 });
  return fileName;
};

app.get('/api/health', (_, res) => {
  res.status(200).json({ ok: true });
});

app.get('/api/submissions', requireBearerAuth, (_, res) => {
  try {
    const submissions = getSubmissions();
    return res.status(200).json({ data: submissions });
  } catch (error) {
    console.error('Gagal membaca data submissions:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

app.get('/api/submissions/csv', requireBearerAuth, (_, res) => {
  try {
    const csvPath = getCsvPath();

    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ message: 'File CSV tidak ditemukan' });
    }

    const csvFileName = path.basename(csvPath);
    return res.download(csvPath, csvFileName);
  } catch (error) {
    console.error('Gagal download CSV submissions:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

app.get('/api/submissions/:id/pdf', requireBearerAuth, (req, res) => {
  try {
    const submission = getSubmissionById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const safePdfName = path.basename(submission.pdf_filename);
    const pdfPath = path.join(uploadsDir, safePdfName);

    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: 'File PDF tidak ditemukan' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    return res.sendFile(pdfPath);
  } catch (error) {
    console.error('Gagal mengambil PDF submission:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

app.post('/api/submissions', requireBearerAuth, async (req, res) => {
  try {
    const {
      nama,
      lokasiParkir,
      alamatParkir,
      latitude,
      longitude,
      locationAccuracy,
      locationCapturedAt,
      pdfBase64,
      fotoPetugasBase64,
      fotoRambuBase64,
      fotoKTABase64,
    } = req.body;

    if (
      !nama ||
      !lokasiParkir ||
      !alamatParkir ||
      latitude === undefined ||
      latitude === null ||
      latitude === '' ||
      longitude === undefined ||
      longitude === null ||
      longitude === '' ||
      !pdfBase64 ||
      !fotoPetugasBase64
    ) {
      return res.status(400).json({ message: 'Field wajib diisi ada yang masih kosong.' });
    }

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    const parsedLocationAccuracy = locationAccuracy === undefined || locationAccuracy === ''
      ? ''
      : Number(locationAccuracy);

    if (
      !Number.isFinite(parsedLatitude) ||
      !Number.isFinite(parsedLongitude) ||
      parsedLatitude < -90 ||
      parsedLatitude > 90 ||
      parsedLongitude < -180 ||
      parsedLongitude > 180
    ) {
      return res.status(400).json({ message: 'Titik koordinat tidak valid.' });
    }

    const submissionId = crypto.randomUUID();

    const pdfFilename = writeFileWithUuid(decodeBase64ToBuffer(pdfBase64), 'pdf');
    const fotoPetugasFilename = writeFileWithUuid(decodeBase64ToBuffer(fotoPetugasBase64), 'jpg');
    const fotoRambuFilename = fotoRambuBase64
      ? writeFileWithUuid(decodeBase64ToBuffer(fotoRambuBase64), 'jpg')
      : '';
    const fotoKtaFilename = fotoKTABase64
      ? writeFileWithUuid(decodeBase64ToBuffer(fotoKTABase64), 'jpg')
      : '';

    const pdfFileUrl = `${publicApiBaseUrl}/uploads/${pdfFilename}`;
    const fotoPetugasFileUrl = `${publicApiBaseUrl}/uploads/${fotoPetugasFilename}`;
    const fotoRambuFileUrl = fotoRambuFilename ? `${publicApiBaseUrl}/uploads/${fotoRambuFilename}` : '';
    const fotoKtaFileUrl = fotoKtaFilename ? `${publicApiBaseUrl}/uploads/${fotoKtaFilename}` : '';

    await insertSubmission({
      id: submissionId,
      nama,
      lokasiParkir,
      alamatParkir,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      locationAccuracy: Number.isFinite(parsedLocationAccuracy) ? parsedLocationAccuracy : '',
      locationCapturedAt: locationCapturedAt || '',
      pdfFilename: pdfFileUrl,
      fotoPetugasFilename: fotoPetugasFileUrl,
      fotoRambuFilename: fotoRambuFileUrl,
      fotoKtaFilename: fotoKtaFileUrl,
    });

    return res.status(201).json({
      id: submissionId,
      message: 'Data berhasil disimpan di server',
    });
  } catch (error) {
    console.error('Gagal menyimpan data:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
  }
});

app.listen(port, () => {
  console.log(`API run at | http://localhost:${port}`);
});
