import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || window.location.origin;
const templates = ['all', 'fast_cut', 'high_motion', 'slow_mo', 'lyric_caption', 'random_montage', 'retro_tv_filter'];

function App() {
  const [project, setProject] = useState(null);
  const [name, setName] = useState('Day 1 edit batch');
  const [numOutputs, setNumOutputs] = useState(10);
  const [template, setTemplate] = useState('all');
  const [song, setSong] = useState(null);
  const [videos, setVideos] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeKind, setYoutubeKind] = useState('video');
  const [message, setMessage] = useState('Create a project, upload rights-approved files, then generate edits.');
  const [busy, setBusy] = useState(false);

  const outputs = useMemo(() => project?.outputs || [], [project]);
  const job = project?.job;

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Request failed');
    return data;
  }

  async function createProject() {
    setBusy(true);
    try {
      const data = await api('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, style_template: template, num_outputs: Number(numOutputs) }),
      });
      setProject({ ...data, assets: [], outputs: [] });
      setMessage('Project created. Upload a song and at least one video clip.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles() {
    if (!project) return setMessage('Create a project first.');
    setBusy(true);
    try {
      if (song) {
        const form = new FormData();
        form.append('file', song);
        await api(`/api/projects/${project.id}/song`, { method: 'POST', body: form });
      }
      if (videos.length) {
        const form = new FormData();
        videos.forEach((file) => form.append('files', file));
        await api(`/api/projects/${project.id}/videos`, { method: 'POST', body: form });
      }
      await refresh(project.id);
      setMessage('Uploads saved. Start generation when ready.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function importYoutube() {
    if (!project) return setMessage('Create a project first.');
    if (!youtubeUrl) return setMessage('Paste a YouTube URL first.');
    setBusy(true);
    try {
      await api(`/api/projects/${project.id}/youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: youtubeKind, url: youtubeUrl }),
      });
      await refresh(project.id);
      setMessage('Metadata imported only. Downloads remain disabled unless explicitly rights-gated in CLI/deployment.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!project) return setMessage('Create a project first.');
    setBusy(true);
    try {
      const job = await api(`/api/projects/${project.id}/generate`, { method: 'POST' });
      setProject((current) => ({ ...current, job }));
      setMessage('Generation queued on the site. The backend worker is rendering your edits now.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function refresh(id = project?.id) {
    if (!id) return;
    const data = await api(`/api/projects/${id}`);
    setProject(data);
  }

  useEffect(() => {
    if (!project?.id || !job || ['finished', 'failed'].includes(job.status)) return;
    const timer = setInterval(() => refresh(project.id).catch((error) => setMessage(error.message)), 2000);
    return () => clearInterval(timer);
  }, [project?.id, job?.status]);

  return (
    <main className="shell">
      <section className="hero">
        <a href="/" className="back">← Ballzatram</a>
        <p className="kicker">Production MVP · ai-edit-factory</p>
        <h1>Generate beat-synced vertical edits</h1>
        <p className="lede">Upload media you own, licensed, or have permission to use. YouTube URLs import metadata only by default; this app does not bypass DRM, logins, private videos, geo-blocks, or platform restrictions.</p>
      </section>

      <section className="grid">
        <div className="card">
          <span className="step">01</span>
          <h2>Project</h2>
          <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <div className="row">
            <label>Outputs<input type="number" min="1" max="30" value={numOutputs} onChange={(event) => setNumOutputs(event.target.value)} /></label>
            <label>Style<select value={template} onChange={(event) => setTemplate(event.target.value)}>{templates.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <button disabled={busy} onClick={createProject}>{project ? `Project #${project.id}` : 'Create project'}</button>
        </div>

        <div className="card">
          <span className="step">02</span>
          <h2>Uploads</h2>
          <label>Song file<input type="file" accept="audio/*" onChange={(event) => setSong(event.target.files?.[0] || null)} /></label>
          <label>Video clips<input type="file" accept="video/*" multiple onChange={(event) => setVideos([...event.target.files])} /></label>
          <button disabled={busy || !project} onClick={uploadFiles}>Upload files</button>
        </div>

        <div className="card">
          <span className="step">03</span>
          <h2>YouTube metadata</h2>
          <p className="small">Metadata only. Downloads are disabled by default and require explicit rights confirmation in supported deployments.</p>
          <div className="row"><select value={youtubeKind} onChange={(event) => setYoutubeKind(event.target.value)}><option>video</option><option>song</option></select></div>
          <input placeholder="https://www.youtube.com/watch?v=..." value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} />
          <button disabled={busy || !project} onClick={importYoutube}>Fetch metadata</button>
        </div>
      </section>

      <section className="card action">
        <div><p className="kicker">Status</p><h2>{job ? `${job.status} · ${job.progress}%` : 'Ready'}</h2><p>{job?.message || message}</p>{job?.error && <p className="error">{job.error}</p>}</div>
        <button disabled={busy || !project} onClick={generate}>Generate edits</button>
        <button disabled={!project} onClick={() => refresh()}>Refresh</button>
      </section>

      <section className="outputs">
        <h2>Ranked outputs</h2>
        {outputs.length === 0 && <p>No outputs yet. Finished renders will appear here best-first.</p>}
        <div className="outputGrid">
          {outputs.map((output) => (
            <article className="output" key={output.id}>
              <video controls playsInline src={`${API}/media/outputs/project_${project.id}/${output.filename}`} />
              <strong>{output.filename}</strong>
              <span>{output.template} · score {Number(output.score).toFixed(3)}</span>
              <a href={`${API}/api/outputs/${output.id}/download`}>Download MP4</a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
