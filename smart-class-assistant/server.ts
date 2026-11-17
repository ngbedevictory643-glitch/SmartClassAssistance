import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(__dirname, '.data', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp4',
  '.webm',
  '.mov',
]);

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

function sanitizeFileName(rawName: string): string {
  const base = path.basename(rawName || 'resource.bin');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 140);
}

async function startServer() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'smart-class-assistant' });
  });

  // Binary file upload endpoint supporting XHR upload progress tracking
  app.post(
    '/api/upload',
    express.raw({ type: '*/*', limit: '50mb' }),
    (req, res) => {
      try {
        const rawHeaderName = String(req.headers['x-file-name'] || 'document.pdf');
        const decodedName = decodeURIComponent(rawHeaderName);
        const cleanName = sanitizeFileName(decodedName);
        const ext = path.extname(cleanName).toLowerCase();

        if (!ALLOWED_EXTENSIONS.has(ext)) {
          res.status(400).json({
            error: `Unsupported file type (${ext || 'unknown'}). Allowed: PDF, DOCX, PPTX, TXT, MD, PNG, JPG, WEBP, MP4, WEBM, MOV.`,
          });
          return;
        }

        const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
        if (bodyBuffer.length === 0) {
          res.status(400).json({ error: 'Uploaded file is empty.' });
          return;
        }

        const uniquePrefix = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}`;
        const storedName = `${uniquePrefix}-${cleanName}`;
        const targetPath = path.join(UPLOADS_DIR, storedName);

        fs.writeFileSync(targetPath, bodyBuffer);

        const mimeType = String(req.headers['content-type'] || MIME_MAP[ext] || 'application/octet-stream');

        res.status(201).json({
          fileUrl: `/api/files/${encodeURIComponent(storedName)}`,
          fileName: cleanName,
          storedName,
          fileSizeBytes: bodyBuffer.length,
          mimeType,
        });
      } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to store uploaded file.' });
      }
    }
  );

  // Serve uploaded files with byte-range support (for video pause/resume) & optional download disposition
  app.get('/api/files/:storedName', (req, res) => {
    const requested = path.basename(req.params.storedName || '');
    const filePath = path.join(UPLOADS_DIR, requested);

    if (!filePath.startsWith(UPLOADS_DIR) || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Requested file not found.' });
      return;
    }

    const ext = path.extname(requested).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=2592000');

    if (req.query.download === '1') {
      const originalPart = requested.replace(/^\d+-[a-f0-9]+-/, '');
      res.setHeader('Content-Disposition', `attachment; filename="${originalPart}"`);
    }

    res.sendFile(filePath);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Class Assistant server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
