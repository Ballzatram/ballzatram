import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || window.location.origin;
const demoPrompt = 'Make this a chaotic 20-second TikTok clip with dramatic captions and dark funny energy.';
const allowedVideoTypes = ['mp4', 'mov', 'webm'];
const maxUploadMb = 750;

function prettyBytes(bytes = 0) {
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PlanJson({ plan }) {
  if (!plan) return null;
  return <pre className="jsonBlock">{JSON.stringify(plan, null, 2)}</pre>;
}

function CaptionPackages({ packages }) {
  if (!packages) return null;
  return (
    <div className="captionGrid">
      {Object.entries(packages).map(([platform, pack]) => (
        <article className="miniCard" key={platform}>
          <h3>{platform.replace('_', ' ')}</h3>
          <p><strong>Titles</strong></p>
          <ul>{pack.titles.map((item) => <li key={item}>{item}</li>)}</ul>
          <p><strong>Captions</strong></p>
          <ul>{pack.captions.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="tags">{pack.hashtags.join(' ')}</p>
        </article>
      ))}
    </div>
  );
}

function App() {
  const [project, setProject] = useState(null);
  const [name, setName] = useState('My AI clip');
  const [video, setVideo] = useState(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [prompt, setPrompt] = useState(demoPrompt);
  const [message, setMessage] = useState('Create a project, upload a rights-cleared source video, then generate a structured edit plan.');
  const [busy, setBusy] = useState(false);

  const assets = project?.assets || [];
  const sourceVideo = useMemo(() => [...assets].reverse().find((asset) => asset.kind === 'source_video'), [assets]);
  const editPlan = project?.edit_plan?.plan;
  const renderJob = project?.render_job;
  const exports = project?.exports || [];
  const canUpload = Boolean(project && video && rightsConfirmed && !busy);
  const canPlan = Boolean(project && sourceVideo && prompt.trim().length >= 3 && !busy);
  const canRender = Boolean(project && editPlan && !busy);

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API}${path}`, options);
    } catch (error) {
      throw new Error(`Cannot reach the AI clip studio API at ${API}. Make sure the backend is running.`);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Request failed with status ${response.status}`);
    return data;
  }

  async function refresh(id = project?.id) {
    if (!id) return;
    const data = await api(`/api/studio/projects/${id}`);
    setProject(data);
  }

  async function createProject() {
    setBusy(true);
    try {
      const data = await api('/api/studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setProject(data);
      setMessage('Project created. Confirm rights and upload an mp4, mov, or webm source video.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function validateVideo(file) {
    if (!file) return 'Choose a video first.';
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!allowedVideoTypes.includes(extension)) return 'Use an mp4, mov, or webm video file.';
    if (file.size > maxUploadMb * 1024 * 1024) return `Video is over the ${maxUploadMb} MB upload limit.`;
    return '';
  }

  async function uploadVideo() {
    if (!project) return setMessage('Create a project first.');
    const validation = validateVideo(video);
    if (validation) return setMessage(validation);
    if (!rightsConfirmed) return setMessage('Confirm that you own, licensed, or have permission to use this video.');
    setBusy(true);
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append('rights_confirmed', 'true');
      form.append('file', video);
      await new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `${API}/api/studio/projects/${project.id}/video`);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        };
        request.onload = () => {
          const data = JSON.parse(request.responseText || '{}');
          if (request.status >= 200 && request.status < 300) resolve(data);
          else reject(new Error(data.detail || `Upload failed with status ${request.status}`));
        };
        request.onerror = () => reject(new Error('Upload failed. Check that the backend is running and accepts large files.'));
        request.send(form);
      });
      await refresh(project.id);
      setVideo(null);
      setUploadProgress(100);
      setMessage('Video uploaded and metadata saved. Add creative direction and generate the edit plan.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function generatePlan() {
    if (!project) return setMessage('Create a project first.');
    setBusy(true);
    try {
      await api(`/api/studio/projects/${project.id}/edit-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, media_asset_id: sourceVideo?.id }),
      });
      await refresh(project.id);
      setMessage('Structured AI edit plan ready for review.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function createRenderJob() {
    if (!project) return setMessage('Create a project first.');
    setBusy(true);
    try {
      const data = await api(`/api/studio/projects/${project.id}/render`, { method: 'POST' });
      await refresh(project.id);
      setMessage(data.message);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero studioHero">
        <a href="/" className="back">← Ballzatram</a>
        <p className="kicker">AI clip-making studio · MVP</p>
        <h1>Turn long clips into short-form plans</h1>
        <p className="lede">Upload media you own, licensed, or have permission to use. This studio does not scrape TV, movies, games, YouTube, TikTok, private videos, DRM-protected media, or platform-restricted content.</p>
      </section>

      <section className="studioGrid">
        <article className="card">
          <span className="step">01</span>
          <h2>Project</h2>
          <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <button disabled={busy} onClick={createProject}>{project ? `Open project #${project.id}` : 'Create AI project'}</button>
          {project && <p className="small">Status: <strong>{project.status}</strong></p>}
        </article>

        <article className="card uploadCard">
          <span className="step">02</span>
          <h2>Source video</h2>
          <label className="check"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /> I confirm I own, licensed, or have permission to process and edit this upload.</label>
          <label>Upload mp4, mov, or webm<input type="file" accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" onChange={(event) => setVideo(event.target.files?.[0] || null)} /></label>
          {video && <p className="small">Selected: {video.name} · {prettyBytes(video.size)}</p>}
          <div className="progress"><span style={{ width: `${uploadProgress}%` }} /></div>
          <button disabled={!canUpload} onClick={uploadVideo}>Upload video</button>
          {sourceVideo && <p className="small">Saved: {sourceVideo.original_filename || 'source video'} · {Number(sourceVideo.duration || 0).toFixed(1)}s · {sourceVideo.width || '?'}×{sourceVideo.height || '?'} · {sourceVideo.file_type}</p>}
        </article>
      </section>

      {sourceVideo?.preview_url && (
        <section className="previewPanel">
          <div className="phoneFrame"><video controls playsInline src={`${API}${sourceVideo.preview_url}`} /></div>
          <article className="card promptCard">
            <span className="step">03</span>
            <h2>Creative direction</h2>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows="6" placeholder={demoPrompt} />
            <button disabled={!canPlan} onClick={generatePlan}>Generate structured edit plan</button>
            <p className="small">The AI acts like a creative video editor and returns JSON optimized for hook, pacing, captions, replayability, and hashtag relevance.</p>
          </article>
        </section>
      )}

      <section className="card action studioStatus">
        <div><p className="kicker">Studio status</p><h2>{renderJob ? `${renderJob.status} · ${renderJob.progress}%` : 'Ready'}</h2><p>{renderJob?.message || message}</p>{renderJob?.error && <p className="error">{renderJob.error}</p>}</div>
        <button disabled={!project} onClick={() => refresh()}>Refresh</button>
      </section>

      {editPlan && (
        <section className="planLayout">
          <article className="card planSummary">
            <span className="step">04</span>
            <h2>Review plan</h2>
            <div className="planStats">
              <span>{editPlan.platform}</span><span>{editPlan.duration_seconds}s</span><span>{editPlan.aspect_ratio}</span><span>{editPlan.mood}</span>
            </div>
            <h3>Segments</h3>
            <ol>{editPlan.segments.map((segment, index) => <li key={`${segment.source_start}-${index}`}>{segment.source_start}s–{segment.source_end}s · {segment.reason}</li>)}</ol>
            <h3>Text overlays</h3>
            <ol>{editPlan.text_overlays.map((overlay, index) => <li key={`${overlay.time}-${index}`}>{overlay.time}s · “{overlay.text}” · {overlay.style}</li>)}</ol>
            <p><strong>Caption style:</strong> {editPlan.caption_style}</p>
            <p><strong>Music vibe:</strong> {editPlan.music_vibe}</p>
            <p><strong>Export notes:</strong> {editPlan.export_notes}</p>
            <button disabled={!canRender} onClick={createRenderJob}>Create render/export job</button>
          </article>
          <article className="card">
            <h2>Structured JSON</h2>
            <PlanJson plan={editPlan} />
          </article>
        </section>
      )}

      {editPlan?.caption_packages && (
        <section className="outputs">
          <h2>Captions, titles & hashtags</h2>
          <CaptionPackages packages={editPlan.caption_packages} />
        </section>
      )}

      {exports.length > 0 && (
        <section className="outputs">
          <h2>Exports</h2>
          <div className="outputGrid">{exports.map((item) => <article className="output" key={item.id}><strong>{item.platform}</strong><span>{item.status}</span><span>{item.path || 'Render path pending'}</span></article>)}</div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
