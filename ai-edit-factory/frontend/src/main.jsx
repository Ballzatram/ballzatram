import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL || window.location.origin;
  try {
    const url = new URL(configured, window.location.origin);
    const browserHost = window.location.hostname;
    const configuredHostIsLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
    const browserHostIsLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(browserHost);
    if (configuredHostIsLocal && !browserHostIsLocal) {
      url.hostname = browserHost;
    }
    return url.origin;
  } catch (error) {
    return window.location.origin;
  }
}

const API = resolveApiBase();
const clipTypes = ['Funny', 'Emotional', 'Hype', 'Dramatic', 'Clean', 'Storytime'];
const defaultPrompt = 'Find the strongest hook, cut the boring parts, keep it vertical, and make the ending replayable.';
const allowedVideoTypes = ['mp4', 'mov', 'webm'];
const allowedAudioTypes = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'];
const maxUploadMb = 750;

function prettyBytes(bytes = 0) {
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extension(file) {
  return file?.name.split('.').pop()?.toLowerCase() || '';
}

function selectedFiles(fileList) {
  return Array.from(fileList || []);
}

function validateFile(file, allowed, label) {
  if (!file) return `Choose ${label} first.`;
  if (!allowed.includes(extension(file))) return `Use a supported ${label} file: ${allowed.join(', ')}.`;
  if (file.size > maxUploadMb * 1024 * 1024) return `${file.name} is over the ${maxUploadMb} MB upload limit.`;
  return '';
}

function StatusPill({ children }) {
  return <span className="statusPill">{children}</span>;
}

function AssetList({ assets, selectedId, onSelect }) {
  if (!assets.length) return <p className="emptyState">No uploads yet. Add clips you have permission to edit.</p>;
  return (
    <div className="assetList">
      {assets.map((asset) => (
        <button className={`assetButton ${asset.id === selectedId ? 'active' : ''}`} key={asset.id} onClick={() => onSelect(asset.id)} type="button">
          <span>{asset.original_filename || 'Uploaded source'}</span>
          <small>{Number(asset.duration || 0).toFixed(1)}s · {asset.width || '?'}×{asset.height || '?'} · {asset.file_type}</small>
        </button>
      ))}
    </div>
  );
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
          {pack.hashtags.length > 0 && <p className="tags">{pack.hashtags.join(' ')}</p>}
        </article>
      ))}
    </div>
  );
}

