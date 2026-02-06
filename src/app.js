// Fitness Competition Tracker - Electron App

const AVATARS = ['🏃‍♀️', '🏃', '💪', '🧘‍♀️', '🧘', '🚴‍♀️', '🚴', '🏋️‍♀️', '🏋️', '⛹️‍♀️', '⛹️', '🤸‍♀️', '🏊‍♀️', '🏊', '🧗‍♀️', '🧗'];

let state = {
  competition: null,
  participants: [],
  currentView: 'dashboard',
  selectedParticipant: null,
  proofModal: null
};

let currentUploadedProof = null;

// Get local date string (fixes timezone issue)
function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function init() {
  console.log('App initializing...');
  await loadData();
  console.log('Data loaded:', state);
  render();
}

async function loadData() {
  try {
    const data = await window.electronAPI.loadData();
    state.competition = data.competition;
    state.participants = data.participants || [];
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

async function saveData() {
  try {
    await window.electronAPI.saveData({
      competition: state.competition,
      participants: state.participants
    });
    console.log('Data saved');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

function calculatePoints(logs) {
  let total = 0;
  logs.forEach(log => {
    if (log.completed) total += 1;
    if (log.water) total += 1;
    if (log.walkWithFriend) total += 1;
  });
  return total;
}

// Check if a log entry has valid proof
function hasProof(log) {
  if (log.proofPath && log.proofPath.length > 0) return true;
  if (log.proof && log.proof !== 'none' && log.proof !== '' && log.proof !== 'photo' && log.proof !== 'video') return true;
  // If proof is 'photo' or 'video', we need proofPath
  if ((log.proof === 'photo' || log.proof === 'video') && log.proofPath) return true;
  return false;
}

function calculateStats(participant) {
  const logs = participant.logs || [];
  const workoutDays = logs.filter(l => l.completed).length;
  const totalMinutes = logs.reduce((acc, l) => acc + (l.duration || 0), 0);
  const waterDays = logs.filter(l => l.water).length;
  const friendWalks = logs.filter(l => l.walkWithFriend).length;
  const proofUploads = logs.filter(l => l.completed && hasProof(l)).length;
  const noProofDays = logs.filter(l => l.completed && !hasProof(l)).length;
  const totalSteps = logs.reduce((acc, l) => acc + (l.steps || 0), 0);
  const totalDistance = logs.reduce((acc, l) => acc + (l.distance || 0), 0);
  const weights = logs.filter(l => l.weight).map(l => l.weight);
  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const startWeight = weights.length > 0 ? weights[0] : null;
  const weightChange = (latestWeight && startWeight) ? (latestWeight - startWeight).toFixed(1) : null;

  return {
    totalPoints: calculatePoints(logs),
    workoutDays,
    totalMinutes,
    avgMinutes: workoutDays > 0 ? Math.round(totalMinutes / workoutDays) : 0,
    waterDays,
    friendWalks,
    proofUploads,
    noProofDays,
    streakDays: calculateStreak(logs),
    totalSteps,
    totalDistance: totalDistance.toFixed(1),
    latestWeight,
    weightChange
  };
}

function calculateStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  const sortedLogs = [...logs].filter(l => l.completed).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sortedLogs.length === 0) return 0;
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < sortedLogs.length; i++) {
    const logDate = new Date(sortedLogs[i].date + 'T00:00:00');
    logDate.setHours(0, 0, 0, 0);
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);
    if (logDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getCompetitionProgress() {
  if (!state.competition) return { day: 0, percent: 0, daysLeft: 0 };
  const start = new Date(state.competition.startDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  const percent = Math.min(100, Math.round((daysPassed / state.competition.durationDays) * 100));
  const daysLeft = Math.max(0, state.competition.durationDays - daysPassed);
  return { day: Math.min(daysPassed, state.competition.durationDays), percent, daysLeft };
}

// Get proof display info
function getProofInfo(log) {
  const proof = log.proof;
  const proofPath = log.proofPath;
  
  console.log('getProofInfo called:', { proof, proofPath });
  
  // Has a file uploaded (proofPath exists)
  if (proofPath && proofPath.length > 0) {
    const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(proofPath);
    return { 
      icon: isVideo ? '🎥' : '📷', 
      label: isVideo ? 'Video' : 'Photo', 
      cssClass: isVideo ? 'proof-badge--video' : 'proof-badge--photo',
      canView: true 
    };
  }
  
  // Has a URL (starts with http)
  if (proof && typeof proof === 'string' && proof.startsWith('http')) {
    if (proof.includes('youtube') || proof.includes('youtu.be')) {
      return { icon: '▶️', label: 'YouTube', cssClass: 'proof-badge--youtube', canView: true };
    }
    if (proof.includes('drive.google')) {
      return { icon: '📁', label: 'Drive', cssClass: 'proof-badge--link', canView: true };
    }
    return { icon: '🔗', label: 'Link', cssClass: 'proof-badge--link', canView: true };
  }
  
  // No proof
  return { icon: '⚠️', label: 'No proof', cssClass: 'proof-badge--none', canView: false };
}

function formatDate(dateStr) {
  // Parse date string as local date
  const parts = dateStr.split('-');
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getSortedParticipants() {
  return [...state.participants].sort((a, b) => calculatePoints(b.logs || []) - calculatePoints(a.logs || []));
}

function navigateTo(view, participantId = null) {
  state.currentView = view;
  state.selectedParticipant = participantId ? state.participants.find(p => p.id === participantId) : null;
  state.proofModal = null;
  render();
}

async function createCompetition(name, durationDays) {
  state.competition = {
    name,
    durationDays: parseInt(durationDays),
    startDate: getLocalDateString(),
    createdAt: new Date().toISOString()
  };
  await saveData();
  render();
}

async function addParticipant(name, avatar) {
  const newParticipant = {
    id: Date.now(),
    name,
    avatar: avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
    joinDate: getLocalDateString(),
    logs: []
  };
  state.participants.push(newParticipant);
  await saveData();
  render();
}

async function deleteParticipant(id) {
  if (confirm('Are you sure you want to delete this participant?')) {
    state.participants = state.participants.filter(p => p.id !== id);
    await saveData();
    render();
  }
}

async function uploadProofFile(participantId, date) {
  console.log('uploadProofFile called:', participantId, date);
  const result = await window.electronAPI.uploadProof(participantId, date);
  console.log('uploadProof result:', result);
  if (result && result.success) {
    return { type: result.fileType, path: result.filePath, fileName: result.fileName };
  }
  return null;
}

async function logActivity(participantId, logData) {
  console.log('logActivity called:', participantId, logData);
  const participant = state.participants.find(p => p.id === participantId);
  if (!participant) return;
  const existingIndex = participant.logs.findIndex(l => l.date === logData.date);
  if (existingIndex >= 0) {
    participant.logs[existingIndex] = { ...participant.logs[existingIndex], ...logData };
  } else {
    participant.logs.push(logData);
  }
  console.log('Updated participant logs:', participant.logs);
  await saveData();
  render();
}

function showProofModal(participantName, date, proof, proofPath) {
  console.log('showProofModal called:', { participantName, date, proof, proofPath });
  state.proofModal = { participantName, date, proof, proofPath };
  render();
  
  // Load image after render with a delay
  if (proofPath && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(proofPath)) {
    console.log('Will load image:', proofPath);
    setTimeout(() => {
      loadProofImage(proofPath);
    }, 100);
  }
}

async function loadProofImage(filePath) {
  console.log('loadProofImage called:', filePath);
  try {
    const result = await window.electronAPI.getProofFile(filePath);
    console.log('getProofFile result:', result);
    if (result && result.success && result.type === 'image') {
      const img = document.getElementById('proof-image');
      console.log('Found img element:', img);
      if (img) {
        img.src = result.data;
        console.log('Image src set');
      }
    }
  } catch (err) {
    console.error('Error loading image:', err);
  }
}

function closeProofModal() {
  state.proofModal = null;
  render();
}

async function openProofFile(filePath) {
  await window.electronAPI.openProofFile(filePath);
}

async function resetCompetition() {
  if (confirm('Are you sure you want to reset the entire competition? All data will be lost!')) {
    state.competition = null;
    state.participants = [];
    state.currentView = 'dashboard';
    state.selectedParticipant = null;
    await saveData();
    render();
  }
}

function render() {
  const app = document.getElementById('app');
  if (!state.competition) {
    app.innerHTML = renderSetupScreen();
  } else {
    app.innerHTML = `
      ${renderHeader()}
      ${renderNav()}
      <main class="main">${renderCurrentView()}</main>
      ${renderFooter()}
      ${state.proofModal ? renderProofModal() : ''}
    `;
  }
  attachEventListeners();
}

function renderProofModal() {
  const { participantName, date, proof, proofPath } = state.proofModal;
  
  console.log('renderProofModal:', { proof, proofPath });
  
  // Determine what type of proof we have
  const isImageFile = proofPath && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(proofPath);
  const isVideoFile = proofPath && /\.(mp4|mov|avi|mkv|webm)$/i.test(proofPath);
  const isUrl = proof && typeof proof === 'string' && proof.startsWith('http');
  const isYoutube = isUrl && (proof.includes('youtube') || proof.includes('youtu.be'));
  const isGoogleDrive = isUrl && proof.includes('drive.google');

  let content = '';
  
  if (isImageFile) {
    content = `
      <div class="proof-preview proof-preview--image">
        <img src="" alt="Loading..." id="proof-image" class="proof-image" style="max-width:100%;max-height:500px;border-radius:8px;" />
        <p class="text-muted mt-md" style="font-size:12px;">Right-click image to save</p>
      </div>
    `;
  } else if (isVideoFile) {
    content = `
      <div class="proof-preview">
        <div class="video-placeholder">
          <span style="font-size:48px;">🎥</span>
          <p>Video file</p>
          <p class="text-muted" style="font-size:12px;margin-top:8px;">Click below to open in your default video player</p>
        </div>
      </div>
      <button class="btn btn--primary btn--full mt-lg open-file-btn" data-filepath="${proofPath}">Open Video</button>
    `;
  } else if (isUrl) {
    content = `
      <div class="proof-preview">
        <div class="link-placeholder">
          <span style="font-size:48px;">${isYoutube ? '▶️' : isGoogleDrive ? '📁' : '🔗'}</span>
          <p style="font-weight:600;margin-top:12px;">${isYoutube ? 'YouTube Video' : isGoogleDrive ? 'Google Drive File' : 'External Link'}</p>
          <p class="text-muted" style="word-break:break-all;font-size:12px;margin-top:8px;">${proof}</p>
        </div>
      </div>
      <button class="btn btn--primary btn--full mt-lg" id="open-external-link" data-url="${proof}">Open in Browser</button>
    `;
  } else {
    content = `
      <div class="proof-preview">
        <div class="no-proof-placeholder">
          <span style="font-size:48px;">⚠️</span>
          <p>No proof available</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="modal-overlay" id="proof-modal-overlay">
      <div class="modal ${isImageFile ? 'modal--large' : ''}">
        <div class="modal__header">
          <h3 class="modal__title">Proof - ${participantName}</h3>
          <button class="modal__close" id="close-modal">&times;</button>
        </div>
        <div class="modal__content">
          <p class="text-muted mb-lg">Date: ${formatDate(date)}</p>
          ${content}
        </div>
      </div>
    </div>
  `;
}

function renderSetupScreen() {
  return `
    <div class="setup-screen">
      <div class="card setup-card">
        <div class="card__content--lg">
          <div class="setup-card__icon">🏆</div>
          <h1 class="setup-card__title">FITNESS CHALLENGE</h1>
          <p class="setup-card__subtitle">Create your competition to get started</p>
          <div class="form-group">
            <label class="form-label">Competition Name</label>
            <input type="text" id="competition-name" class="input-field" placeholder="e.g., Summer Fitness Challenge" value="Fitness Challenge">
          </div>
          <div class="form-group">
            <label class="form-label">Duration (Days)</label>
            <input type="number" id="competition-duration" class="input-field" placeholder="e.g., 90" value="90" min="1" max="365">
          </div>
          <button id="create-competition-btn" class="btn btn--primary btn--full">Start Competition</button>
        </div>
      </div>
    </div>
  `;
}

function renderHeader() {
  const progress = getCompetitionProgress();
  return `
    <header class="header">
      <div>
        <h1 class="header__title">${state.competition.name.toUpperCase()}</h1>
        <p class="header__subtitle">DAY ${progress.day} OF ${state.competition.durationDays} • ${progress.daysLeft} DAYS LEFT</p>
      </div>
      <div class="header__info">
        <div class="header__stat-box"><span class="header__stat-label">PARTICIPANTS</span><span class="header__stat-value">${state.participants.length}</span></div>
        <div class="header__stat-box"><span class="header__stat-label">PROGRESS</span><span class="header__stat-value">${progress.percent}%</span></div>
      </div>
    </header>
  `;
}

function renderNav() {
  const views = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'participants', icon: '👥', label: 'Participants' },
    { id: 'log', icon: '✍️', label: 'Log Activity' },
    { id: 'scoreboard', icon: '🏆', label: 'Scoreboard' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];
  return `<nav class="nav">${views.map(v => `<button class="nav__btn ${state.currentView === v.id ? 'nav__btn--active' : ''}" data-view="${v.id}">${v.icon} ${v.label}</button>`).join('')}</nav>`;
}

function renderCurrentView() {
  switch (state.currentView) {
    case 'dashboard': return renderDashboard();
    case 'participants': return renderParticipants();
    case 'log': return renderActivityLog();
    case 'scoreboard': return state.selectedParticipant ? renderParticipantDetail() : renderScoreboard();
    case 'settings': return renderSettings();
    default: return renderDashboard();
  }
}

function renderFooter() {
  return `<footer class="footer">${state.competition.name} • Data saved locally • Made by Osama</footer>`;
}

function renderDashboard() {
  const sorted = getSortedParticipants();
  const progress = getCompetitionProgress();

  return `
    <div class="fade-in">
      <h2 class="section-title mb-2xl">Competition Overview</h2>
      <div class="card mb-2xl">
        <div class="card__content">
          <div class="flex justify-between items-center mb-md">
            <span class="text-muted">Challenge Progress</span>
            <span style="font-family:var(--font-display);font-size:20px;color:var(--color-primary);">Day ${progress.day} / ${state.competition.durationDays}</span>
          </div>
          <div class="progress-bar"><div class="progress-bar__fill" style="width:${progress.percent}%"></div></div>
        </div>
      </div>
      <h3 class="section-subtitle">🔥 Current Leaders</h3>
      ${sorted.length > 0 ? `
        <div class="leaders-grid">
          ${sorted.slice(0, 3).map((p, i) => {
            const stats = calculateStats(p);
            return `<div class="card leader-card"><div class="rank-badge rank-badge--${i + 1}">${i + 1}</div><div class="leader-card__avatar">${p.avatar}</div><div class="leader-card__name">${p.name}</div><div class="leader-card__points">${stats.totalPoints}</div><div class="leader-card__label">Points</div></div>`;
          }).join('')}
        </div>
      ` : `
        <div class="card"><div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__title">No Participants Yet</div><div class="empty-state__text">Add participants to start tracking</div><button class="btn btn--primary" data-view="participants">Add Participants</button></div></div>
      `}
    </div>
  `;
}

function renderParticipants() {
  return `
    <div class="fade-in">
      <div class="section-header">
        <h2 class="section-title">Manage Participants</h2>
        <button class="btn btn--primary" id="show-add-participant">+ Add Participant</button>
      </div>
      <div id="add-participant-form" class="card mb-2xl" style="display:none;">
        <div class="card__content">
          <h3 style="font-weight:600;font-size:16px;margin-bottom:16px;">Add New Participant</h3>
          <div class="form-group">
            <label class="form-label">Select Avatar</label>
            <div class="avatar-picker">${AVATARS.map((a, i) => `<button type="button" class="avatar-btn ${i === 0 ? 'avatar-btn--selected' : ''}" data-avatar="${a}">${a}</button>`).join('')}</div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:2;"><label class="form-label">Participant Name</label><input type="text" id="new-participant-name" class="input-field" placeholder="Enter name..."></div>
            <div class="form-group" style="flex:1;display:flex;align-items:flex-end;gap:8px;"><button class="btn btn--primary" id="add-participant-btn">Add</button><button class="btn btn--secondary" id="cancel-add-participant">Cancel</button></div>
          </div>
        </div>
      </div>
      ${state.participants.length > 0 ? `
        <div class="participants-grid">
          ${state.participants.map(p => {
            const stats = calculateStats(p);
            return `
              <div class="card participant-card">
                <div class="participant-card__header">
                  <div class="participant-card__avatar">${p.avatar}</div>
                  <div class="participant-card__info"><div class="participant-card__name">${p.name}</div><div class="participant-card__date">Joined: ${formatDate(p.joinDate)}</div></div>
                  <div class="participant-card__score"><div class="participant-card__points">${stats.totalPoints}</div><div class="participant-card__points-label">Points</div></div>
                </div>
                <div class="participant-card__stats">
                  <div><div class="participant-stat__icon">🎯</div><div class="participant-stat__value">${stats.workoutDays}</div><div class="participant-stat__label">Workouts</div></div>
                  <div><div class="participant-stat__icon">⏱️</div><div class="participant-stat__value">${stats.avgMinutes}m</div><div class="participant-stat__label">Avg Time</div></div>
                  <div><div class="participant-stat__icon">💧</div><div class="participant-stat__value">${stats.waterDays}</div><div class="participant-stat__label">Hydration</div></div>
                  <div><div class="participant-stat__icon">🔥</div><div class="participant-stat__value">${stats.streakDays}</div><div class="participant-stat__label">Streak</div></div>
                </div>
                <div class="flex justify-between mt-lg">
                  <button class="btn btn--secondary btn--sm" data-view="scoreboard" data-participant="${p.id}">View Details</button>
                  <button class="btn btn--danger btn--sm" data-delete-participant="${p.id}">Delete</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `<div class="card"><div class="empty-state"><div class="empty-state__icon">👥</div><div class="empty-state__title">No Participants</div><div class="empty-state__text">Click "Add Participant" to add your first competitor</div></div></div>`}
    </div>
  `;
}

function renderActivityLog() {
  const today = getLocalDateString();
  if (state.participants.length === 0) {
    return `<div class="fade-in"><h2 class="section-title mb-2xl">Log Daily Activity</h2><div class="card"><div class="empty-state"><div class="empty-state__icon">📝</div><div class="empty-state__title">No Participants</div><div class="empty-state__text">Add participants first</div><button class="btn btn--primary" data-view="participants">Add Participants</button></div></div></div>`;
  }
  return `
    <div class="fade-in">
      <h2 class="section-title mb-2xl">Log Daily Activity</h2>
      <div class="card max-w-form">
        <div class="card__content--lg">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Select Participant</label><select id="log-participant" class="input-field"><option value="">Choose a participant...</option>${state.participants.map(p => `<option value="${p.id}">${p.avatar} ${p.name}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Date</label><input type="date" id="log-date" class="input-field" value="${today}"></div>
          </div>
          <div class="goal-box goal-box--primary">
            <div class="goal-box__title goal-box__title--primary">🎯 Daily Workout — 1 Point</div>
            <div class="checkbox-wrapper"><input type="checkbox" class="checkbox-custom" id="log-completed"><label for="log-completed" class="checkbox-label">Completed workout today</label></div>
            <div id="workout-details" style="display:none;margin-top:16px;">
              <div class="form-group"><label class="form-label">Duration (Minutes)</label><input type="number" id="log-duration" class="input-field" placeholder="e.g., 30" min="1" value="30"></div>
              <div class="form-group">
                <label class="form-label">Proof of Activity</label>
                <div style="margin-bottom:8px;"><button type="button" class="btn btn--secondary" id="upload-proof-btn">📁 Upload File</button><span class="text-muted" style="margin-left:8px;">or paste link below</span></div>
                <input type="url" id="log-proof-url" class="input-field" placeholder="Paste YouTube or other link...">
                <div id="upload-status" class="mt-md" style="display:none;"></div>
              </div>
              <div id="no-proof-warning" class="alert alert--warning">⚠️ No proof - entry will be marked unverified</div>
            </div>
          </div>
          <div class="goal-box goal-box--bonus">
            <div class="goal-box__title goal-box__title--bonus">⭐ Bonus Goals</div>
            <div class="checkbox-wrapper"><input type="checkbox" class="checkbox-custom" id="log-water"><label for="log-water" class="checkbox-label">💧 Drank 2L of water — <span class="bonus-point">+1 Point</span></label></div>
            <div class="checkbox-wrapper"><input type="checkbox" class="checkbox-custom" id="log-friend"><label for="log-friend" class="checkbox-label">👫 Walked with a friend — <span class="bonus-point bonus-point--purple">+1 Point</span></label></div>
          </div>
          <div class="goal-box" style="background:rgba(255,255,255,0.02);border:1px solid var(--border-light);">
            <div class="goal-box__title" style="color:var(--text-secondary);">📊 Optional Tracking</div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Steps Today</label><input type="number" id="log-steps" class="input-field" placeholder="e.g., 10000" min="0"></div>
              <div class="form-group"><label class="form-label">Distance (km)</label><input type="number" id="log-distance" class="input-field" placeholder="e.g., 5.5" min="0" step="0.1"></div>
              <div class="form-group"><label class="form-label">Weight</label><input type="number" id="log-weight" class="input-field" placeholder="e.g., 70" min="0" step="0.1"></div>
            </div>
            <p class="text-muted" style="font-size:12px;">These fields are optional for personal tracking.</p>
          </div>
          <div class="points-preview"><span class="points-preview__label">Points for this entry:</span><span class="points-preview__value" id="points-preview">0</span></div>
          <button id="submit-log-btn" class="btn btn--primary btn--full" disabled>Log Activity</button>
        </div>
      </div>
    </div>
  `;
}

function renderScoreboard() {
  const sorted = getSortedParticipants();
  if (sorted.length === 0) {
    return `<div class="fade-in"><h2 class="section-title mb-2xl">🏆 Competition Scoreboard</h2><div class="card"><div class="empty-state"><div class="empty-state__icon">🏆</div><div class="empty-state__title">No Participants</div><div class="empty-state__text">Add participants to see the scoreboard</div><button class="btn btn--primary" data-view="participants">Add Participants</button></div></div></div>`;
  }
  return `
    <div class="fade-in">
      <h2 class="section-title mb-2xl">🏆 Competition Scoreboard</h2>
      <div class="card table-wrapper">
        <table class="table">
          <thead class="table__head">
            <tr>
              <th class="table__th">Rank</th>
              <th class="table__th">Participant</th>
              <th class="table__th table__th--center">🎯</th>
              <th class="table__th table__th--center">⏱️</th>
              <th class="table__th table__th--center">💧</th>
              <th class="table__th table__th--center">👫</th>
              <th class="table__th table__th--center">📷</th>
              <th class="table__th table__th--center">⭐</th>
              <th class="table__th table__th--center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((p, i) => {
              const stats = calculateStats(p);
              const rank = i + 1;
              const rankClass = rank <= 3 ? `rank-badge--${rank}` : 'rank-badge--other';
              return `
                <tr class="table__row">
                  <td class="table__td"><div class="rank-badge ${rankClass}">${rank}</div></td>
                  <td class="table__td">
                    <div class="scoreboard-participant">
                      <span class="scoreboard-participant__avatar">${p.avatar}</span>
                      <div><div class="scoreboard-participant__name">${p.name}</div>${stats.streakDays > 0 ? `<div class="scoreboard-participant__streak">🔥 ${stats.streakDays} day streak</div>` : ''}</div>
                    </div>
                  </td>
                  <td class="table__td table__td--center" style="font-weight:600;">${stats.workoutDays}</td>
                  <td class="table__td table__td--center" style="font-weight:600;">${stats.avgMinutes}m</td>
                  <td class="table__td table__td--center" style="font-weight:600;">${stats.waterDays}</td>
                  <td class="table__td table__td--center" style="font-weight:600;">${stats.friendWalks}</td>
                  <td class="table__td table__td--center"><span style="color:${stats.noProofDays > 0 ? 'var(--color-accent-red)' : 'var(--color-primary)'};">${stats.proofUploads}/${stats.workoutDays}</span>${stats.noProofDays > 0 ? ' ⚠️' : ''}</td>
                  <td class="table__td table__td--center"><span class="scoreboard-points">${stats.totalPoints}</span></td>
                  <td class="table__td table__td--center"><button class="btn btn--secondary btn--sm" data-view="scoreboard" data-participant="${p.id}">Details</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderParticipantDetail() {
  const p = state.selectedParticipant;
  const stats = calculateStats(p);
  const sortedLogs = [...(p.logs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const hasOptionalData = stats.totalSteps > 0 || parseFloat(stats.totalDistance) > 0 || stats.latestWeight;

  return `
    <div class="fade-in">
      <button class="btn btn--secondary mb-2xl" data-view="scoreboard">← Back to Scoreboard</button>
      <div class="card mb-2xl">
        <div class="card__content--lg">
          <div class="detail-header">
            <div class="detail-header__avatar">${p.avatar}</div>
            <div class="detail-header__info"><h2 class="detail-header__name">${p.name}</h2><p class="detail-header__joined">Joined: ${formatDate(p.joinDate)}</p></div>
            <div class="detail-header__score"><div class="detail-header__points">${stats.totalPoints}</div><div class="detail-header__points-label">Total Points</div></div>
          </div>
          <div class="stats-grid stats-grid--5">
            <div class="stat-card"><div class="stat-card__icon stat-card__icon--sm">🎯</div><div class="stat-card__value stat-card__value--sm">${stats.workoutDays}</div><div class="stat-card__label">Workouts</div></div>
            <div class="stat-card"><div class="stat-card__icon stat-card__icon--sm">⏱️</div><div class="stat-card__value stat-card__value--sm">${stats.totalMinutes}m</div><div class="stat-card__label">Total Time</div></div>
            <div class="stat-card"><div class="stat-card__icon stat-card__icon--sm">💧</div><div class="stat-card__value stat-card__value--sm">${stats.waterDays}</div><div class="stat-card__label">Hydration</div></div>
            <div class="stat-card"><div class="stat-card__icon stat-card__icon--sm">🔥</div><div class="stat-card__value stat-card__value--sm">${stats.streakDays}</div><div class="stat-card__label">Streak</div></div>
            <div class="stat-card ${stats.noProofDays > 0 ? 'stat-card--warning' : 'stat-card--success'}"><div class="stat-card__icon stat-card__icon--sm">${stats.noProofDays > 0 ? '⚠️' : '✅'}</div><div class="stat-card__value stat-card__value--sm ${stats.noProofDays > 0 ? 'stat-card__value--red' : ''}">${stats.noProofDays}</div><div class="stat-card__label">No Proof</div></div>
          </div>
          ${hasOptionalData ? `
            <h4 style="font-size:14px;color:var(--text-muted);margin:24px 0 16px;text-transform:uppercase;letter-spacing:1px;">Additional Stats</h4>
            <div class="stats-grid stats-grid--3">
              ${stats.totalSteps > 0 ? `<div class="stat-card"><div class="stat-card__icon stat-card__icon--sm">👟</div><div class="stat-card__value stat-card__value--sm">${formatNumber(stats.totalSteps)}</div><div class="stat-card__label">Total Steps</div></div>` : ''}
              ${parseFloat(stats.totalDistance) > 0 ? `<div class="stat-card"><div class="stat-card__icon stat-card__icon--sm">📏</div><div class="stat-card__value stat-card__value--sm">${stats.totalDistance} km</div><div class="stat-card__label">Total Distance</div></div>` : ''}
              ${stats.latestWeight ? `<div class="stat-card"><div class="stat-card__icon stat-card__icon--sm">⚖️</div><div class="stat-card__value stat-card__value--sm">${stats.latestWeight}</div><div class="stat-card__label">Weight ${stats.weightChange ? `(${stats.weightChange > 0 ? '+' : ''}${stats.weightChange})` : ''}</div></div>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
      <h3 class="section-subtitle">Activity History</h3>
      <div class="card table-wrapper">
        <table class="table">
          <thead class="table__head">
            <tr><th class="table__th">Date</th><th class="table__th table__th--center">Workout</th><th class="table__th table__th--center">Duration</th><th class="table__th table__th--center">Proof</th><th class="table__th table__th--center">💧</th><th class="table__th table__th--center">👫</th><th class="table__th table__th--center">Steps</th><th class="table__th table__th--center">Dist</th><th class="table__th table__th--center">Weight</th><th class="table__th table__th--center">Pts</th></tr>
          </thead>
          <tbody>
            ${sortedLogs.length > 0 ? sortedLogs.map(log => {
              const proofInfo = getProofInfo(log);
              const dayPoints = (log.completed ? 1 : 0) + (log.water ? 1 : 0) + (log.walkWithFriend ? 1 : 0);
              return `
                <tr class="table__row">
                  <td class="table__td"><span class="log-date">${formatDate(log.date)}</span></td>
                  <td class="table__td table__td--center">${log.completed ? '<span class="scoreboard-check">✓</span>' : '<span class="scoreboard-dash">—</span>'}</td>
                  <td class="table__td table__td--center">${log.completed ? `${log.duration || 0}m` : '—'}</td>
                  <td class="table__td table__td--center">${log.completed ? `<div class="proof-indicator"><span class="proof-indicator__icon">${proofInfo.icon}</span><span class="proof-badge ${proofInfo.cssClass}">${proofInfo.label}</span>${proofInfo.canView ? `<button class="btn btn--sm view-proof-btn" style="margin-left:4px;padding:2px 6px;font-size:10px;" data-participant-id="${p.id}" data-log-date="${log.date}">View</button>` : ''}</div>` : '—'}</td>
                  <td class="table__td table__td--center">${log.water ? '💧' : '—'}</td>
                  <td class="table__td table__td--center">${log.walkWithFriend ? '👫' : '—'}</td>
                  <td class="table__td table__td--center">${log.steps ? formatNumber(log.steps) : '—'}</td>
                  <td class="table__td table__td--center">${log.distance ? `${log.distance}km` : '—'}</td>
                  <td class="table__td table__td--center">${log.weight || '—'}</td>
                  <td class="table__td table__td--center"><span class="log-points ${dayPoints > 0 ? 'log-points--positive' : 'log-points--zero'}">+${dayPoints}</span></td>
                </tr>
              `;
            }).join('') : '<tr><td colspan="10" class="empty-state">No activity logged yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="fade-in">
      <h2 class="section-title mb-2xl">Settings</h2>
      <div class="card mb-2xl max-w-form">
        <div class="card__content">
          <h3 style="font-weight:600;font-size:16px;margin-bottom:16px;">Competition Info</h3>
          <div class="form-group"><label class="form-label">Competition Name</label><div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;color:var(--text-secondary);">${state.competition.name}</div></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">Duration</label><div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;color:var(--text-secondary);">${state.competition.durationDays} days</div></div>
            <div class="form-group"><label class="form-label">Start Date</label><div style="padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;color:var(--text-secondary);">${formatDate(state.competition.startDate)}</div></div>
          </div>
        </div>
      </div>
      <div class="card mb-2xl max-w-form">
        <div class="card__content">
          <h3 style="font-weight:600;font-size:16px;margin-bottom:16px;">Data Management</h3>
          <p class="text-muted mb-lg">Your data is automatically saved to your computer.</p>
          <div class="alert alert--info mb-lg">📁 Data persists between sessions</div>
        </div>
      </div>
      <div class="card max-w-form">
        <div class="card__content">
          <h3 style="font-weight:600;font-size:16px;margin-bottom:16px;color:var(--color-accent-red);">Danger Zone</h3>
          <p class="text-muted mb-lg">This will permanently delete all data.</p>
          <button class="btn btn--danger" id="reset-competition-btn">Reset Competition</button>
        </div>
      </div>
    </div>
  `;
}

function attachEventListeners() {
  // Navigation
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      const participantId = e.currentTarget.dataset.participant;
      navigateTo(view, participantId ? parseInt(participantId) : null);
    });
  });

  // Create competition
  const createBtn = document.getElementById('create-competition-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const name = document.getElementById('competition-name').value.trim();
      const duration = document.getElementById('competition-duration').value;
      if (name && duration) createCompetition(name, duration);
    });
  }

  // Add participant form toggle
  const showAddBtn = document.getElementById('show-add-participant');
  const addForm = document.getElementById('add-participant-form');
  const cancelAddBtn = document.getElementById('cancel-add-participant');
  if (showAddBtn && addForm) {
    showAddBtn.addEventListener('click', () => { addForm.style.display = 'block'; showAddBtn.style.display = 'none'; });
  }
  if (cancelAddBtn && addForm && showAddBtn) {
    cancelAddBtn.addEventListener('click', () => { addForm.style.display = 'none'; showAddBtn.style.display = 'inline-flex'; });
  }

  // Avatar picker
  let selectedAvatar = AVATARS[0];
  document.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('avatar-btn--selected'));
      e.currentTarget.classList.add('avatar-btn--selected');
      selectedAvatar = e.currentTarget.dataset.avatar;
    });
  });

  // Add participant
  const addParticipantBtn = document.getElementById('add-participant-btn');
  if (addParticipantBtn) {
    addParticipantBtn.addEventListener('click', () => {
      const name = document.getElementById('new-participant-name').value.trim();
      if (name) addParticipant(name, selectedAvatar);
    });
  }
  const newParticipantInput = document.getElementById('new-participant-name');
  if (newParticipantInput) {
    newParticipantInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const name = newParticipantInput.value.trim();
        if (name) addParticipant(name, selectedAvatar);
      }
    });
  }

  // Delete participant
  document.querySelectorAll('[data-delete-participant]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      deleteParticipant(parseInt(e.currentTarget.dataset.deleteParticipant));
    });
  });

  // Activity log form elements
  const logCompleted = document.getElementById('log-completed');
  const workoutDetails = document.getElementById('workout-details');
  const logParticipant = document.getElementById('log-participant');
  const submitLogBtn = document.getElementById('submit-log-btn');
  const uploadProofBtn = document.getElementById('upload-proof-btn');
  const logProofUrl = document.getElementById('log-proof-url');
  const noProofWarning = document.getElementById('no-proof-warning');
  const uploadStatus = document.getElementById('upload-status');

  currentUploadedProof = null;

  if (logCompleted && workoutDetails) {
    logCompleted.addEventListener('change', () => {
      workoutDetails.style.display = logCompleted.checked ? 'block' : 'none';
      updatePointsPreview();
      updateProofWarning();
    });
  }

  if (uploadProofBtn) {
    uploadProofBtn.addEventListener('click', async () => {
      const participantId = document.getElementById('log-participant').value;
      const date = document.getElementById('log-date').value;
      if (!participantId) { alert('Please select a participant first'); return; }
      const result = await uploadProofFile(parseInt(participantId), date);
      console.log('Upload result in UI:', result);
      if (result) {
        currentUploadedProof = result;
        if (uploadStatus) {
          uploadStatus.style.display = 'block';
          uploadStatus.innerHTML = '<span style="color:var(--color-primary);">✓ ' + (result.type === 'video' ? 'Video' : 'Photo') + ' uploaded: ' + result.fileName + '</span>';
        }
        if (logProofUrl) logProofUrl.value = '';
        updateProofWarning();
      }
    });
  }

  if (logProofUrl) {
    logProofUrl.addEventListener('input', () => {
      if (logProofUrl.value.trim()) {
        currentUploadedProof = null;
        if (uploadStatus) { uploadStatus.style.display = 'none'; uploadStatus.innerHTML = ''; }
      }
      updateProofWarning();
    });
  }

  function updateProofWarning() {
    if (!noProofWarning) return;
    const hasUpload = currentUploadedProof !== null;
    const hasUrl = logProofUrl && logProofUrl.value.trim().length > 0;
    noProofWarning.style.display = (hasUpload || hasUrl) ? 'none' : 'block';
  }

  if (logParticipant && submitLogBtn) {
    logParticipant.addEventListener('change', () => {
      submitLogBtn.disabled = !logParticipant.value;
      currentUploadedProof = null;
      if (uploadStatus) { uploadStatus.style.display = 'none'; uploadStatus.innerHTML = ''; }
    });
  }

  ['log-completed', 'log-water', 'log-friend'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updatePointsPreview);
  });

  if (submitLogBtn) {
    submitLogBtn.addEventListener('click', async () => {
      const participantId = parseInt(document.getElementById('log-participant').value);
      const date = document.getElementById('log-date').value;
      const completed = document.getElementById('log-completed').checked;
      const duration = parseInt(document.getElementById('log-duration')?.value) || 0;
      const proofUrl = document.getElementById('log-proof-url')?.value?.trim() || '';
      const water = document.getElementById('log-water').checked;
      const walkWithFriend = document.getElementById('log-friend').checked;
      const steps = parseInt(document.getElementById('log-steps')?.value) || 0;
      const distance = parseFloat(document.getElementById('log-distance')?.value) || 0;
      const weight = parseFloat(document.getElementById('log-weight')?.value) || 0;

      let proof = null, proofPath = null;
      if (currentUploadedProof) { 
        proof = currentUploadedProof.type; 
        proofPath = currentUploadedProof.path; 
        console.log('Setting proof from upload:', { proof, proofPath });
      } else if (proofUrl) { 
        proof = proofUrl; 
        console.log('Setting proof from URL:', proof);
      }

      const logData = {
        date, completed, duration: completed ? duration : 0, proof, proofPath, water, walkWithFriend,
        steps: steps || undefined, distance: distance || undefined, weight: weight || undefined
      };
      console.log('Submitting log data:', logData);

      await logActivity(participantId, logData);

      // Reset form
      currentUploadedProof = null;
      document.getElementById('log-completed').checked = false;
      document.getElementById('log-water').checked = false;
      document.getElementById('log-friend').checked = false;
      if (document.getElementById('log-proof-url')) document.getElementById('log-proof-url').value = '';
      if (document.getElementById('log-steps')) document.getElementById('log-steps').value = '';
      if (document.getElementById('log-distance')) document.getElementById('log-distance').value = '';
      if (document.getElementById('log-weight')) document.getElementById('log-weight').value = '';
      if (workoutDetails) workoutDetails.style.display = 'none';
      if (uploadStatus) { uploadStatus.style.display = 'none'; uploadStatus.innerHTML = ''; }
      updatePointsPreview();
      alert('Activity logged successfully!');
    });
  }

  // View proof buttons - find the log and get proof data from it
  document.querySelectorAll('.view-proof-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const participantId = parseInt(e.currentTarget.dataset.participantId);
      const logDate = e.currentTarget.dataset.logDate;
      
      console.log('View proof clicked:', { participantId, logDate });
      
      const participant = state.participants.find(p => p.id === participantId);
      if (participant) {
        const log = participant.logs.find(l => l.date === logDate);
        console.log('Found log:', log);
        if (log) {
          showProofModal(participant.name, log.date, log.proof, log.proofPath);
        }
      }
    });
  });

  // Close modal
  const closeModalBtn = document.getElementById('close-modal');
  const modalOverlay = document.getElementById('proof-modal-overlay');
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeProofModal);
  if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeProofModal(); });

  // Open file buttons (for videos in modal)
  document.querySelectorAll('.open-file-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filePath = e.currentTarget.dataset.filepath;
      console.log('Opening file:', filePath);
      openProofFile(filePath);
    });
  });

  // Open external link button
  const openExternalLinkBtn = document.getElementById('open-external-link');
  if (openExternalLinkBtn) {
    openExternalLinkBtn.addEventListener('click', (e) => {
      const url = e.currentTarget.dataset.url;
      console.log('Opening external URL:', url);
      if (url) {
        window.electronAPI.openExternalLink(url);
      }
    });
  }

  // Reset competition
  const resetBtn = document.getElementById('reset-competition-btn');
  if (resetBtn) resetBtn.addEventListener('click', resetCompetition);
}

function updatePointsPreview() {
  const preview = document.getElementById('points-preview');
  if (!preview) return;
  let points = 0;
  if (document.getElementById('log-completed')?.checked) points += 1;
  if (document.getElementById('log-water')?.checked) points += 1;
  if (document.getElementById('log-friend')?.checked) points += 1;
  preview.textContent = points;
}

// Start the app
init();
