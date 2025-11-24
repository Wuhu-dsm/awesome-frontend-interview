const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');

const app = express();
const port = 3000;

const UPLOAD_ROOT = path.join(__dirname, 'uploads');
fse.ensureDirSync(UPLOAD_ROOT);

app.use(cors());
app.use(express.json());

// Serve uploaded files and demo page
app.use('/uploads', express.static(UPLOAD_ROOT));
app.use(express.static(path.join(__dirname, 'public')));

// Expose the client library for the demo
app.use('/client', express.static(path.join(__dirname, '../chunk-upload-client')));

const upload = multer({ storage: multer.memoryStorage() });

function listChunkIndices(uploadId) {
  const dir = path.join(UPLOAD_ROOT, uploadId);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  return files
    .filter((f) => f.endsWith('.part'))
    .map((f) => parseInt(f.replace('.part', ''), 10))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);
}

function getMissingIndices(uploadId, totalChunks) {
  const present = new Set(listChunkIndices(uploadId));
  const missing = [];
  for (let i = 0; i < totalChunks; i++) {
    if (!present.has(i)) missing.push(i);
  }
  return missing;
}

// Initialize upload session
app.post('/upload/init', (req, res) => {
  const { filename, size, chunkSize, hash, totalChunks } = req.body || {};
  if (!filename || !size || !chunkSize) {
    return res.status(400).json({ error: 'filename, size, chunkSize are required' });
  }
  const chunks = Number.isInteger(totalChunks) ? totalChunks : Math.ceil(size / chunkSize);
  const safeName = path.basename(filename);
  const uploadId = (hash && String(hash)) || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const dir = path.join(UPLOAD_ROOT, uploadId);
  fse.ensureDirSync(dir);
  const missing = getMissingIndices(uploadId, chunks);
  return res.json({ uploadId, filename: safeName, totalChunks: chunks, missingIndices: missing });
});

// Receive single chunk
app.post('/upload/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { uploadId, index } = req.body || {};
    if (!uploadId || typeof index === 'undefined') {
      return res.status(400).json({ error: 'uploadId and index are required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'chunk file is required' });
    }
    const dir = path.join(UPLOAD_ROOT, uploadId);
    await fse.ensureDir(dir);
    const chunkPath = path.join(dir, `${parseInt(index, 10)}.part`);
    await fs.promises.writeFile(chunkPath, req.file.buffer);
    return res.json({ ok: true, index: parseInt(index, 10) });
  } catch (err) {
    console.error('Chunk upload error:', err);
    return res.status(500).json({ error: 'chunk upload failed' });
  }
});

// Check status (missing chunks)
app.get('/upload/status', (req, res) => {
  const uploadId = req.query.uploadId;
  const totalChunks = parseInt(req.query.totalChunks, 10);
  if (!uploadId || !Number.isInteger(totalChunks)) {
    return res.status(400).json({ error: 'uploadId and totalChunks are required' });
  }
  const missing = getMissingIndices(uploadId, totalChunks);
  return res.json({ uploadId, missingIndices: missing });
});

// Complete upload: merge chunks
app.post('/upload/complete', async (req, res) => {
  try {
    const { uploadId, filename, totalChunks } = req.body || {};
    if (!uploadId || !filename || !Number.isInteger(totalChunks)) {
      return res.status(400).json({ error: 'uploadId, filename, totalChunks are required' });
    }
    const dir = path.join(UPLOAD_ROOT, uploadId);
    if (!fs.existsSync(dir)) {
      return res.status(404).json({ error: 'upload session not found' });
    }
    const missing = getMissingIndices(uploadId, totalChunks);
    if (missing.length > 0) {
      return res.status(400).json({ error: 'missing chunks', missingIndices: missing });
    }
    const finalName = `${uploadId}_${path.basename(filename)}`;
    const finalPath = path.join(UPLOAD_ROOT, finalName);
    // Ensure empty target file
    await fs.promises.writeFile(finalPath, Buffer.alloc(0));
    // Append chunks sequentially
    for (let i = 0; i < totalChunks; i++) {
      const partPath = path.join(dir, `${i}.part`);
      const data = await fs.promises.readFile(partPath);
      await fs.promises.appendFile(finalPath, data);
    }
    // Cleanup chunk directory
    await fse.remove(dir);
    const stat = await fs.promises.stat(finalPath);
    const fileUrl = `/uploads/${finalName}`;
    return res.json({ ok: true, size: stat.size, url: fileUrl });
  } catch (err) {
    console.error('Complete error:', err);
    return res.status(500).json({ error: 'complete failed' });
  }
});

app.listen(port, () => {
  console.log(`Chunk upload server running at http://localhost:${port}`);
});