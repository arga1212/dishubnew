import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const csvPath = process.env.SUBMISSIONS_CSV_PATH
  ? path.resolve(process.cwd(), process.env.SUBMISSIONS_CSV_PATH)
  : path.join(dataDir, 'jukir.csv');

export const getCsvPath = () => csvPath;

const CSV_HEADERS = [
  'id',
  'nama',
  'lokasi_parkir',
  'alamat_parkir',
  'pdf_filename',
  'foto_petugas_filename',
  'foto_rambu_filename',
  'foto_kta_filename',
  'created_at',
];

export const initializeDatabase = () => {
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, `${CSV_HEADERS.join(',')}\n`, { encoding: 'utf8', mode: 0o600 });
  }
};

const escapeCsvValue = (value) => {
  const safeValue = String(value ?? '');
  const escaped = safeValue.replace(/"/g, '""');
  if (/[",\n\r]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let index = 0;
  let inQuotes = false;

  while (index < line.length) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 2;
        continue;
      }
      inQuotes = !inQuotes;
      index += 1;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  values.push(current);
  return values;
};

const readSubmissions = () => {
  initializeDatabase();
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length <= 1) {
    return [];
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    CSV_HEADERS.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? '';
    });
    return row;
  });
};

export const insertSubmission = ({
  id,
  nama,
  lokasiParkir,
  alamatParkir,
  pdfFilename,
  fotoPetugasFilename,
  fotoRambuFilename,
  fotoKtaFilename,
}) => {
  return new Promise((resolve, reject) => {
    try {
      initializeDatabase();
      const createdAt = new Date().toISOString();
      const rowValues = [
        id,
        nama,
        lokasiParkir,
        alamatParkir,
        pdfFilename,
        fotoPetugasFilename,
        fotoRambuFilename,
        fotoKtaFilename,
        createdAt,
      ];

      const row = `${rowValues.map(escapeCsvValue).join(',')}\n`;
      fs.appendFileSync(csvPath, row, { encoding: 'utf8' });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

export const getSubmissions = () => {
  const rows = readSubmissions();
  return rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getSubmissionById = (id) => {
  const rows = readSubmissions();
  return rows.find((row) => row.id === id) || null;
};
