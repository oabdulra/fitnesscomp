// Fitness Competition Tracker - Electron App
// All application logic in vanilla JavaScript

const AVATARS = ['🏃‍♀️', '🏃', '💪', '🧘‍♀️', '🧘', '🚴‍♀️', '🚴', '🏋️‍♀️', '🏋️', '⛹️‍♀️', '⛹️', '🤸‍♀️', '🏊‍♀️', '🏊', '🧗‍♀️', '🧗'];

// App State
let state = {
  competition: null,
  participants: [],
  currentView: 'dashboard',
  selectedParticipant: null
};

// Initialize app
async function init() {
  await loadData();
  render();
}

// Load data from file
async function loadData() {
  try {
    const data = await window.electronAPI.loadData();
    state.competition = data.competition;
    state.participants = data.participants || [];
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Save data to file
async function saveData() {
  try {
    await window.electronAPI.saveData({
      competition: state.competition,
      participants: state.participants
    });
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Calculate points for a participant
function calculatePoints(logs) {
  let total = 0;
  logs.forEach(log => {
    if (log.completed) total += 1;
    if (log.water) total += 1;
    if (log.walkWithFriend) total += 1;
  });
  return total;
}

// Calculate detailed stats
function calculateStats(participant) {
  const logs = participant.logs || [];
  const workoutDays = logs.filter(l => l.completed).length;
  const totalMinutes = logs.reduce((acc, l) => acc + (l.duration || 0), 0);
  const waterDays = logs.filter(l => l.water).length;
  const friendWalks = logs.filter(l => l.walkWithFriend).length;
  const proofUploads = logs.filter(l => l.proof).length;
  const noProofDays = logs.filter(l => l.completed && !l.proof).length;

  return {
    totalPoints: calculatePoints(logs),
    workoutDays,
    totalMinutes,
    avgMinutes: workoutDays > 0 ? Math.round(totalMinutes / workoutDays) : 0,
    waterDays,
    friendWalks,
    proofUploads,
    noProofDays,
    streakDays: calculateStreak(logs)
  };
}

// Calculate workout streak
function calculateStreak(logs) {
  if (!logs || logs.length === 0) return 0;
  const sortedLogs = [...logs].filter(l => l.completed).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sortedLogs.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedLogs.length; i++) {
    const logDate = new Date(sortedLogs[i].date);
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

// Get competition progress
function getCompetitionProgress() {
  if (!state.competition) return { day: 0, percent: 0, daysLeft: 0 };
  const start = new Date(state.competition.startDate);
  const today = new Date();
  const daysPassed = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
  const percent = Math.min(100, Math.round((daysPassed / state.competition.durationDays) * 100));
  const daysLeft = Math.max(0, state.competition.durationDays - daysPassed);
  return { day: Math.min(daysPassed, state.competition.durationDays), percent, daysLeft };
}

// Get proof info
function getProofInfo(proof) {
  if (!proof) return { icon: '⚠️', label: 'No proof', cssClass: 'proof-badge--none' };
  if (proof === 'photo') return { icon: '📷', label: 'Photo', cssClass: 'proof-badge--photo' };
  if (proof === 'video') return { icon: '🎥', label: 'Video', cssClass: 'proof-badge--video' };
  if (proof.includes && (proof.includes('youtube') || proof.includes('youtu.be'))) return { icon: '▶️', label: 'YouTube', cssClass: 'proof-badge--youtube' };
  return { icon: '🔗', label: 'Link', cssClass: 'proof-badge--link' };
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Get sorted participants by points
function getSortedParticipants() {
  return [...state.participants].sort((a, b) => calculatePoints(b.logs || []) - calculatePoints(a.logs || []));
}

// Navigate to view
function navigateTo(view, participantId = null) {
  state.currentView = view;
  state.selectedParticipant = participantId ? state.participants.find(p => p.id === participantId) : null;
  render();
}

// Create competition
async function createCompetition(name, durationDays) {
  state.competition = {
    name,
    durationDays: parseInt(durationDays),
    startDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  await saveData();
  render();
}

// Add participant
async function addParticipant(name, avatar) {
  const newParticipant = {
    id: Date.now(),
    name,
    avatar: avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
    joinDate: new Date().toISOString().split('T')[0],
    logs: []
  };
  state.participants.push(newParticipant);
  await saveData();
  render();
}

// Delete participant
async function deleteParticipant(id) {
  if (confirm('Are you sure you want to delete this participant? This cannot be undone.')) {
    state.participants = state.participants.filter(p => p.id !== id);
    await saveData();
    render();
  }
}

// Log activity
async function logActivity(participantId, logData) {
  const participant = state.participants.find(p => p.id === participantId);
  if (!participant) return;

  const existingIndex = participant.logs.findIndex(l => l.date === logData.date);
  if (existingIndex >= 0) {
    participant.logs[existingIndex] = logData;
  } else {
    participant.logs.push(logData);
  }

  await saveData();
  render();
}

// Reset competition
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

// Main render function
function render() {
  const app = document.getElementById('app');

  if (!state.competition) {
    app.innerHTML = renderSetupScreen();
  } else {
    app.innerHTML = `
      ${renderHeader()}
      ${renderNav()}
      <main class="main">
        ${renderCurrentView()}
      </main>
      ${renderFooter()}
    `;
  }

  attachEventListeners();
}

// Render setup screen
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
            <input type="text" id="competition-name" class="input-field" placeholder="e.g., Summer Fitness Challenge" value="90-Day Fitness Challenge">
          </div>
          
          <div class="form-group">
            <label class="form-label">Duration (Days)</label>
            <input type="number" id="competition-duration" class="input-field" placeholder="e.g., 90" value="90" min="1" max="365">
          </div>
          
          <button id="create-competition-btn" class="btn btn--primary btn--full">
            Start Competition
          </button>
        </div>
      </div>
    </div>
  `;
}

// Render header
function renderHeader() {
  const progress = getCompetitionProgress();
  return `
    <header class="header">
      <div>
        <h1 class="header__title">${state.competition.name.toUpperCase()}</h1>
        <p class="header__subtitle">DAY ${progress.day} OF ${state.competition.durationDays} • ${progress.daysLeft} DAYS LEFT</p>
      </div>
      <div class="header__info">
        <div class="header__stat-box">
          <span class="header__stat-label">PARTICIPANTS</span>
          <span class="header__stat-value">${state.participants.length}</span>
        </div>
        <div class="header__stat-box">
          <span class="header__stat-label">PROGRESS</span>
          <span class="header__stat-value">${progress.percent}%</span>
        </div>
      </div>
    </header>
  `;
}

// Render navigation
function renderNav() {
  const views = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'participants', icon: '👥', label: 'Participants' },
    { id: 'log', icon: '✍️', label: 'Log Activity' },
    { id: 'scoreboard', icon: '🏆', label: 'Scoreboard' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  return `
    <nav class="nav">
      ${views.map(v => `
        <button class="nav__btn ${state.currentView === v.id ? 'nav__btn--active' : ''}" data-view="${v.id}">
          ${v.icon} ${v.label}
        </button>
      `).join('')}
    </nav>
  `;
}

// Render current view
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

// Render dashboard
function renderDashboard() {
  const sorted = getSortedParticipants();
  const totalWorkouts = state.participants.reduce((acc, p) => acc + (p.logs || []).filter(l => l.completed).length, 0);
  const totalMinutes = state.participants.reduce((acc, p) => acc + (p.logs || []).reduce((a, l) => a + (l.duration || 0), 0), 0);
  const totalWater = state.participants.reduce((acc, p) => acc + (p.logs || []).filter(l => l.water).length, 0);
  const totalFriendWalks = state.participants.reduce((acc, p) => acc + (p.logs || []).filter(l => l.walkWithFriend).length, 0);
  const totalPoints = state.participants.reduce((acc, p) => acc + calculatePoints(p.logs || []), 0);
  const progress = getCompetitionProgress();

  return `
    <div class="fade-in">
      <h2 class="section-title mb-2xl">Competition Overview</h2>
      
      <div class="card mb-2xl">
        <div class="card__content">
          <div class="flex justify-between items-center mb-md">
            <span class="text-muted">Challenge Progress</span>
            <span style="font-family: var(--font-display); font-size: 20px; color: var(--color-primary);">
              Day ${progress.day} / ${state.competition.durationDays}
            </span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar__fill" style="width: ${progress.percent}%"></div>
          </div>
        </div>
      </div>
      
      <div class="stats-grid mb-2xl">
        <div class="stat-card">
          <div class="stat-card__icon">🎯</div>
          <div class="stat-card__value">${totalWorkouts}</div>
          <div class="stat-card__label">Total Workouts</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon">⏱️</div>
          <div class="stat-card__value">${Math.round(totalMinutes / 60)}h</div>
          <div class="stat-card__label">Total Hours</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon">💧</div>
          <div class="stat-card__value stat-card__value--cyan">${totalWater}</div>
          <div class="stat-card__label">Hydration Goals</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon">⭐</div>
          <div class="stat-card__value stat-card__value--gold">${totalPoints}</div>
          <div class="stat-card__label">Total Points</div>
        </div>
      </div>

      <h3 class="section-subtitle">🔥 Current Leaders</h3>
      ${sorted.length > 0 ? `
        <div class="leaders-grid">
          ${sorted.slice(0, 3).map((p, i) => {
            const stats = calculateStats(p);
            return `
              <div class="card leader-card">
                <div class="rank-badge rank-badge--${i + 1}">${i + 1}</div>
                <div class="leader-card__avatar">${p.avatar}</div>
                <div class="leader-card__name">${p.name}</div>
                <div class="leader-card__points">${stats.totalPoints}</div>
                <div class="leader-card__label">Points</div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state__icon">👥</div>
            <div class="empty-state__title">No Participants Yet</div>
            <div class="empty-state__text">Add participants to start tracking the competition</div>
            <button class="btn btn--primary" data-view="participants">Add Participants</button>
          </div>
        </div>
      `}
    </div>
  `;
}

// Render participants
function renderParticipants() {
  return `
    <div class="fade-in">
      <div class="section-header">
        <h2 class="section-title">Manage Participants</h2>
        <button class="btn btn--primary" id="show-add-participant">+ Add Participant</button>
      </div>

      <div id="add-participant-form" class="card mb-2xl" style="display: none;">
        <div class="card__content">
          <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 16px;">Add New Participant</h3>
          
          <div class="form-group">
            <label class="form-label">Select Avatar</label>
            <div class="avatar-picker">
              ${AVATARS.map((a, i) => `
                <button type="button" class="avatar-btn ${i === 0 ? 'avatar-btn--selected' : ''}" data-avatar="${a}">${a}</button>
              `).join('')}
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group" style="flex: 2;">
              <label class="form-label">Participant Name</label>
              <input type="text" id="new-participant-name" class="input-field" placeholder="Enter name...">
            </div>
            <div class="form-group" style="flex: 1; display: flex; align-items: flex-end; gap: 8px;">
              <button class="btn btn--primary" id="add-participant-btn">Add</button>
              <button class="btn btn--secondary" id="cancel-add-participant">Cancel</button>
            </div>
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
                  <div class="participant-card__info">
                    <div class="participant-card__name">${p.name}</div>
                    <div class="participant-card__date">Joined: ${p.joinDate}</div>
                  </div>
                  <div class="participant-card__score">
                    <div class="participant-card__points">${stats.totalPoints}</div>
                    <div class="participant-card__points-label">Points</div>
                  </div>
                </div>
                <div class="participant-card__stats">
                  <div>
                    <div class="participant-stat__icon">🎯</div>
                    <div class="participant-stat__value">${stats.workoutDays}</div>
                    <div class="participant-stat__label">Workouts</div>
                  </div>
                  <div>
                    <div class="participant-stat__icon">⏱️</div>
                    <div class="participant-stat__value">${stats.avgMinutes}m</div>
                    <div class="participant-stat__label">Avg Time</div>
                  </div>
                  <div>
                    <div class="participant-stat__icon">💧</div>
                    <div class="participant-stat__value">${stats.waterDays}</div>
                    <div class="participant-stat__label">Hydration</div>
                  </div>
                  <div>
                    <div class="participant-stat__icon">🔥</div>
                    <div class="participant-stat__value">${stats.streakDays}</div>
                    <div class="participant-stat__label">Streak</div>
                  </div>
                </div>
                <div class="flex justify-between mt-lg">
                  <button class="btn btn--secondary btn--sm" data-view="scoreboard" data-participant="${p.id}">View Details</button>
                  <button class="btn btn--danger btn--sm" data-delete-participant="${p.id}">Delete</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state__icon">👥</div>
            <div class="empty-state__title">No Participants</div>
            <div class="empty-state__text">Click "Add Participant" to add your first competitor</div>
          </div>
        </div>
      `}
    </div>
  `;
}

// Render activity log
function renderActivityLog() {
  const today = new Date().toISOString().split('T')[0];
  
  return `
    <div class="fade-in">
      <h2 class="section-title mb-2xl">Log Daily Activity</h2>

      ${state.participants.length > 0 ? `
        <div class="card max-w-form">
          <div class="card__content--lg">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Select Participant</label>
                <select id="log-participant" class="input-field">
                  <option value="">Choose a participant...</option>
                  ${state.participants.map(p => `<option value="${p.id}">${p.avatar} ${p.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" id="log-date" class="input-field" value="${today}">
              </div>
            </div>

            <div class="goal-box goal-box--primary">
              <div class="goal-box__title goal-box__title--primary">
                🎯 Daily Workout — 1 Point
              </div>
              
              <div class="checkbox-wrapper">
                <input type="checkbox" class="checkbox-custom" id="log-completed">
                <label for="log-completed" class="checkbox-label">Completed workout today</label>
              </div>

              <div id="workout-details" style="display: none; margin-top: 16px;">
                <div class="form-group">
                  <label class="form-label">Duration (Minutes)</label>
                  <input type="number" id="log-duration" class="input-field" placeholder="e.g., 30" min="1" value="30">
                </div>

                <div class="form-group">
                  <label class="form-label">Proof of Activity (Optional)</label>
                  <select id="log-proof-type" class="input-field">
                    <option value="none">No proof</option>
                    <option value="photo">📷 Photo</option>
                    <option value="video">🎥 Video</option>
                    <option value="link">🔗 Link (YouTube, etc.)</option>
                  </select>
                </div>

                <div id="proof-url-wrapper" class="form-group" style="display: none;">
                  <label class="form-label">Proof URL</label>
                  <input type="url" id="log-proof-url" class="input-field" placeholder="Paste link here...">
                </div>

                <div id="no-proof-warning" class="alert alert--warning">
                  ⚠️ This entry will be marked as "No Proof Uploaded"
                </div>
              </div>
            </div>

            <div class="goal-box goal-box--bonus">
              <div class="goal-box__title goal-box__title--bonus">⭐ Bonus Goals</div>
              
              <div class="checkbox-wrapper">
                <input type="checkbox" class="checkbox-custom" id="log-water">
                <label for="log-water" class="checkbox-label">💧 Drank 2L of water — <span class="bonus-point">+1 Point</span></label>
              </div>
              
              <div class="checkbox-wrapper">
                <input type="checkbox" class="checkbox-custom" id="log-friend">
                <label for="log-friend" class="checkbox-label">👫 Walked with a friend — <span class="bonus-point bonus-point--purple">+1 Point</span></label>
              </div>
            </div>

            <div class="points-preview">
              <span class="points-preview__label">Points for this entry:</span>
              <span class="points-preview__value" id="points-preview">0</span>
            </div>

            <button id="submit-log-btn" class="btn btn--primary btn--full" disabled>Log Activity</button>
          </div>
        </div>
      ` : `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state__icon">📝</div>
            <div class="empty-state__title">No Participants</div>
            <div class="empty-state__text">Add participants first to log activities</div>
            <button class="btn btn--primary" data-view="participants">Add Participants</button>
          </div>
        </div>
      `}
    </div>
  `;
}

// Render scoreboard
function renderScoreboard() {
  const sorted = getSortedParticipants();

  return `
    <div class="fade-in">
      <h2 class="section-title mb-2xl">🏆 Competition Scoreboard</h2>

      ${sorted.length > 0 ? `
        <div class="card table-wrapper">
          <table class="table">
            <thead class="table__head">
              <tr>
                <th class="table__th">Rank</th>
                <th class="table__th">Participant</th>
                <th class="table__th table__th--center">🎯 Workouts</th>
                <th class="table__th table__th--center">⏱️ Avg Time</th>
                <th class="table__th table__th--center">💧 Hydration</th>
                <th class="table__th table__th--center">👫 Friend Walks</th>
                <th class="table__th table__th--center">📷 Proof</th>
                <th class="table__th table__th--center">⭐ Points</th>
                <th class="table__th table__th--center">Details</th>
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
                        <div>
                          <div class="scoreboard-participant__name">${p.name}</div>
                          ${stats.streakDays > 0 ? `<div class="scoreboard-participant__streak">🔥 ${stats.streakDays} day streak</div>` : ''}
                        </div>
                      </div>
                    </td>
                    <td class="table__td table__td--center" style="font-weight: 600;">${stats.workoutDays}</td>
                    <td class="table__td table__td--center" style="font-weight: 600;">${stats.avgMinutes}m</td>
                    <td class="table__td table__td--center" style="font-weight: 600;">${stats.waterDays}</td>
                    <td class="table__td table__td--center" style="font-weight: 600;">${stats.friendWalks}</td>
                    <td class="table__td table__td--center">
                      <span style="color: ${stats.noProofDays > 0 ? 'var(--color-accent-red)' : 'var(--color-primary)'};">
                        ${stats.proofUploads}/${stats.workoutDays}
                      </span>
                      ${stats.noProofDays > 0 ? ' ⚠️' : ''}
                    </td>
                    <td class="table__td table__td--center"><span class="scoreboard-points">${stats.totalPoints}</span></td>
                    <td class="table__td table__td--center">
                      <button class="btn btn--secondary btn--sm" data-view="scoreboard" data-participant="${p.id}">View</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="card">
          <div class="empty-state">
            <div class="empty-state__icon">🏆</div>
            <div class="empty-state__title">No Participants</div>
            <div class="empty-state__text">Add participants to see the scoreboard</div>
            <button class="btn btn--primary" data-view="participants">Add Participants</button>
          </div>
        </div>
      `}
    </div>
  `;
}

// Render participant detail
function renderParticipantDetail() {
  const p = state.selectedParticipant;
  const stats = calculateStats(p);
  const sortedLogs = [...(p.logs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return `
    <div class="fade-in">
      <button class="btn btn--secondary mb-2xl" data-view="scoreboard">← Back to Scoreboard</button>

      <div class="card mb-2xl">
        <div class="card__content--lg">
          <div class="detail-header">
            <div class="detail-header__avatar">${p.avatar}</div>
            <div class="detail-header__info">
              <h2 class="detail-header__name">${p.name}</h2>
              <p class="detail-header__joined">Joined: ${p.joinDate}</p>
            </div>
            <div class="detail-header__score">
              <div class="detail-header__points">${stats.totalPoints}</div>
              <div class="detail-header__points-label">Total Points</div>
            </div>
          </div>

          <div class="stats-grid stats-grid--5">
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--sm">🎯</div>
              <div class="stat-card__value stat-card__value--sm">${stats.workoutDays}</div>
              <div class="stat-card__label">Workouts</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--sm">⏱️</div>
              <div class="stat-card__value stat-card__value--sm">${stats.totalMinutes}m</div>
              <div class="stat-card__label">Total Time</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--sm">💧</div>
              <div class="stat-card__value stat-card__value--sm">${stats.waterDays}</div>
              <div class="stat-card__label">Hydration</div>
            </div>
            <div class="stat-card">
              <div class="stat-card__icon stat-card__icon--sm">🔥</div>
              <div class="stat-card__value stat-card__value--sm">${stats.streakDays}</div>
              <div class="stat-card__label">Streak</div>
            </div>
            <div class="stat-card ${stats.noProofDays > 0 ? 'stat-card--warning' : 'stat-card--success'}">
              <div class="stat-card__icon stat-card__icon--sm">${stats.noProofDays > 0 ? '⚠️' : '✅'}</div>
              <div class="stat-card__value stat-card__value--sm ${stats.noProofDays > 0 ? 'stat-card__value--red' : ''}">${stats.noProofDays}</div>
              <div class="stat-card__label">No Proof</div>
            </div>
          </div>
        </div>
      </div>

      <h3 class="section-subtitle">Activity History</h3>
      <div class="card table-wrapper">
        <table class="table">
          <thead class="table__head">
            <tr>
              <th class="table__th">Date</th>
              <th class="table__th table__th--center">Workout</th>
              <th class="table__th table__th--center">Duration</th>
              <th class="table__th table__th--center">Proof</th>
              <th class="table__th table__th--center">Hydration</th>
              <th class="table__th table__th--center">Friend Walk</th>
              <th class="table__th table__th--center">Points</th>
            </tr>
          </thead>
          <tbody>
            ${sortedLogs.length > 0 ? sortedLogs.map(log => {
              const proofInfo = getProofInfo(log.proof);
              const dayPoints = (log.completed ? 1 : 0) + (log.water ? 1 : 0) + (log.walkWithFriend ? 1 : 0);
              return `
                <tr class="table__row">
                  <td class="table__td"><span class="log-date">${formatDate(log.date)}</span></td>
                  <td class="table__td table__td--center">
                    ${log.completed ? '<span class="scoreboard-check">✓</span>' : '<span class="scoreboard-dash">—</span>'}
                  </td>
                  <td class="table__td table__td--center">
                    ${log.completed ? `<span class="log-duration">${log.duration || 0}m</span>` : '<span class="scoreboard-dash">—</span>'}
                  </td>
                  <td class="table__td table__td--center">
                    ${log.completed ? `
                      <div class="proof-indicator">
                        <span class="proof-indicator__icon">${proofInfo.icon}</span>
                        <span class="proof-badge ${proofInfo.cssClass}">${proofInfo.label}</span>
                      </div>
                    ` : '<span class="scoreboard-dash">—</span>'}
                  </td>
                  <td class="table__td table__td--center">
                    ${log.water ? '💧' : '<span class="scoreboard-dash">—</span>'}
                  </td>
                  <td class="table__td table__td--center">
                    ${log.walkWithFriend ? '👫' : '<span class="scoreboard-dash">—</span>'}
                  </td>
                  <td class="table__td table__td--center">
                    <span class="log-points ${dayPoints > 0 ? 'log-points--positive' : 'log-points--zero'}">+${dayPoints}</span>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="7" class="empty-state">No activity logged yet</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// Render settings
function renderSettings() {
  return `
    <div class="fade-in">
      <h2 class="section-title mb-2xl">Settings</h2>

      <div class="card mb-2xl max-w-form">
        <div class="card__content">
          <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 16px;">Competition Info</h3>
          <div class="form-group">
            <label class="form-label">Competition Name</label>
            <div style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; color: var(--text-secondary);">
              ${state.competition.name}
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Duration</label>
              <div style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; color: var(--text-secondary);">
                ${state.competition.durationDays} days
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Start Date</label>
              <div style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; color: var(--text-secondary);">
                ${state.competition.startDate}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-2xl max-w-form">
        <div class="card__content">
          <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 16px;">Data Management</h3>
          <p class="text-muted mb-lg">Your data is automatically saved to your computer.</p>
          <div class="alert alert--info mb-lg">
            📁 Data is stored locally and persists between sessions
          </div>
        </div>
      </div>

      <div class="card max-w-form">
        <div class="card__content">
          <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 16px; color: var(--color-accent-red);">Danger Zone</h3>
          <p class="text-muted mb-lg">This will permanently delete all competition data including participants and activity logs.</p>
          <button class="btn btn--danger" id="reset-competition-btn">Reset Competition</button>
        </div>
      </div>
    </div>
  `;
}

// Render footer
function renderFooter() {
  return `
    <footer class="footer">
      ${state.competition.name} • Data saved locally
    </footer>
  `;
}

// Attach event listeners
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
      if (name && duration) {
        createCompetition(name, duration);
      }
    });
  }

  // Add participant form toggle
  const showAddBtn = document.getElementById('show-add-participant');
  const addForm = document.getElementById('add-participant-form');
  const cancelAddBtn = document.getElementById('cancel-add-participant');
  
  if (showAddBtn && addForm) {
    showAddBtn.addEventListener('click', () => {
      addForm.style.display = 'block';
      showAddBtn.style.display = 'none';
    });
  }
  
  if (cancelAddBtn && addForm && showAddBtn) {
    cancelAddBtn.addEventListener('click', () => {
      addForm.style.display = 'none';
      showAddBtn.style.display = 'inline-flex';
    });
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
      if (name) {
        addParticipant(name, selectedAvatar);
      }
    });
  }

  // Delete participant
  document.querySelectorAll('[data-delete-participant]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.currentTarget.dataset.deleteParticipant);
      deleteParticipant(id);
    });
  });

  // Activity log form
  const logCompleted = document.getElementById('log-completed');
  const workoutDetails = document.getElementById('workout-details');
  const logProofType = document.getElementById('log-proof-type');
  const proofUrlWrapper = document.getElementById('proof-url-wrapper');
  const noProofWarning = document.getElementById('no-proof-warning');
  const logParticipant = document.getElementById('log-participant');
  const submitLogBtn = document.getElementById('submit-log-btn');

  if (logCompleted && workoutDetails) {
    logCompleted.addEventListener('change', () => {
      workoutDetails.style.display = logCompleted.checked ? 'block' : 'none';
      updatePointsPreview();
    });
  }

  if (logProofType && proofUrlWrapper && noProofWarning) {
    logProofType.addEventListener('change', () => {
      proofUrlWrapper.style.display = logProofType.value === 'link' ? 'block' : 'none';
      noProofWarning.style.display = logProofType.value === 'none' ? 'block' : 'none';
    });
  }

  if (logParticipant && submitLogBtn) {
    logParticipant.addEventListener('change', () => {
      submitLogBtn.disabled = !logParticipant.value;
    });
  }

  // Points preview
  ['log-completed', 'log-water', 'log-friend'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', updatePointsPreview);
    }
  });

  // Submit log
  if (submitLogBtn) {
    submitLogBtn.addEventListener('click', () => {
      const participantId = parseInt(document.getElementById('log-participant').value);
      const date = document.getElementById('log-date').value;
      const completed = document.getElementById('log-completed').checked;
      const duration = parseInt(document.getElementById('log-duration')?.value) || 0;
      const proofType = document.getElementById('log-proof-type')?.value || 'none';
      const proofUrl = document.getElementById('log-proof-url')?.value || '';
      const water = document.getElementById('log-water').checked;
      const walkWithFriend = document.getElementById('log-friend').checked;

      let proof = null;
      if (completed) {
        proof = proofType === 'none' ? null : proofType === 'link' ? proofUrl : proofType;
      }

      logActivity(participantId, {
        date,
        completed,
        duration: completed ? duration : 0,
        proof,
        water,
        walkWithFriend
      });

      // Reset form
      document.getElementById('log-completed').checked = false;
      document.getElementById('log-water').checked = false;
      document.getElementById('log-friend').checked = false;
      if (workoutDetails) workoutDetails.style.display = 'none';
      updatePointsPreview();
    });
  }

  // Reset competition
  const resetBtn = document.getElementById('reset-competition-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetCompetition);
  }
}

// Update points preview
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
