import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL || window.location.origin;
  try {
    const url = new URL(configured, window.location.origin);
    const browserHost = window.location.hostname;
    const configuredHostIsLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
    const browserHostIsLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(browserHost);
    if (configuredHostIsLocal && !browserHostIsLocal) url.hostname = browserHost;
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
const feedbackOptions = [
  ['works', 'Nailed it', 5],
  ['needs_tighter_cuts', 'Tighten cuts', 2],
  ['wrong_music_section', 'Wrong music moment', 2],
  ['bad_captions', 'Bad captions', 2],
  ['bad_crop', 'Bad crop', 2],
];
const styleLabels = {
  beat_sync: 'Beat Sync',
  hook_buildup_reveal: 'Hook → Buildup → Reveal',
  fast_montage: 'Fast Montage',
};
const styleDescriptions = {
  beat_sync: 'Rhythm-first cuts that land with the tune.',
  hook_buildup_reveal: 'A clear setup, rising tension, and payoff moment.',
  fast_montage: 'Quick hits, punchy pacing, and lots of motion.',
};

function prettyBytes(bytes = 0) {
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function extension(file) { return file?.name.split('.').pop()?.toLowerCase() || ''; }
function selectedFiles(fileList) { return Array.from(fileList || []); }
function validateFile(file, allowed, label) {
  if (!file) return `Choose ${label} first.`;
  if (!allowed.includes(extension(file))) return `Use a supported ${label} file: ${allowed.join(', ')}.`;
  if (file.size > maxUploadMb * 1024 * 1024) return `${file.name} is over the ${maxUploadMb} MB upload limit.`;
  return '';
}
function round(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : fallback;
}
function planStyle(plan = {}) { return plan.style_template || plan.template || plan.timing?.cut_strategy || plan.clip_type || 'custom'; }
function styleLabel(plan = {}) {
  const style = planStyle(plan);
  return styleLabels[style] || String(style).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function statusLabel(status) {
  if (['finished', 'ready'].includes(status)) return 'Ready';
  if (['pending', 'queued', 'render_queued'].includes(status)) return 'Queued';
  if (['running', 'rendering'].includes(status)) return 'Rendering…';
  if (status === 'failed') return 'Failed';
  if (status === 'versions_ready') return 'Needs attention';
  return status ? String(status).replaceAll('_', ' ') : 'Planning…';
}
function StatusPill({ children }) { return <span className="statusPill">{children}</span>; }

function AssetList({ assets, selectedId, onSelect }) {
  if (!assets.length) return <p className="emptyState">No clips yet. Add videos you own or have permission to remix.</p>;
  return (
    <div className="assetList">
      {assets.map((asset) => (
        <button className={`assetButton ${asset.id === selectedId ? 'active' : ''}`} key={asset.id} onClick={() => onSelect(asset.id)} type="button">
          <span>{asset.original_filename || 'Uploaded clip'}</span>
          <small>{Number(asset.duration || 0).toFixed(1)}s · {asset.width || '?'}×{asset.height || '?'} · {asset.file_type}</small>
        </button>
      ))}
    </div>
  );
}

function FeedbackButtons({ disabled, onFeedback }) {
  return <div className="feedbackRow">{feedbackOptions.map(([eventType, label, rating]) => <button key={eventType} type="button" disabled={disabled} onClick={() => onFeedback(eventType, rating)}>{label}</button>)}</div>;
}

function CaptionPackages({ packages }) {
  if (!packages) return null;
  return (
    <div className="captionGrid">
      {Object.entries(packages).map(([platform, pack]) => (
        <article className="miniCard" key={platform}>
          <h3>{platform.replace('_', ' ')}</h3>
          <p><strong>Titles</strong></p>
          <ul>{(pack.titles || []).map((item) => <li key={item}>{item}</li>)}</ul>
          <p><strong>Captions</strong></p>
          <ul>{(pack.captions || []).map((item) => <li key={item}>{item}</li>)}</ul>
          {(pack.hashtags || []).length > 0 && <p className="tags">{pack.hashtags.join(' ')}</p>}
        </article>
      ))}
    </div>
  );
}

function EditRecipe({ row, draft, setDraft, saveDraft, cancelEdit, busy, selectedMusic, musicStart, setMusicStart, saveMusic, renderAgain }) {
  if (!draft) return null;
  const segments = draft.segments || [];
  const overlays = draft.text_overlays || [];
  const updateSegment = (index, patch) => setDraft({ ...draft, segments: segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, ...patch } : segment) });
  const updateOverlay = (index, patch) => setDraft({ ...draft, text_overlays: overlays.map((overlay, overlayIndex) => overlayIndex === index ? { ...overlay, ...patch } : overlay) });
  const moveSegment = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= segments.length) return;
    const next = [...segments];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setDraft({ ...draft, segments: next });
  };
  return (
    <article className="card planSummary">
      <div className="sectionHeader">
        <div><p className="kicker">Edit recipe</p><h2>{styleLabel(draft)}</h2></div>
        <div className="buttonRow"><button type="button" className="secondary" onClick={cancelEdit}>Close</button><button type="button" disabled={busy} onClick={() => renderAgain(row.id)}>Re-export MP4</button></div>
      </div>
      <div className="planStats">
        <span>{round(draft.duration_seconds)}s</span><span>{segments.length} cuts</span><span>{overlays.length} captions</span><span>Music {round(draft.music_settings?.source_start_s ?? draft.music_start_seconds)}s</span>
      </div>
      <p className="small">Captions are burned into MP4 exports by the ffmpeg renderer. Save changes, then re-export this version.</p>

      <h3>Clips used</h3>
      <ul className="compactList">{[...new Set(segments.map((segment) => segment.source_filename).filter(Boolean))].map((name) => <li key={name}>{name}</li>)}</ul>

      <h3>Cut list</h3>
      <div className="editRows">
        {segments.map((segment, index) => (
          <div className="editRow cutRow" key={`${segment.source_asset_id || 'clip'}-${index}`}>
            <strong>{segment.source_filename || `Clip ${index + 1}`}</strong>
            <label>Start<input type="number" min="0" step="0.1" value={segment.source_start ?? 0} onChange={(event) => updateSegment(index, { source_start: Number(event.target.value) })} /></label>
            <label>End<input type="number" min="0" step="0.1" value={segment.source_end ?? 0} onChange={(event) => updateSegment(index, { source_end: Number(event.target.value) })} /></label>
            <label>Label<input value={segment.reason || ''} onChange={(event) => updateSegment(index, { reason: event.target.value })} /></label>
            <div className="iconRow"><button type="button" className="secondary" disabled={index === 0} onClick={() => moveSegment(index, -1)}>↑</button><button type="button" className="secondary" disabled={index === segments.length - 1} onClick={() => moveSegment(index, 1)}>↓</button><button type="button" className="danger" onClick={() => setDraft({ ...draft, segments: segments.filter((_, removeIndex) => removeIndex !== index) })}>Remove</button></div>
          </div>
        ))}
      </div>

      <h3>Captions</h3>
      <div className="editRows">
        {overlays.map((overlay, index) => (
          <div className="editRow captionRow" key={`${overlay.time}-${index}`}>
            <label>Time<input type="number" min="0" step="0.1" value={overlay.time ?? 0} onChange={(event) => updateOverlay(index, { time: Number(event.target.value) })} /></label>
            <label>Text<input value={overlay.text || ''} onChange={(event) => updateOverlay(index, { text: event.target.value })} /></label>
            <label>Style<select value={overlay.style || 'bottom_sticker'} onChange={(event) => updateOverlay(index, { style: event.target.value })}><option value="bottom_sticker">Bottom sticker</option><option value="bold_center">Bold center</option><option value="punchline_pop">Punchline pop</option></select></label>
            <button type="button" className="danger" onClick={() => setDraft({ ...draft, text_overlays: overlays.filter((_, removeIndex) => removeIndex !== index) })}>Delete</button>
          </div>
        ))}
      </div>
      <button type="button" className="secondary" onClick={() => setDraft({ ...draft, text_overlays: [...overlays, { time: 0, text: 'New caption', style: 'bottom_sticker' }] })}>Add caption</button>

      <h3>Music timing</h3>
      <label>Start the tune at<input type="number" min="0" step="0.1" value={musicStart} onChange={(event) => setMusicStart(event.target.value)} placeholder={String(draft.music_settings?.source_start_s ?? draft.music_start_seconds ?? 0)} /></label>
      <button type="button" disabled={busy || !selectedMusic} onClick={() => saveMusic(row.id)}>Save music timing</button>
      <p><strong>Export notes:</strong> {draft.export_notes || 'Vertical MP4 export with uploaded clips and tune.'}</p>
      <div className="buttonRow"><button type="button" disabled={busy || !segments.length} onClick={saveDraft}>Save recipe</button><details><summary>Show technical JSON</summary><pre className="jsonBlock">{JSON.stringify(draft, null, 2)}</pre></details></div>
    </article>
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
  const [versionCount, setVersionCount] = useState(3);
  const [message, setMessage] = useState('Start with a project, drop in clips and a tune, then make versions.');
  const [backendOnline, setBackendOnline] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [draftPlan, setDraftPlan] = useState(null);
  const generatedRef = useRef(null);

  const assets = project?.assets || [];
  const sourceVideos = useMemo(() => assets.filter((asset) => asset.kind === 'source_video'), [assets]);
  const musicAssets = useMemo(() => assets.filter((asset) => asset.kind === 'music_audio'), [assets]);
  const selectedSource = sourceVideos.find((asset) => asset.id === selectedVideoId) || sourceVideos.at(-1);
  const selectedMusic = musicAssets.at(-1);
  const editPlans = project?.edit_plans || [];
  const trendSignals = project?.trend_signals || [];
  const exports = project?.exports || [];
  const exportsByPlan = useMemo(() => exports.reduce((map, item) => (map[item.edit_plan_id] ? map : { ...map, [item.edit_plan_id]: item }), {}), [exports]);
  const renderActive = exports.some((item) => ['rendering', 'queued', 'pending', 'running'].includes(item.status)) || ['pending', 'running'].includes(project?.render_job?.status);
  const fullStackReady = backendOnline && diagnostics?.app_mode === 'full_stack_render_ready';
  const canUploadVideos = Boolean(project && videos.length && rightsConfirmed && !busy);
  const canUploadMusic = Boolean(project && music && rightsConfirmed && !busy);
  const canPlan = Boolean(project && selectedSource && prompt.trim().length >= 3 && !busy);
  const editingRow = editPlans.find((row) => row.id === editingPlanId);

  useEffect(() => { checkDiagnostics(); }, []);
  useEffect(() => { if (!selectedVideoId && sourceVideos.length) setSelectedVideoId(sourceVideos.at(-1).id); }, [sourceVideos, selectedVideoId]);
  useEffect(() => {
    if (!project?.id || !renderActive) return undefined;
    const timer = window.setInterval(() => refresh(project.id), 2500);
    return () => window.clearInterval(timer);
  }, [project?.id, renderActive]);

  async function api(path, options = {}) {
    let response;
    try { response = await fetch(`${API}${path}`, options); }
    catch (error) { throw new Error(`Cannot reach the AI clip factory API at ${API}. Make sure the backend is running.`); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `Request failed with status ${response.status}`);
    return data;
  }
  async function checkDiagnostics() {
    try {
      const data = await api('/api/diagnostics');
      setDiagnostics(data);
      setBackendOnline(Boolean(data.api_ok));
    } catch (error) {
      setBackendOnline(false);
      setDiagnostics(null);
      setMessage('Backend offline. Uploads, rendering, and MP4 downloads need the FastAPI Docker stack.');
    }
  }
  async function refresh(id = project?.id) { if (id) setProject(await api(`/api/studio/projects/${id}`)); }
  async function createProject() {
    setBusy(true);
    try {
      const data = await api('/api/studio/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() || 'Creator clip factory' }) });
      setProject(data); setMessage('Project ready. Add clips and a tune when you have rights to use them.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  function uploadFile(path, file, progressStart, progressEnd) {
    return new Promise((resolve, reject) => {
      const form = new FormData(); form.append('rights_confirmed', 'true'); form.append('file', file);
      const request = new XMLHttpRequest(); request.open('POST', `${API}${path}`);
      request.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.round(progressStart + ((progressEnd - progressStart) * (event.loaded / event.total)))); };
      request.onload = () => { const data = JSON.parse(request.responseText || '{}'); request.status >= 200 && request.status < 300 ? resolve(data) : reject(new Error(data.detail || `Upload failed with status ${request.status}`)); };
      request.onerror = () => reject(new Error('Upload failed. Check that the backend is running and accepts large files.'));
      request.send(form);
    });
  }
  async function uploadVideos() {
    if (!project) return setMessage('Create a project first.');
    if (!rightsConfirmed) return setMessage('Confirm that you own, licensed, or have permission to use every upload.');
    for (const file of videos) { const validation = validateFile(file, allowedVideoTypes, 'clip'); if (validation) return setMessage(validation); }
    setBusy(true); setUploadProgress(0);
    try {
      for (const [index, file] of videos.entries()) await uploadFile(`/api/studio/projects/${project.id}/video`, file, (index / videos.length) * 100, ((index + 1) / videos.length) * 100);
      await refresh(project.id); setVideos([]); setUploadProgress(100); setMessage('Clips added. Pick a vibe and make versions.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function uploadMusic() {
    if (!project) return setMessage('Create a project first.');
    if (!rightsConfirmed) return setMessage('Confirm that you own, licensed, or have permission to use this tune.');
    const validation = validateFile(music, allowedAudioTypes, 'tune'); if (validation) return setMessage(validation);
    setBusy(true); setUploadProgress(0);
    try { await uploadFile(`/api/studio/projects/${project.id}/music`, music, 0, 100); await refresh(project.id); setMusic(null); setUploadProgress(100); setMessage('Tune added. The editor can cut to this music bed.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function queueRender(editPlanId) {
    const data = await api(`/api/studio/projects/${project.id}/render`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edit_plan_id: editPlanId }) });
    return data;
  }
  async function createRenderJob(editPlanId) {
    if (!project) return setMessage('Create a project first.');
    setBusy(true);
    try { const data = await queueRender(editPlanId); await refresh(project.id); setMessage(data.message || 'Export queued.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function generateVersions(count = versionCount) {
    if (!project) return setMessage('Create a project first.');
    setBusy(true);
    try {
      const data = await api(`/api/studio/projects/${project.id}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, count, media_asset_id: selectedSource?.id, target_platform: 'tiktok', use_trends: true }) });
      setMessage(fullStackReady ? `Made ${count} versions and started MP4 exports.` : `Made ${count} versions. Use Render all when the backend is ready.`);
      setTimeout(() => generatedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      if (fullStackReady) for (const row of data.edit_plans || []) await queueRender(row.id);
      await refresh(project.id);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function generatePlan() {
    if (!project) return setMessage('Create a project first.');
    setBusy(true);
    try {
      await api(`/api/studio/projects/${project.id}/edit-plans`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, media_asset_id: selectedSource?.id, clip_type: clipType.toLowerCase(), add_music: addMusic, add_captions: addCaptions, add_hashtags: addHashtags, music_start_seconds: addMusic && musicStart !== '' ? Number(musicStart) : null }) });
      await refresh(project.id); setMessage('Made 1 edit. Review the recipe, then export MP4.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function renderAll() {
    setBusy(true);
    try { for (const row of editPlans) if (!exportsByPlan[row.id]?.download_url) await queueRender(row.id); await refresh(project.id); setMessage(`Queued ${editPlans.length} MP4 export${editPlans.length === 1 ? '' : 's'}.`); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  function openEditor(row) { setEditingPlanId(row.id); setDraftPlan(JSON.parse(JSON.stringify(row.plan))); setMusicStart(String(row.plan.music_settings?.source_start_s ?? row.plan.music_start_seconds ?? '')); }
  async function savePlanDraft() {
    if (!editingRow) return;
    setBusy(true);
    try {
      const updated = await api(`/api/studio/projects/${project.id}/edit-plans/${editingRow.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segments: draftPlan.segments || [], text_overlays: draftPlan.text_overlays || [] }) });
      setDraftPlan(updated.plan); await refresh(project.id); setMessage('Edit recipe saved. Re-export to use the updated cuts and captions.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function saveMusic(editPlanId = editingPlanId) {
    setBusy(true);
    try {
      const updated = await api(`/api/studio/projects/${project.id}/edit-plans/${editPlanId}/music`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ music_asset_id: selectedMusic?.id || null, source_start_s: musicStart !== '' ? Number(musicStart) : 0, source_end_s: null, volume: 0.85, fade_in_s: 0.15, fade_out_s: 0.25, duck_original_audio: true }) });
      if (editingPlanId === editPlanId) setDraftPlan(updated.plan);
      await refresh(project.id); setMessage('Music timing saved. Re-export this version for the new moment.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function sendFeedback(eventType, rating, editPlanId = editingPlanId || project?.edit_plan?.id, exportId = null) {
    if (!project?.id) return;
    setBusy(true);
    try {
      const data = await api(`/api/studio/projects/${project.id}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ edit_plan_id: editPlanId, export_id: exportId, rating, event_type: eventType, signal: eventType }) });
      await refresh(project.id); setMessage(`Feedback saved. Learning samples: ${data.learning_profile.sample_size}.`);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="factoryShell">
      <section className="factoryHero">
        <a href="/" className="back">← Ballzatram</a>
        <p className="kicker">AI clip factory</p>
        <h1>Upload. Remix. Make it tok.</h1>
        <p className="lede">Drop in your clips and a music bed, pick a vibe, and spin out short-form edits ready to preview, tweak, and download.</p>
        <div className="heroStats"><StatusPill>No editing timeline required</StatusPill><StatusPill>Music timing controls</StatusPill><StatusPill>Multiple versions</StatusPill><StatusPill>Feedback loop</StatusPill></div>
      </section>

      {!backendOnline && <section className="card warning"><strong>Backend offline.</strong><p>Start the Docker stack to upload media, render MP4s, and download exports.</p></section>}

      <section className="factoryBoard">
        <article className="card setupCard"><span className="step">01</span><h2>Project</h2><label>Project name<input value={name} onChange={(event) => setName(event.target.value)} /></label><button disabled={busy} onClick={createProject}>{project ? `Project #${project.id} open` : 'Create project'}</button>{project && <p className="small">Ready for edits.</p>}<label className="check"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /> I own these files or have permission to edit them.</label></article>
        <article className="card dropZone"><span className="step">02</span><h2>Clips</h2><p className="small">Add a few source videos for more variety. Three or more clips gives the editor room to cook.</p><label>Clip upload(s)<input type="file" multiple accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm" onChange={(event) => setVideos(selectedFiles(event.target.files))} /></label>{videos.length > 0 && <p className="small">Selected: {videos.map((file) => `${file.name} (${prettyBytes(file.size)})`).join(', ')}</p>}<button disabled={!canUploadVideos} onClick={uploadVideos}>Add clips</button><AssetList assets={sourceVideos} selectedId={selectedSource?.id} onSelect={setSelectedVideoId} /></article>
        <article className="card musicCard"><span className="step">03</span><h2>Tune</h2><p className="small">Optional. Upload music you have rights to use and choose where the drop starts.</p><label>Tune upload<input type="file" accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,audio/*" onChange={(event) => setMusic(event.target.files?.[0] || null)} /></label>{music && <p className="small">Selected: {music.name} · {prettyBytes(music.size)}</p>}<button disabled={!canUploadMusic} onClick={uploadMusic}>Add tune</button>{selectedMusic ? <><p className="small">Saved: {selectedMusic.original_filename} · {Number(selectedMusic.duration || 0).toFixed(1)}s</p><label>Tune start second<input type="number" min="0" max={Math.max(0, Math.floor(selectedMusic.duration || 0))} step="0.1" value={musicStart} onChange={(event) => setMusicStart(event.target.value)} placeholder="Auto" /></label></> : <p className="emptyState">No tune uploaded yet.</p>}</article>
      </section>

      <section className="progressStrip"><span style={{ width: `${uploadProgress}%` }} /><strong>{busy ? 'Working…' : message}</strong></section>

      <section className="workbench">
        <div className="phoneFrame">{selectedSource?.preview_url ? <><div className="previewBadge">Source preview</div><video controls playsInline src={`${API}${selectedSource.preview_url}`} /></> : <div className="phoneEmpty">Upload clips to start making toks</div>}</div>
        <article className="card recipeCard"><span className="step">04</span><h2>Pick a vibe</h2><div className="chipGrid" role="group" aria-label="Type of clips to make">{clipTypes.map((type) => <button type="button" key={type} className={clipType === type ? 'chip active' : 'chip'} onClick={() => setClipType(type)}>{type}</button>)}</div><div className="toggleGrid"><label className="check"><input type="checkbox" checked={addMusic} onChange={(event) => setAddMusic(event.target.checked)} /> Add tune</label><label className="check"><input type="checkbox" checked={addCaptions} onChange={(event) => setAddCaptions(event.target.checked)} /> Add captions</label><label className="check"><input type="checkbox" checked={addHashtags} onChange={(event) => setAddHashtags(event.target.checked)} /> Generate #s</label></div><label>Direction<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows="5" placeholder={defaultPrompt} /></label><label>How many versions?<select value={versionCount} onChange={(event) => setVersionCount(Number(event.target.value))}><option value="1">1 edit</option><option value="3">3 versions</option><option value="6">6 versions</option></select></label><div className="buttonRow"><button disabled={!canPlan} onClick={() => generateVersions(versionCount)}>{versionCount === 1 ? 'Make 1 edit' : `Make ${versionCount} versions`}</button><button disabled={!canPlan} onClick={generatePlan} className="secondary">Make 1 custom edit</button></div></article>
      </section>

      <section className="outputs" ref={generatedRef}>
        <div className="sectionHeader"><div><p className="kicker">Step 05</p><h2>Generated edits</h2></div>{editPlans.length > 0 && !fullStackReady && <button type="button" disabled={busy} onClick={renderAll}>Render all {editPlans.length}</button>}</div>
        {editPlans.length === 0 ? <p className="emptyState">Your finished edit cards will land here with previews, notes, feedback, and Download MP4 buttons.</p> : <div className="versionGrid">{editPlans.map((row) => {
          const plan = row.plan || {}; const exportItem = exportsByPlan[row.id]; const ready = Boolean(exportItem?.download_url); const status = ready ? 'ready' : exportItem?.status || (renderActive ? 'rendering' : 'queued');
          return <article className="versionCard" key={row.id}><div className="versionTop"><div><p className="kicker">Version {plan.version_index || row.id}</p><h3>{styleLabel(plan)}</h3></div><span className={`statusBadge ${status}`}>{statusLabel(status)}</span></div>{ready ? <video controls playsInline src={`${API}${exportItem.download_url}`} /> : <div className="previewPlaceholder">{statusLabel(status)}</div>}<p>{styleDescriptions[planStyle(plan)] || 'A short-form edit recipe ready to tweak and export.'}</p><div className="metricGrid"><span>{round(plan.duration_seconds)}s</span><span>{(plan.segments || []).length} cuts</span><span>Music {round(plan.music_settings?.source_start_s ?? plan.music_start_seconds)}s</span><span>{(plan.text_overlays || []).length} captions</span></div><p className="tags">{[plan.timing?.cut_strategy, plan.timing?.structure?.join(' → '), plan.caption_style].filter(Boolean).slice(0, 3).join(' · ')}</p><div className="buttonRow">{ready && <a className="downloadButton" href={`${API}${exportItem.download_url}`} download>Download MP4</a>}<button type="button" className="secondary" onClick={() => openEditor(row)}>Edit</button><button type="button" disabled={busy} onClick={() => createRenderJob(row.id)}>{ready ? 'Re-export MP4' : 'Export MP4'}</button></div><FeedbackButtons disabled={busy} onFeedback={(eventType, rating) => sendFeedback(eventType, rating, row.id, exportItem?.id)} /></article>;
        })}</div>}
      </section>

      {editingRow && <EditRecipe row={editingRow} draft={draftPlan} setDraft={setDraftPlan} saveDraft={savePlanDraft} cancelEdit={() => { setEditingPlanId(null); setDraftPlan(null); }} busy={busy} selectedMusic={selectedMusic} musicStart={musicStart} setMusicStart={setMusicStart} saveMusic={saveMusic} renderAgain={createRenderJob} />}

      {trendSignals.length > 0 && <section className="outputs"><h2>Vibe ideas</h2><div className="captionGrid">{trendSignals.map((signal) => <article className="miniCard" key={signal.id}><h3>{signal.format_name}</h3><p><strong>Hook:</strong> {signal.hook_style}</p><p><strong>Pacing:</strong> {signal.pacing_style}</p><p className="tags">{(signal.hashtags || []).join(' ')}</p></article>)}</div></section>}
      {editPlans[0]?.plan?.caption_packages && <section className="outputs"><h2>Caption starters</h2><CaptionPackages packages={editPlans[0].plan.caption_packages} /></section>}

      <details className="systemStatus"><summary>System status: {fullStackReady ? 'ready' : backendOnline ? 'needs attention' : 'offline'}</summary>{diagnostics ? <div className="diagnosticGrid"><span>ffmpeg: {diagnostics.ffmpeg_available ? 'yes' : 'no'}</span><span>ffprobe: {diagnostics.ffprobe_available ? 'yes' : 'no'}</span><span>redis: {diagnostics.redis_available ? 'yes' : 'no'}</span><span>mode: {diagnostics.app_mode}</span></div> : <p>API diagnostics unavailable.</p>}</details>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
