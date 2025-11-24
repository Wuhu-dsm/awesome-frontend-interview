export class ChunkUploader {
  constructor({ baseURL = '' } = {}) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this._paused = false;
    this._cancelled = false;
    this._resumeResolvers = [];
  }

  async upload(file, { chunkSize = 5 * 1024 * 1024, concurrency = 4, onProgress } = {}) {
    const totalChunks = Math.ceil(file.size / chunkSize);
    const hash = this._simpleId(file);

    // init
    const initResp = await fetch(`${this.baseURL}/upload/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, size: file.size, chunkSize, hash, totalChunks })
    }).then(r => r.json());

    const uploadId = initResp.uploadId;
    const missing = Array.isArray(initResp.missingIndices) ? initResp.missingIndices : [...Array(totalChunks).keys()];

    let uploadedCount = totalChunks - missing.length;
    const updateProgress = () => {
      if (typeof onProgress === 'function') onProgress(uploadedCount / totalChunks);
    };
    updateProgress();

    const tasks = missing.map((index) => async () => {
      const start = index * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const blob = file.slice(start, end);
      await this._uploadChunk({ uploadId, index, blob });
      uploadedCount++;
      updateProgress();
    });

    // run with pause/resume support
    await this._runWithConcurrency(tasks, concurrency);

    // complete
    const completeResp = await fetch(`${this.baseURL}/upload/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, filename: file.name, totalChunks })
    }).then(r => r.json());

    return completeResp;
  }

  async _uploadChunk({ uploadId, index, blob }) {
    const fd = new FormData();
    fd.append('uploadId', String(uploadId));
    fd.append('index', String(index));
    fd.append('chunk', blob, `chunk-${index}`);

    // Simple retry
    let attempts = 0;
    const maxAttempts = 3;
    while (true) {
      try {
        const resp = await fetch(`${this.baseURL}/upload/chunk`, { method: 'POST', body: fd });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data.ok) throw new Error('upload failed');
        return;
      } catch (e) {
        attempts++;
        if (attempts >= maxAttempts) throw e;
        await new Promise(r => setTimeout(r, 400 * attempts));
      }
    }
  }

  async _runWithConcurrency(taskFactories, concurrency) {
    const queue = [...taskFactories];
    this._cancelled = false;
    const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (true) {
        if (this._cancelled) return;
        if (this._paused) {
          await this._waitUntilResumed();
          // loop again after resume
          continue;
        }
        const task = queue.shift();
        if (!task) return;
        await task();
      }
    });
    await Promise.all(workers);
  }

  _simpleId(file) {
    // Not a cryptographic hash; good enough for demo/idempotency
    return `f_${file.name}_${file.size}_${file.lastModified}`.replace(/[^a-zA-Z0-9_.-]/g, '_');
  }

  pause() {
    this._paused = true;
  }

  resume() {
    if (!this._paused) return;
    this._paused = false;
    const resolvers = this._resumeResolvers.splice(0, this._resumeResolvers.length);
    resolvers.forEach((r) => {
      try { r(); } catch {}
    });
  }

  cancel() {
    this._cancelled = true;
    this.resume();
  }

  _waitUntilResumed() {
    if (!this._paused) return Promise.resolve();
    return new Promise((resolve) => {
      this._resumeResolvers.push(resolve);
    });
  }
}

export default ChunkUploader;