function App() {
  const [project, setProject] = useState(null);
  const [name, setName] = useState('Creator clip factory');
  const [videos, setVideos] = useState([]);
  const [music, setMusic] = useState(null);
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [clipType, setClipType] = useState('Funny');
  const [addMusic, setAddMusic] = useState(true);
  const [addCaptions, setAddCaptions] = useState(true);
  const [addHashtags, setAddHashtags] = useState(true);
  const [musicStart, setMusicStart] = useState('');
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [message, setMessage] = useState('Create a project, add media you have permission to use, choose a style, then generate and render from this page.');
  const [busy, setBusy] = useState(false);

  const assets = project?.assets || [];
  const sourceVideos = useMemo(() => assets.filter((asset) => asset.kind === 'source_video'), [assets]);
  const musicAssets = useMemo(() => assets.filter((asset) => asset.kind === 'music_audio'), [assets]);
  const selectedSource = sourceVideos.find((asset) => asset.id === selectedVideoId) || sourceVideos.at(-1);
  const selectedMusic = musicAssets.at(-1);
  const editPlan = project?.edit_plan?.plan;
  const renderJob = project?.render_job;
  const exports = project?.exports || [];
  const renderActive = ['pending', 'running'].includes(renderJob?.status) || ['rendering', 'render_queued'].includes(project?.status);
  const canUploadVideos = Boolean(project && videos.length && rightsConfirmed && !busy);
  const canUploadMusic = Boolean(project && music && rightsConfirmed && !busy);
  const canPlan = Boolean(project && selectedSource && prompt.trim().length >= 3 && !busy);
  const canRender = Boolean(project && editPlan && !busy && !['running', 'pending'].includes(renderJob?.status));

  useEffect(() => {
    if (!selectedVideoId && sourceVideos.length) setSelectedVideoId(sourceVideos.at(-1).id);
  }, [sourceVideos, selectedVideoId]);

  useEffect(() => {
    if (!project?.id || !renderActive) return undefined;
    const timer = window.setInterval(() => refresh(project.id), 2500);
    return () => window.clearInterval(timer);
  }, [project?.id, renderActive]);

  async function api(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API}${path}`, options);
    } catch (error) {
      throw new Error(`Cannot reach the AI clip factory API at ${API}. Make sure the backend is running. On a phone, open the site through the computer running Docker or set VITE_API_URL to that computer's local-network address.`);
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
        body: JSON.stringify({ name: name.trim() || 'Creator clip factory' }),
      });
      setProject(data);
      setMessage('Project created. Add one or more source videos and optional music.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function uploadFile(path, file, progressStart, progressEnd) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('rights_confirmed', 'true');
      form.append('file', file);
      const request = new XMLHttpRequest();
      request.open('POST', `${API}${path}`);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = event.loaded / event.total;
          setUploadProgress(Math.round(progressStart + ((progressEnd - progressStart) * percent)));
        }
      };
      request.onload = () => {
        const data = JSON.parse(request.responseText || '{}');
        if (request.status >= 200 && request.status < 300) resolve(data);
        else reject(new Error(data.detail || `Upload failed with status ${request.status}`));
      };
      request.onerror = () => reject(new Error('Upload failed. Check that the backend is running and accepts large files.'));
      request.send(form);
    });
  }

  async function uploadVideos() {
    if (!project) return setMessage('Create a project first.');
    if (!rightsConfirmed) return setMessage('Confirm that you own, licensed, or have permission to use every upload.');
    for (const file of videos) {
      const validation = validateFile(file, allowedVideoTypes, 'video');
      if (validation) return setMessage(validation);
    }
    setBusy(true);
    setUploadProgress(0);
    try {
      for (const [index, file] of videos.entries()) {
        const start = (index / videos.length) * 100;
        const end = ((index + 1) / videos.length) * 100;
        await uploadFile(`/api/studio/projects/${project.id}/video`, file, start, end);
      }
      await refresh(project.id);
      setVideos([]);
      setUploadProgress(100);
      setMessage('Sources updated. Pick the strongest clip, then generate the edit plan.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadMusic() {
    if (!project) return setMessage('Create a project first.');
    if (!rightsConfirmed) return setMessage('Confirm that you own, licensed, or have permission to use this music.');
    const validation = validateFile(music, allowedAudioTypes, 'music');
    if (validation) return setMessage(validation);
    setBusy(true);
    setUploadProgress(0);
    try {
      await uploadFile(`/api/studio/projects/${project.id}/music`, music, 0, 100);
      await refresh(project.id);
      setMusic(null);
      setUploadProgress(100);
      setMessage('Music saved. It will be used as the audio bed when Add music is enabled.');
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
        body: JSON.stringify({
          prompt,
          media_asset_id: selectedSource?.id,
          clip_type: clipType.toLowerCase(),
          add_music: addMusic,
          add_captions: addCaptions,
          add_hashtags: addHashtags,
          music_start_seconds: addMusic && musicStart !== '' ? Number(musicStart) : null,
        }),
      });
      await refresh(project.id);
      setMessage('AI edit plan ready. Review cuts, captions, hashtags, and music start before rendering. No external editing API is required.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendFeedback(rating, exportId = null) {
    if (!project?.id) return;
    setBusy(true);
    try {
      const data = await api(`/api/studio/projects/${project.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edit_plan_id: project.edit_plan?.id,
          export_id: exportId,
          rating,
          signal: rating >= 4 ? 'liked_export' : 'needs_improvement',
        }),
      });
      await refresh(project.id);
      setMessage(`Feedback saved. Learning samples: ${data.learning_profile.sample_size}. Future plans will adapt pacing and caption density.`);
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
    <main className="factoryShell">
      <section className="factoryHero">
        <a href="/" className="back">← Ballzatram</a>
        <p className="kicker">AI edit factory · native web workflow</p>
        <h1>Upload. Plan. Render clips.</h1>
        <p className="lede">A self-contained short-form workspace: upload permitted clips/music, let the built-in editor choose cuts, captions, hashtags, and render a downloadable MP4 without asking creators to connect an external editing API.</p>
        <div className="heroStats"><StatusPill>Built-in AI heuristics</StatusPill><StatusPill>Music start control</StatusPill><StatusPill>Trainable feedback</StatusPill></div>
      </section>

      <section className="factoryBoard">
        <article className="card setupCard">
          <span className="step">01</span>
          <h2>Project</h2>
          <label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <button disabled={busy} onClick={createProject}>{project ? `Project #${project.id} open` : 'Create project'}</button>
          {project && <p className="small">Status: <strong>{project.status}</strong></p>}
          <label className="check"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /> I own these files or have permission to edit them.</label>
        </article>

        <article className="card dropZone">
          <span className="step">02</span>
          <h2>Sources</h2>
          <p className="small">Upload multiple source videos. The editor starts with your selected clip, then can splice in moments from the rest of your sources.</p>
          <label>Video upload(s)<input type="file" multiple accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" onChange={(event) => setVideos(selectedFiles(event.target.files))} /></label>
          {videos.length > 0 && <p className="small">Selected: {videos.map((file) => `${file.name} (${prettyBytes(file.size)})`).join(', ')}</p>}
          <button disabled={!canUploadVideos} onClick={uploadVideos}>Add videos</button>
          <AssetList assets={sourceVideos} selectedId={selectedSource?.id} onSelect={setSelectedVideoId} />
        </article>

        <article className="card musicCard">
          <span className="step">03</span>
          <h2>Music</h2>
          <p className="small">Optional. Upload audio you can use, then leave Add music enabled.</p>
          <label>Music upload<input type="file" accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,audio/*" onChange={(event) => setMusic(event.target.files?.[0] || null)} /></label>
          {music && <p className="small">Selected: {music.name} · {prettyBytes(music.size)}</p>}
          <button disabled={!canUploadMusic} onClick={uploadMusic}>Add music bed</button>
          {selectedMusic ? <><p className="small">Saved: {selectedMusic.original_filename} · {Number(selectedMusic.duration || 0).toFixed(1)}s · {selectedMusic.file_type}</p><label>Song start second<input type="number" min="0" max={Math.max(0, Math.floor(selectedMusic.duration || 0))} step="0.1" value={musicStart} onChange={(event) => setMusicStart(event.target.value)} placeholder="Auto" /></label><p className="small">Leave blank for the editor's suggested hook/drop, or enter the exact second to use before rendering.</p></> : <p className="emptyState">No music bed uploaded yet.</p>}
        </article>
      </section>

      <section className="progressStrip"><span style={{ width: `${uploadProgress}%` }} /><strong>{busy ? 'Working…' : message}</strong></section>

      <section className="workbench">
        <div className="phoneFrame">
          {selectedSource?.preview_url ? <video controls playsInline src={`${API}${selectedSource.preview_url}`} /> : <div className="phoneEmpty">Select or upload a source video</div>}
        </div>
        <article className="card recipeCard">
          <span className="step">04</span>
          <h2>Edit direction</h2>
          <div className="chipGrid" role="group" aria-label="Type of clips to make">
            {clipTypes.map((type) => <button type="button" key={type} className={clipType === type ? 'chip active' : 'chip'} onClick={() => setClipType(type)}>{type}</button>)}
          </div>
          <div className="toggleGrid">
            <label className="check"><input type="checkbox" checked={addMusic} onChange={(event) => setAddMusic(event.target.checked)} /> Add music</label>
            <label className="check"><input type="checkbox" checked={addCaptions} onChange={(event) => setAddCaptions(event.target.checked)} /> Add captions</label>
            <label className="check"><input type="checkbox" checked={addHashtags} onChange={(event) => setAddHashtags(event.target.checked)} /> Generate #s</label>
          </div>
          <label>Direction<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows="6" placeholder={defaultPrompt} /></label>
          <button disabled={!canPlan} onClick={generatePlan}>Generate edit plan</button>
        </article>
      </section>

      <section className="card action studioStatus">
        <div><p className="kicker">Studio status</p><h2>{renderJob ? `${renderJob.status} · ${renderJob.progress}%` : 'Ready'}</h2><p>{renderJob?.message || message}</p>{renderJob?.error && <p className="error">{renderJob.error}</p>}</div>
        <button disabled={!project} onClick={() => refresh()}>Refresh</button>
      </section>

      {editPlan && (
        <section className="planLayout">
          <article className="card planSummary">
            <span className="step">05</span>
            <h2>Review and render</h2>
            <div className="planStats">
              <span>{editPlan.clip_type || editPlan.mood}</span><span>{editPlan.platform}</span><span>{editPlan.duration_seconds}s</span><span>{editPlan.aspect_ratio}</span>
            </div>
            <h3>Cuts</h3>
            <ol>{editPlan.segments.map((segment, index) => <li key={`${segment.source_start}-${index}`}>{segment.source_filename ? `${segment.source_filename} · ` : ''}{segment.source_start}s–{segment.source_end}s · {segment.reason}</li>)}</ol>
            {editPlan.text_overlays.length > 0 && <><h3>Captions</h3><ol>{editPlan.text_overlays.map((overlay, index) => <li key={`${overlay.time}-${index}`}>{overlay.time}s · “{overlay.text}” · {overlay.style}</li>)}</ol></>}
            <p><strong>Music:</strong> {editPlan.music_asset_id ? `Uploaded bed #${editPlan.music_asset_id} starting at ${editPlan.music_start_seconds || 0}s` : editPlan.music_vibe}</p>
            <p><strong>Export notes:</strong> {editPlan.export_notes}</p>
            <p className="small">Learning: {editPlan.learning_profile?.sample_size || 0} feedback sample(s). {editPlan.trend_context}</p>
            <button disabled={!canRender} onClick={createRenderJob}>Render downloadable MP4</button>
          </article>
          <article className="card">
            <h2>Edit plan JSON</h2>
            <PlanJson plan={editPlan} />
          </article>
        </section>
      )}

      {editPlan?.caption_packages && (
        <section className="outputs">
          <h2>Titles, captions & hashtags</h2>
          <CaptionPackages packages={editPlan.caption_packages} />
        </section>
      )}

      {exports.length > 0 && (
        <section className="outputs">
          <h2>Exports</h2>
          <div className="outputGrid">{exports.map((item) => (
            <article className="output" key={item.id}>
              <strong>{item.platform}</strong>
              <span>{item.status}</span>
              {item.download_url ? <video controls playsInline src={`${API}${item.download_url}`} /> : <span>{item.path || 'Render path pending'}</span>}
              {item.download_url && <a href={`${API}${item.download_url}`} download>Download MP4</a>}
              {item.download_url && <div className="feedbackRow"><button type="button" disabled={busy} onClick={() => sendFeedback(5, item.id)}>Works</button><button type="button" disabled={busy} onClick={() => sendFeedback(2, item.id)}>Needs tighter cuts</button></div>}
            </article>
          ))}</div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
