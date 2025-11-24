/*
 * @Description: 文件描述
 * @Author: qianxuemin001
 * @Date: 2025-11-24 10:51:49
 * @LastEditTime: 2025-11-24 11:13:17
 * @LastEditors: qianxuemin001
 */
import { useRef, useState } from 'react'
import './App.css'
import { ChunkUploader } from '../../chunk-upload-client/index.js'

function App() {
  const [file, setFile] = useState(null)
  const [chunkSizeMB, setChunkSizeMB] = useState(5)
  const [concurrency, setConcurrency] = useState(4)
  const [percent, setPercent] = useState(0)
  const [resultUrl, setResultUrl] = useState('')
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)
  const uploaderRef = useRef(null)

  const appendLog = (msg) => {
    const time = new Date().toLocaleTimeString()
    setLog((prev) => [...prev, `[${time}] ${msg}`])
  }

  const onStart = async () => {
    if (!file) { alert('请先选择文件'); return }
    const chunkSize = (parseInt(chunkSizeMB, 10) || 5) * 1024 * 1024
    const conc = parseInt(concurrency, 10) || 4
    setPercent(0)
    setResultUrl('')
    setLog([])
    appendLog(`开始上传：${file.name}，大小 ${Math.round(file.size/1024/1024)} MB，分片 ${chunkSizeMB}MB，并发 ${conc}`)
    const uploader = new ChunkUploader({ baseURL: 'http://localhost:3000' })
    uploaderRef.current = uploader
    setRunning(true)
    try {
      const resp = await uploader.upload(file, {
        chunkSize,
        concurrency: conc,
        onProgress: (p) => {
          setPercent(Math.floor(p * 100))
        },
      })
      appendLog('上传完成')
      if (resp && resp.url) setResultUrl(resp.url)
    } catch (e) {
      console.error(e)
      appendLog('上传失败：' + (e && e.message ? e.message : '未知错误'))
      alert('上传失败')
    } finally {
      setRunning(false)
    }
  }

  const onPause = () => {
    const uploader = uploaderRef.current
    if (!uploader) { alert('请先开始上传'); return }
    uploader.pause()
    appendLog('已暂停上传')
  }

  const onResume = () => {
    const uploader = uploaderRef.current
    if (!uploader) { alert('请先开始上传'); return }
    uploader.resume()
    appendLog('已恢复上传')
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>大文件分片上传（React）</h2>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'inline-block', width: 120 }}>选择文件：</label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'inline-block', width: 120 }}>分片大小(MB)：</label>
        <input type="number" min={1} value={chunkSizeMB} onChange={(e) => setChunkSizeMB(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'inline-block', width: 120 }}>并发数：</label>
        <input type="number" min={1} value={concurrency} onChange={(e) => setConcurrency(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={onStart} disabled={running}>开始上传</button>
        <button onClick={onPause} style={{ marginLeft: 8 }} disabled={!running}>暂停</button>
        <button onClick={onResume} style={{ marginLeft: 8 }} disabled={!running}>恢复</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'inline-block', width: 120 }}>进度：</label>
        <progress value={percent} max={100} style={{ width: 360, height: 18 }} />
        <span style={{ marginLeft: 8 }}>{percent}%</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        {resultUrl && (<div>已合并文件：<a href={resultUrl} target="_blank" rel="noreferrer">{resultUrl}</a></div>)}
      </div>
      <div style={{ whiteSpace: 'pre-wrap', background: '#f7f7f7', padding: 8, borderRadius: 6 }}>
        {log.map((l, i) => (<div key={i}>{l}</div>))}
      </div>
    </div>
  )
}

export default App
