var state = {
  masterPasswordVerified: localStorage.getItem('pw_verified') === 'true',
  currentUser: JSON.parse(localStorage.getItem('fifa_user') || 'null'),
  teams: {},
  teamsArr: [],
  games: [],
  rankings: {},
  predictions: [],
  users: [],
  highlights: {},
  stadiums: {},
  selectedTeams: {},
  selectedRaceUser: null,
  predictionsCache: { data: null, timestamp: 0 },
  leaderboardFilter: 'cumulative',
  sortBadgeMode: false,
};

var TEAM_FLAG_MAP = {};

var STADIUM_TZ = {
  '1': 'America/Mexico_City',
  '2': 'America/Mexico_City',
  '3': 'America/Mexico_City',
  '4': 'America/Chicago',
  '5': 'America/Chicago',
  '6': 'America/Chicago',
  '7': 'America/New_York',
  '8': 'America/New_York',
  '9': 'America/New_York',
  '10': 'America/New_York',
  '11': 'America/New_York',
  '12': 'America/Toronto',
  '13': 'America/Vancouver',
  '14': 'America/Los_Angeles',
  '15': 'America/Los_Angeles',
  '16': 'America/Los_Angeles'
};

function init() {
  document.getElementById('pw-submit').addEventListener('click', checkMasterPassword);
  document.getElementById('pw-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') checkMasterPassword();
  });
  document.getElementById('reg-submit').addEventListener('click', registerUser);
  document.getElementById('auth-submit').addEventListener('click', authenticateUser);
  document.getElementById('confirm-submit').addEventListener('click', confirmRegistration);
  document.getElementById('logout-btn').addEventListener('click', logout);

  var filterContainer = document.getElementById('lb-round-filter');
  if (filterContainer) {
    filterContainer.addEventListener('click', function(e) {
      var btn = e.target.closest('.lb-filter-btn');
      if (!btn || btn.classList.contains('active')) return;
      filterContainer.querySelector('.active').classList.remove('active');
      btn.classList.add('active');
      state.leaderboardFilter = btn.dataset.value;
      renderLeaderboard();
    });
  }

  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      var target = document.getElementById('tab-' + this.dataset.tab);
      target.classList.add('active');
      if (this.dataset.tab === 'games') renderGames();
      if (this.dataset.tab === 'leaderboard') renderLeaderboard();
    });
  });

  preloadRankings();

  if (state.masterPasswordVerified) {
    showLoading('Loading data...');
    loadAllData().then(function() {
      hideLoading();
      var valid = validateSession();
      if (valid && state.currentUser) {
        enterMainApp();
      } else if (valid) {
        showUserGrid();
      } else {
        showScreen('screen-password');
      }
    });
  } else {
    showScreen('screen-password');
  }
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById(id).classList.add('active');
}

function showModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function toast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(function() { el.classList.remove('show'); }, 3000);
}

function showLoading(msg) {
  document.getElementById('loading-text').textContent = msg || 'Loading...';
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

function preloadRankings() {
  fetch(CONFIG.RANKINGS_URL).then(function(r) { return r.json(); })
    .then(function(data) {
      var clean = {};
      Object.keys(data).forEach(function(k) {
        if (k === '_note') return;
        var lookup = k.replace(/['\u2019]/g, "'").replace(/&/g, ' and ');
        clean[lookup] = data[k];
        clean[k] = data[k];
      });
      clean['Bosnia and Herzegovina'] = clean['Bosnia and Herzegovina'] || clean['Bosnia & Herzegovina'];
      state.rankings = clean;
    }).catch(function() {});
}

function loadAllData() {
  return Promise.all([fetchTeams(), fetchGames(), loadUsersFromSheet(), fetchStadiums()]);
}

function validateSession() {
  var cached = JSON.parse(localStorage.getItem('fifa_user') || 'null');
  if (!cached) return true;
  var found = state.users.find(function(u) { return u.userId === cached.userId; });
  if (found) {
    state.currentUser = cached;
    state.currentUser.teamId = found.teamId;
    return true;
  }
  state.currentUser = null;
  state.masterPasswordVerified = false;
  localStorage.removeItem('fifa_user');
  localStorage.removeItem('pw_verified');
  return false;
}

function fetchTeams() {
  return fetch(CONFIG.TEAMS_API).then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.teams) {
        state.teams = {};
        state.teamsArr = data.teams;
        data.teams.forEach(function(t) {
          state.teams[t.id] = t;
          TEAM_FLAG_MAP[t.id] = t.flag || (CONFIG.FLAG_BASE + '/' + (t.iso2 || '').toLowerCase() + '.png');
        });
      }
    }).catch(function(e) { console.error('Teams fetch failed', e); });
}

function fetchStadiums() {
  return fetch('https://worldcup26.ir/get/stadiums').then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.stadiums) {
        state.stadiums = {};
        data.stadiums.forEach(function(s) {
          state.stadiums[s.id] = s;
        });
      }
    }).catch(function(e) { console.error('Stadiums fetch failed', e); });
}

function parseVenueDate(dateStr, timezone) {
  if (!dateStr || !timezone) return null;
  var parts = dateStr.split(' ');
  if (parts.length !== 2) return null;
  var dp = parts[0].split('/');
  var tp = parts[1].split(':');
  if (dp.length !== 3 || tp.length !== 2) return null;

  var y = +dp[2], m = +dp[0] - 1, d = +dp[1], h = +tp[0], min = +tp[1];

  var utcDate = new Date(Date.UTC(y, m, d, h, min));

  var formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  var fmtParts = formatter.formatToParts(utcDate);

  var getP = function(type) {
    var found = fmtParts.find(function(p) { return p.type === type; });
    return found ? parseInt(found.value, 10) : 0;
  };

  var venueMs = Date.UTC(getP('year'), getP('month') - 1, getP('day'), getP('hour'), getP('minute'), getP('second'));
  var offsetMs = venueMs - utcDate.getTime();

  var desiredVenueMs = Date.UTC(y, m, d, h, min);
  return new Date(desiredVenueMs - offsetMs);
}

function formatGameDate(game) {
  if (!game.date) return '';

  var tz = STADIUM_TZ[game.stadiumId];
  var dateObj = tz ? parseVenueDate(game.date, tz) : null;

  var localStr = dateObj ? dateObj.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : game.date;

  var stadium = game.stadiumId ? state.stadiums[game.stadiumId] : null;
  if (!stadium) return localStr;

  var countryClass = '';
  if (stadium.country_en === 'Mexico') { countryClass = 'mexico'; }
  else if (stadium.country_en === 'Canada') { countryClass = 'canada'; }
  else { countryClass = 'usa'; }

  var cityName = stadium.city_en || '';
  cityName = cityName.replace(/\s*\([^)]*\)/g, '').trim();
  if (!cityName) return '<span class="stadium-name ' + countryClass + '">' + escapeHtml(stadium.name_en) + '</span> \u2014 ' + localStr;
  return '<span class="stadium-name ' + countryClass + '">' + escapeHtml(cityName) + '</span> \u2014 ' + localStr;
}

function fetchGames() {
  return fetch(CONFIG.GAMES_API).then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.games) {
        state.games = data.games.map(function(g) {
          var winner = null;
          if (g.finished === 'TRUE') {
            var hs = parseInt(g.home_score);
            var as = parseInt(g.away_score);
            if (hs > as) winner = g.home_team_id;
            else if (as > hs) winner = g.away_team_id;
            else if (g.home_penalty_score && g.away_penalty_score) {
              var hps = parseInt(g.home_penalty_score);
              var aps = parseInt(g.away_penalty_score);
              if (hps > aps) winner = g.home_team_id;
              else if (aps > hps) winner = g.away_team_id;
            }
          }
          return {
            id: String(g.id),
            type: g.type,
            team1Id: g.home_team_id,
            team2Id: g.away_team_id,
            team1Label: g.home_team_label || null,
            team2Label: g.away_team_label || null,
            team1Name: g.home_team_name_en || null,
            team2Name: g.away_team_name_en || null,
            score1: g.finished === 'TRUE' ? g.home_score : null,
            score2: g.finished === 'TRUE' ? g.away_score : null,
            penalty1: g.finished === 'TRUE' && g.home_penalty_score && g.home_penalty_score !== 'null' ? g.home_penalty_score : null,
            penalty2: g.finished === 'TRUE' && g.away_penalty_score && g.away_penalty_score !== 'null' ? g.away_penalty_score : null,
            finished: g.finished === 'TRUE',
            winner: winner,
            date: g.local_date || null,
            stadiumId: g.stadium_id || null,
            scorers: g.home_scorers || g.away_scorers ? { home: g.home_scorers, away: g.away_scorers } : null,
          };
        });
      }
    }).catch(function(e) { console.error('Games fetch failed', e); });
}

function loadUsersFromSheet() {
  return apiGet({ action: 'getUsers' }).then(function(res) {
    if (res.success) {
      state.users = res.data;
      console.log('loadUsersFromSheet: loaded', state.users.length, 'users');
      if (state.users.length === 0) {
        console.warn('loadUsersFromSheet: users array is empty — check sheet structure (USERS section headers, column positions)');
      }
    } else {
      console.warn('loadUsersFromSheet failed:', JSON.stringify(res));
      toast('Failed to load users: ' + (res.error || 'unknown error'), 'error');
    }
  });
}

function apiGet(params, retries) {
  if (retries === undefined) retries = 2;
  var url = CONFIG.APPS_SCRIPT_URL + '?' + Object.keys(params).map(function(k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  function attempt(n) {
    return fetch(url).then(function(r) {
      console.log('apiGet[' + params.action + '] status:', r.status, r.statusText);
      var ct = (r.headers.get('content-type') || '').toLowerCase();
      if (ct.indexOf('json') === -1) {
        return r.text().then(function(text) {
          console.warn('apiGet[' + params.action + '] non-JSON (status ' + r.status + '):', text.slice(0, 500));
          throw new Error('Expected JSON, got ' + ct);
        });
      }
      return r.json();
    }).catch(function(err) {
      console.warn('apiGet[' + params.action + '] failed:', err && err.message, 'retries left:', n);
      if (n > 0) {
        return new Promise(function(resolve) { setTimeout(resolve, 1000 * (3 - n)); }).then(function() { return attempt(n - 1); });
      }
      return { success: false, error: 'Network error' };
    });
  }
  return attempt(retries);
}

function apiPost(data, retries) {
  if (retries === undefined) retries = 2;
  function attempt(n) {
    return fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); }).catch(function() {
      if (n > 0) {
        return new Promise(function(resolve) { setTimeout(resolve, 1000 * (3 - n)); }).then(function() { return attempt(n - 1); });
      }
      return { success: false, error: 'Network error' };
    });
  }
  return attempt(retries);
}

function checkMasterPassword() {
  var pw = document.getElementById('pw-input').value;
  document.getElementById('pw-error').textContent = '';
  showLoading('Verifying password...');
  apiPost({ action: 'checkMasterPassword', password: pw }).then(function(res) {
    if (res.success) {
      state.masterPasswordVerified = true;
      localStorage.setItem('pw_verified', 'true');
      showLoading('Loading data...');
      loadAllData().then(function() {
        hideLoading();
        validateSession();
        if (state.currentUser) {
          enterMainApp();
        } else {
          showUserGrid();
        }
      });
    } else {
      hideLoading();
      document.getElementById('pw-error').textContent = res.error || 'Incorrect password';
    }
  });
}

function showUserGrid() {
  showScreen('screen-users');
  var grid = document.getElementById('user-grid');
  grid.innerHTML = '';

  if (state.users.length === 0) {
    var msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;padding:30px;color:var(--text2);width:100%';
    msg.innerHTML =
      '<p style="color:var(--accent2);margin-bottom:12px;font-size:1.1rem">\u26A0\uFE0F Failed to load players</p>' +
      '<p style="margin-bottom:16px;font-size:0.9rem">Could not reach the spreadsheet. Check your connection.</p>' +
      '<button class="btn" onclick="retryLoadUsers()">Retry</button>';
    grid.appendChild(msg);
  } else {
    state.users.forEach(function(u) {
      var team = state.teams[u.teamId];
      var flagUrl = team ? TEAM_FLAG_MAP[u.teamId] : '';
      var initial = u.name.charAt(0).toUpperCase();

      var card = document.createElement('div');
      card.className = 'user-card';
      card.innerHTML =
        '<div class="avatar">' +
          (flagUrl ? '<img src="' + flagUrl + '" alt="" loading="lazy">' : '') +
          '<span class="initial">' + initial + '</span>' +
        '</div>' +
        '<div class="name">' + escapeHtml(u.name) + '</div>';
      card.addEventListener('click', function() { openAuth(u); });
      grid.appendChild(card);
    });
  }

  var addCard = document.createElement('div');
  addCard.className = 'user-card add-card';
  addCard.innerHTML = '<span style="font-size:2.5rem">+</span><div class="name">Add me</div>';
  addCard.addEventListener('click', openRegistration);
  grid.appendChild(addCard);
}

function retryLoadUsers() {
  showLoading('Loading users...');
  loadUsersFromSheet().then(function() {
    hideLoading();
    showUserGrid();
  });
}

function openRegistration() {
  var select = document.getElementById('reg-team');
  select.innerHTML = '<option value="">-- Pick your team --</option>';
  state.teamsArr.sort(function(a, b) { return a.name_en.localeCompare(b.name_en); }).forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name_en;
    select.appendChild(opt);
  });
  document.getElementById('reg-name').value = '';
  document.getElementById('reg-jersey').value = '';
  document.getElementById('reg-error').textContent = '';
  showModal('modal-register');
}

function registerUser() {
  var name = document.getElementById('reg-name').value.trim();
  var teamId = document.getElementById('reg-team').value;
  var jersey = document.getElementById('reg-jersey').value;
  var error = document.getElementById('reg-error');

  if (!name) { error.textContent = 'Enter your name'; return; }
  if (!teamId) { error.textContent = 'Pick a team'; return; }
  if (!jersey || jersey < 1 || jersey > 99) { error.textContent = 'Jersey number (1-99)'; return; }

  var team = state.teams[Number(teamId)];
  var teamName = team ? team.name_en : 'Unknown';
  var flagUrl = team ? TEAM_FLAG_MAP[teamId] : '';
  var initial = name.charAt(0).toUpperCase();

  document.getElementById('confirm-name').textContent = name;
  document.getElementById('confirm-team').textContent = teamName;
  document.getElementById('confirm-jersey-number').textContent = jersey;
  document.getElementById('jb-team-name').textContent = teamName;
  document.getElementById('jb-initial').textContent = initial;

  var flagImg = document.getElementById('jb-flag-img');
  if (flagUrl) {
    flagImg.src = flagUrl;
    flagImg.style.display = '';
  } else {
    flagImg.style.display = 'none';
  }

  document.getElementById('confirm-error').textContent = '';

  var btn = document.getElementById('confirm-submit');
  btn.dataset.name = name;
  btn.dataset.teamId = teamId;
  btn.dataset.jersey = jersey;

  showModal('modal-confirm-jersey');
}

function confirmRegistration() {
  var name = this.dataset.name;
  var teamId = Number(this.dataset.teamId);
  var jersey = Number(this.dataset.jersey);
  var error = document.getElementById('confirm-error');

  showLoading('Registering...');
  apiPost({ action: 'registerUser', name: name, teamId: teamId, jerseyNumber: jersey })
    .then(function(res) {
      if (res.success) {
        closeModal('modal-confirm-jersey');
        closeModal('modal-register');
        state.currentUser = { userId: res.userId, name: name, teamId: teamId, jerseyNumber: jersey };
        localStorage.setItem('fifa_user', JSON.stringify(state.currentUser));
        state.users.push(state.currentUser);
        showLoading('Loading data...');
        loadAllData().then(function() {
          hideLoading();
          enterMainApp();
        });
      } else {
        hideLoading();
        error.textContent = res.error || 'Registration failed';
      }
    });
}

function openAuth(user) {
  document.getElementById('auth-title').textContent = 'Welcome back, ' + escapeHtml(user.name);
  document.getElementById('auth-jersey').value = '';
  document.getElementById('auth-error').textContent = '';
  document.getElementById('auth-submit').dataset.userId = user.userId;
  document.getElementById('auth-submit').dataset.userName = user.name;
  document.getElementById('auth-jersey').dataset.userId = user.userId;
  document.getElementById('auth-jersey').dataset.userName = user.name;
  showModal('modal-auth');
}

function authenticateUser() {
  var userId = Number(this.dataset.userId);
  var userName = this.dataset.userName;
  var jersey = document.getElementById('auth-jersey').value;
  var error = document.getElementById('auth-error');

  if (!jersey) { error.textContent = 'Enter your jersey number'; return; }

  showLoading('Authenticating...');
  apiGet({ action: 'authenticate', name: userName, jerseyNumber: jersey }).then(function(res) {
    if (res.success) {
      closeModal('modal-auth');
      state.currentUser = { userId: res.userId, name: userName, teamId: null, jerseyNumber: Number(jersey) };
      var u = state.users.find(function(x) { return x.userId === res.userId; });
      if (u) state.currentUser.teamId = u.teamId;
      localStorage.setItem('fifa_user', JSON.stringify(state.currentUser));
      hideLoading();
      enterMainApp();
    } else {
      hideLoading();
      error.textContent = res.error || 'Wrong number';
    }
  });
}

function logout() {
  state.currentUser = null;
  state.predictions = [];
  state.masterPasswordVerified = false;
  localStorage.removeItem('fifa_user');
  localStorage.removeItem('pw_verified');
  document.getElementById('pw-input').value = '';
  document.getElementById('pw-error').textContent = '';
  showScreen('screen-password');
}

function enterMainApp() {
  showScreen('screen-main');
  document.getElementById('main-user-name').textContent = state.currentUser.name;
  var team = state.teams[state.currentUser.teamId];
  if (team) document.getElementById('main-user-name').textContent += ' (' + team.name_en + ')';
  renderGames();
}

function renderGames() {
  var container = document.getElementById('games-view');
  container.innerHTML = '<div class="loading">&#9917;</div>';

  if (!state.games.length || !state.teamsArr.length) {
    return;
  }

  if (state.currentUser) {
    apiGet({ action: 'getPredictions' }).then(function(res) {
      if (res.success) {
        state._allPredictions = res.data || [];
        state.predictions = (res.data || []).filter(function(p) { return Number(p.userId) === state.currentUser.userId; });
      } else {
        state._allPredictions = [];
        state.predictions = [];
      }
      renderGamesHTML(container);
    });
  } else {
    state.predictions = [];
    state._allPredictions = [];
    renderGamesHTML(container);
  }
}

var ROUND_LABELS = {
  r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-finals',
  sf: 'Semi-finals', third: '3rd Place', final: 'Final'
};

var ROUND_COLORS = {
  r32: '#15803d', r16: '#4ade80', qf: '#facc15',
  sf: '#f97316', third: '#ef4444', final: '#ffffff'
};

var BADGE_TYPES = {
  giant_slayer: { name: 'Giant Killer', shape: 'shield', color: '#4A90D9', priority: 1,
    desc: 'Correctly predicted an underdog winning with a FIFA rank gap of 15+' },
  lone_wolf:    { name: 'Lone Wolf',    shape: 'shield', color: '#A0A0A0', priority: 2,
    desc: 'Picked the minority side when 75%+ predicted the other team, and won' },
  close_call:   { name: 'Close Call',   shape: 'shield', color: '#E8A838', priority: 3,
    desc: 'Correctly predicted a game decided by penalties' },
  loyal_fan:    { name: 'Loyal Fan',    shape: 'shield', color: null,      priority: 4,
    desc: 'Predicted your supported team to win, and they did' },
  et_tu_brute:  { name: 'Et Tu Brute',  shape: 'shield', color: '#C0392B', priority: 5,
    desc: 'Predicted the opposing team in a match your supported team was playing in' },
  fav_picker:   { name: 'Safe Bet', shape: 'circle', color: '#9B59B6', priority: 6,
    desc: '75%+ of your predictions were for the higher-ranked team' },
  underdog:     { name: 'Underdog Lover',   shape: 'circle', color: '#27AE60', priority: 7,
    desc: '20%+ of your predictions were for the lower-ranked team' }
};

function computeBadges(userId) {
  var user = state.users.find(function(u) { return u.userId === userId; });
  if (!user) return [];

  var allPreds = state._allPredictions || [];
  var userPreds = allPreds.filter(function(p) { return Number(p.userId) === userId; });
  if (!userPreds.length) return [];

  var filter = state.leaderboardFilter;
  var finished = state.games.filter(function(g) {
    if (!g.finished) return false;
    if (CONFIG.ROUND_ORDER.indexOf(g.type) === -1) return false;
    if (filter !== 'cumulative' && g.type !== filter) return false;
    return true;
  });
  finished.sort(function(a, b) {
    var ka = getDateSortKey(a.date), kb = getDateSortKey(b.date);
    return ka > kb ? 1 : (ka < kb ? -1 : 0);
  });

  var result = [];

  var gsCount = 0, gsGames = [];
  var lwCount = 0, lwGames = [];
  var ccCount = 0, ccGames = [];
  var lfCount = 0, lfGames = [];
  var etbCount = 0, etbGames = [];
  var favTotal = 0, favCount = 0;
  var udTotal = 0, udCount = 0;

  finished.forEach(function(game) {
    var pred = userPreds.find(function(p) { return p.gameId === game.id; });
    if (!pred) return;
    var correct = String(pred.predictedTeamId) === String(game.winner);

    var r1 = state.rankings[game.team1Name] || state.rankings[(game.team1Name || '').replace(/['\u2019]/g, "'")];
    var r2 = state.rankings[game.team2Name] || state.rankings[(game.team2Name || '').replace(/['\u2019]/g, "'")];
    if (r1) r1 = parseInt(r1, 10);
    if (r2) r2 = parseInt(r2, 10);

    if (r1 && r2) {
      var winnerRank = String(game.winner) === String(game.team1Id) ? r1 : r2;
      var loserRank = String(game.winner) === String(game.team1Id) ? r2 : r1;
      if (winnerRank > loserRank && winnerRank - loserRank >= 15 && correct) {
        gsCount++;
        gsGames.push(game);
      }
      if (r1 !== r2) {
        favTotal++;
        udTotal++;
        var favId = r1 < r2 ? game.team1Id : game.team2Id;
        var udId = r1 > r2 ? game.team1Id : game.team2Id;
        if (String(pred.predictedTeamId) === String(favId)) favCount++;
        if (String(pred.predictedTeamId) === String(udId)) udCount++;
      }
    }

    var preds = allPreds.filter(function(p) { return p.gameId === game.id; });
    var total = preds.length;
    if (total >= 8 && game.winner) {
      var t1v = 0, t2v = 0;
      preds.forEach(function(p) {
        if (String(p.predictedTeamId) === String(game.team1Id)) t1v++;
        else if (String(p.predictedTeamId) === String(game.team2Id)) t2v++;
      });
      var majPct = Math.max(t1v, t2v) / total;
      var minId = t1v < t2v ? game.team1Id : game.team2Id;
      if (majPct >= 0.75 && String(game.winner) === String(minId) && String(pred.predictedTeamId) === String(minId)) {
        lwCount++;
        lwGames.push({ game: game, split: Math.round(Math.min(t1v, t2v) / total * 100) });
      }
    }

    if (correct && game.penalty1 != null && game.penalty2 != null &&
        game.penalty1 !== 'null' && game.penalty2 !== 'null') {
      ccCount++;
      ccGames.push(game);
    }

    if (correct && String(pred.predictedTeamId) === String(user.teamId) && String(game.winner) === String(user.teamId)) {
      lfCount++;
      lfGames.push(game);
    }

    var votedAgainstOwnTeam = (String(game.team1Id) === String(user.teamId) || String(game.team2Id) === String(user.teamId)) &&
                               String(pred.predictedTeamId) !== String(user.teamId);
    if (votedAgainstOwnTeam) {
      etbCount++;
      etbGames.push(game);
    }
  });

  if (gsCount > 0) result.push({ type: 'giant_slayer', count: gsCount, games: gsGames });
  if (lwCount > 0) result.push({ type: 'lone_wolf', count: lwCount, games: lwGames });
  if (ccCount > 0) result.push({ type: 'close_call', count: ccCount, games: ccGames });
  if (lfCount > 0) result.push({ type: 'loyal_fan', count: lfCount, games: lfGames });
  if (etbCount > 0) result.push({ type: 'et_tu_brute', count: etbCount, games: etbGames });
  if (favTotal > 0 && favCount / favTotal >= 0.75) result.push({ type: 'fav_picker', count: 1, pct: Math.round(favCount / favTotal * 100), num: favCount, den: favTotal });
  if (udTotal > 0 && udCount / udTotal >= 0.20) result.push({ type: 'underdog', count: 1, pct: Math.round(udCount / udTotal * 100), num: udCount, den: udTotal });

  result.sort(function(a, b) {
    return (BADGE_TYPES[a.type].priority || 99) - (BADGE_TYPES[b.type].priority || 99);
  });

  return result;
}

var _badgeUid = 0;

function renderCheckeredShield(size) {
  var s = size || 18;
  var uid = 'cs' + (++_badgeUid);
  var tiles = '';
  for (var row = 0; row < 8; row++) {
    for (var col = 0; col < 7; col++) {
      if ((row + col) % 2 === 0) {
        tiles += '<rect x="' + (4 + col * 4) + '" y="' + (2 + row * 4) + '" width="4" height="4" fill="#fff" opacity="0.35"/>';
      }
    }
  }
  return '<svg viewBox="0 0 32 32" width="' + s + '" height="' + s + '" class="badge-icon badge-shield">' +
    '<defs><clipPath id="' + uid + '">' +
    '<path d="M16 2 L28 7 L28 17 Q28 27 16 30 Q4 27 4 17 L4 7 Z"/>' +
    '</clipPath></defs>' +
    '<path d="M16 2 L28 7 L28 17 Q28 27 16 30 Q4 27 4 17 L4 7 Z" fill="#8B6914" stroke="#8B6914" stroke-width="1.5"/>' +
    '<g clip-path="url(#' + uid + ')">' + tiles + '</g></svg>';
}

function renderBadgeIcon(type, size, teamColor, flagUrl) {
  var s = size || 20;
  var info = BADGE_TYPES[type];
  var color = info.color;
  if (type === 'loyal_fan' && teamColor) color = teamColor;

  if (info.shape === 'shield') {
    var stroke = color;
    var fill = color;
    var icon = '';
    if (type === 'giant_slayer') {
      // Crossed swords icon by Lorc from Game-icons.net, CC BY 3.0
      icon = '<g transform="scale(0.0625)">' +
             '<path fill="#fff" d="M19.75 14.438c59.538 112.29 142.51 202.35 232.28 292.718l3.626 3.75.063-.062c21.827 21.93 44.04 43.923 66.405 66.25-18.856 14.813-38.974 28.2-59.938 40.312l28.532 28.53 68.717-68.717c42.337 27.636 76.286 63.646 104.094 105.81l28.064-28.06c-42.47-27.493-79.74-60.206-106.03-103.876l68.936-68.938-28.53-28.53c-11.115 21.853-24.413 42.015-39.47 60.593-43.852-43.8-86.462-85.842-130.125-125.47-.224-.203-.432-.422-.656-.625C183.624 122.75 108.515 63.91 19.75 14.437zm471.875 0c-83.038 46.28-154.122 100.78-221.97 161.156l22.814 21.562 56.81-56.812 13.22 13.187-56.438 56.44 24.594 23.186c61.802-66.92 117.6-136.92 160.97-218.72zm-329.53 125.906 200.56 200.53a402.965 402.965 0 0 1-13.405 13.032L148.875 153.53l13.22-13.186zm-76.69 113.28-28.5 28.532 68.907 68.906c-26.29 43.673-63.53 76.414-106 103.907l28.063 28.06c27.807-42.164 61.758-78.174 104.094-105.81l68.718 68.717 28.53-28.53c-20.962-12.113-41.08-25.5-59.937-40.313 17.865-17.83 35.61-35.433 53.157-52.97l-24.843-25.655-55.47 55.467c-4.565-4.238-9.014-8.62-13.374-13.062l55.844-55.844-24.53-25.374c-18.28 17.856-36.602 36.06-55.158 54.594-15.068-18.587-28.38-38.758-39.5-60.625z"/>' +
             '</g>';
    } else if (type === 'lone_wolf') {
      // Wolf head icon by Lorc from Game-icons.net, CC BY 3.0
      icon = '<g transform="scale(0.0625)">' +
             '<path fill="#fff" d="M179.3 38.94C154.7 77.7 142.7 139.7 168.4 185.9l-16.3 9.2c-6.7-11.9-11.2-24.4-13.9-37.2-34.5-6.3-69.42-7.5-104.98-2.1 34.07 10.1 52.77 23.7 76.68 46.7-26.82 9.7-60.25 30.2-92.93 70.2 35.47-8.8 64.83-11.5 89.43-6.3-36.94 22.5-64.06 56.1-88.34 114.1 35.9-17.2 64.89-18.8 102.94-18.8-23.07 32.7-35.27 77.2-36.31 112.8 24.51-26 57.61-60.2 87.21-79 3 29.9 15 58.3 35.9 85.3-.2-43.9 10.3-88.3 31.6-133.4-18.8 9-32.4 18.1-49.9 29.3 6.2-27.9 12.4-55.8 18.7-83.7-23.3 2.4-39 10-60.5 18.5 16.3-33.1 32.7-66.1 49.1-99.2l16.8 8.3-28.4 57.4c18.4-4.4 28.7-4.1 45.7-1.3-4.5 20.4-9 40.7-13.6 61 65.3-36.2 148.3-45.9 226.7-50 7.6-12.9 13.8-24.2 18.8-34.8l-6.3-24.4-24.4 30.8-7.8-27.5-22.5 29.2-7.5-26.1-23.9 31.5-7.7-28.2-23.8 31.4 1.2-41.1 22.6-42.7 7.6 28.3 23.9-31.5 7.6 28.2 23.5-30 6.5 26.9 24.5-30.8 7.8 27.5 24.6-32c2.3-10.8 4.6-22.4 7.4-35.7-55.5-3.7-106.3 4.8-154 9.8-38-20.8-80.8-26.8-121.9-18.5-13.6-29.69-27.2-59.38-40.9-89.06zM325.5 158.3c-4.5 14.2-13 18.3-24.7 20.6-16.1-4.4-28.3-15.5-34.4-30.2 20.4-3.8 42.4 3.4 59.1 9.6z"/>' +
             '</g>';
    } else if (type === 'close_call') {
      // Crosshair icon by Delapouite from Game-icons.net, CC BY 3.0
      icon = '<g transform="scale(0.0625)">' +
             '<path fill="#fff" d="M247 32v23.21C143.25 59.8 59.798 143.25 55.21 247H32v18h23.21C59.8 368.75 143.25 452.202 247 456.79V480h18v-23.21C368.75 452.2 452.202 368.75 456.79 265H480v-18h-23.21C452.2 143.25 368.75 59.798 265 55.21V32h-18zm0 41.223V128h18V73.223C359 77.76 434.24 153 438.777 247H384v18h54.777C434.24 359 359 434.24 265 438.777V384h-18v54.777C153 434.24 77.76 359 73.223 265H128v-18H73.223C77.76 153 153 77.76 247 73.223zM247 224v23h-23v18h23v23h18v-23h23v-18h-23v-23h-18z"/>' +
             '</g>';
    } else if (type === 'loyal_fan') {
      var uid = 'lf' + (++_badgeUid);
      icon = '<defs><clipPath id="' + uid + '">' +
             '<path d="M16 2 L28 7 L28 17 Q28 27 16 30 Q4 27 4 17 L4 7 Z"/>' +
             '</clipPath></defs>';
      if (flagUrl) {
        icon += '<image href="' + flagUrl + '" x="0" y="0" width="32" height="32" clip-path="url(#' + uid + ')" preserveAspectRatio="xMidYMid slice"/>';
      }
    } else if (type === 'et_tu_brute') {
      // Shattered heart icon by Delapouite from Game-icons.net, CC BY 3.0
      icon = '<g transform="scale(0.0625)">' +
             '<path fill="#fff" d="M112 16c-22.1 4.7-42.55 16.45-58.12 35.68l80.32 75.42L112 16zm31.9 20.77c-.9 0-1.7.1-2.6.1l26.6 132.83 88.8 40.4 10.3-75.4c-17.2-63.6-70.1-97.97-120.7-97.93h-2.4zm226.7 41.18c-24 .1-49.2 7.75-72.6 24.35l-13.7 99.9 62.3 28.3 134-53.6c-6.5-60.1-55.1-99.25-110-98.95zM55.11 89.9c-5.99 10.5-10.78 22.6-14.01 36.4-14.83 63.3 15.59 125.4 51.48 181.8l56.62-129.8-94.09-88.4zM176.9 193.6 265 407.5c27.1-13.4 57.2-27.4 85.8-43.5l-22.6-101.7-151.3-68.7zm293.9 18.2-124.4 49.7 20.7 92.9c47.5-28.8 88.1-64.5 99.7-114 2.3-9.9 3.6-19.4 4-28.6zm-314.9 16.1-55.5 127.2c36.3 54.6 73.7 103.2 73.7 141.5 10.9-18.8 37.8-35.2 70.9-52.2l-89.1-216.5z"/>' +
             '</g>';
    }
    return '<svg viewBox="0 0 32 32" width="' + s + '" height="' + s + '" class="badge-icon badge-shield">' +
      '<path d="M16 2 L28 7 L28 17 Q28 27 16 30 Q4 27 4 17 L4 7 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>' +
      icon + '</svg>';
  }

  if (info.shape === 'circle') {
    var icon2 = '';
    if (type === 'fav_picker') {
      // Checked shield icon by Lorc from Game-icons.net, CC BY 3.0
      icon2 = '<g transform="scale(0.0625)">' +
              '<path fill="' + color + '" d="M48.906 19.656v10.782c0 103.173 10.53 206.07 41.313 289.53 30.78 83.463 82.763 148.094 164.53 170.563l2.188.626 2.25-.5c89.686-19.12 142.322-84.028 171.187-168.344 28.865-84.315 35.406-188.656 35.406-291.875v-10.78l-10.655 1.53C323.26 39.954 191.452 40 59.595 21.188l-10.69-1.53zM67.75 41.03c63.242 8.536 126.495 12.792 189.75 12.782v184.532h174.78c-4.905 27.572-11.31 53.747-19.592 77.937-27.348 79.884-73.757 137.33-155.157 155.564-.008-.003-.02.003-.03 0v-233.5H86.53c-12.87-60.99-18.277-128.81-18.78-197.313z"/>' +
              '</g>';
    } else if (type === 'underdog') {
      // Plain arrow icon by Delapouite from Game-icons.net, CC BY 3.0
      icon2 = '<g transform="scale(0.0625)">' +
              '<path fill="' + color + '" d="M130.81 21.785v245.95H43.84L256 489.382l212.158-221.644H381.19V21.786H130.81z"/>' +
              '</g>';
    }
    return '<svg viewBox="0 0 32 32" width="' + s + '" height="' + s + '" class="badge-icon badge-circle">' +
      '<circle cx="16" cy="16" r="14" fill="none" stroke="' + color + '" stroke-width="1.5"/>' +
      '<circle cx="16" cy="16" r="11.5" fill="none" stroke="' + color + '" stroke-width="0.75" opacity="0.4"/>' +
      icon2 + '</svg>';
  }

  return '';
}

function renderBadge(badge, size, userId) {
  var info = BADGE_TYPES[badge.type];
  var s = size || 20;
  var user = userId ? state.users.find(function(u) { return u.userId === userId; }) : state.currentUser;
  var teamColor = (user && CONFIG.TEAM_COLORS[user.teamId]) ? CONFIG.TEAM_COLORS[user.teamId] : null;
  var flagUrl = (user && TEAM_FLAG_MAP[user.teamId]) ? TEAM_FLAG_MAP[user.teamId] : '';
  var icon = renderBadgeIcon(badge.type, s, teamColor, flagUrl);

  var numeral = '';
  if (badge.count >= 2) {
    var numerals = ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
    numeral = '<span class="badge-numeral">' + (numerals[badge.count] || badge.count) + '</span>';
  }

  var glowClass = badge.count >= 3 ? ' badge-gold' : '';
  var cls = 'badge' + glowClass;

  return '<span class="' + cls + '" title="' + info.name + (badge.count > 1 ? ' x' + badge.count : '') + '">' +
    icon + numeral + '</span>';
}

function renderLeaderboardBadges(userId) {
  var badges = computeBadges(userId);
  if (!badges.length) return '';
  var maxShow = 3;
  var html = '<span class="lb-badges">';
  for (var i = 0; i < Math.min(badges.length, maxShow); i++) {
    html += renderBadge(badges[i], 20, userId);
  }
  if (badges.length > maxShow) {
    html += '<span class="lb-badge-overflow">+' + (badges.length - maxShow) + '</span>';
  }
  return html + '</span>';
}

function renderBadgeList(badges, userId) {
  if (!badges || !badges.length) return '';
  var html = '<span class="lb-badges">';
  for (var i = 0; i < badges.length; i++) {
    html += renderBadge(badges[i], 20, userId);
  }
  return html + '</span>';
}

function expandBadges(badges) {
  var result = [];
  for (var i = 0; i < badges.length; i++) {
    for (var j = 0; j < badges[i].count; j++) {
      result.push({ type: badges[i].type, count: 1, games: badges[i].games });
    }
  }
  return result;
}

function renderBadgeShowcase(userId) {
  var badges = computeBadges(userId);
  if (!badges.length) return '';

  var html = '<div class="badge-showcase">';
  html += '<div class="badge-showcase-title">BADGES ' +
    '<span class="badge-info-btn" onclick="var el=this.parentNode.nextElementSibling;el.classList.toggle(\'open\');" title="What do these badges mean?">&#9432;</span>' +
    '</div>';

  html += '<div class="badge-legend">';
  var types = ['giant_slayer','lone_wolf','close_call','loyal_fan','et_tu_brute','fav_picker','underdog'];
  types.forEach(function(t) {
    var info = BADGE_TYPES[t];
    var legendIcon;
    if (t === 'loyal_fan') {
      legendIcon = renderCheckeredShield(18);
    } else {
      legendIcon = renderBadgeIcon(t, 18);
    }
    html += '<div class="badge-legend-row">' +
      '<span class="badge-legend-icon">' + legendIcon + '</span>' +
      '<span class="badge-legend-text"><strong>' + info.name + '</strong> ' + info.desc + '</span>' +
      '</div>';
  });
  html += '</div>';

  html += '<div class="badge-showcase-grid">';

  var expandTypes = ['giant_slayer', 'lone_wolf', 'close_call', 'loyal_fan', 'et_tu_brute'];

  badges.forEach(function(badge) {
    var info = BADGE_TYPES[badge.type];
    var user = state.users.find(function(u) { return u.userId === userId; });
    var teamColor = (user && CONFIG.TEAM_COLORS[user.teamId]) ? CONFIG.TEAM_COLORS[user.teamId] : null;
    var flagUrl = (user && TEAM_FLAG_MAP[user.teamId]) ? TEAM_FLAG_MAP[user.teamId] : '';
    var icon = renderBadgeIcon(badge.type, 40, teamColor, flagUrl);

    if (expandTypes.indexOf(badge.type) !== -1 && badge.games && badge.games.length > 0) {
      badge.games.forEach(function(entry) {
        var g = entry.game || entry;
        var t1 = state.teams[g.team1Id];
        var t2 = state.teams[g.team2Id];
        var n1 = t1 ? t1.name_en : g.team1Name;
        var n2 = t2 ? t2.name_en : g.team2Name;
        var score = g.finished ? (' ' + (g.score1 || 0) + '-' + (g.score2 || 0)) : '';
        var detail = '<div class="badge-detail-game">' + escapeHtml(n1) + ' vs ' + escapeHtml(n2) + score + '</div>';

        html += '<div class="badge-card">' +
          '<div class="badge-card-icon">' + icon + '</div>' +
          '<div class="badge-card-name">' + info.name + '</div>' +
          '<div class="badge-card-detail">' + detail + '</div>' +
          '</div>';
      });
    } else {
      var detail = '';
      if (badge.pct != null) {
        detail = '<div class="badge-detail-stat">' + badge.num + '/' + badge.den + ' games (' + badge.pct + '%)</div>';
      }
      var countLabel = badge.count > 1 ? ' <span class="badge-count">x' + badge.count + '</span>' : '';

      html += '<div class="badge-card">' +
        '<div class="badge-card-icon">' + icon + '</div>' +
        '<div class="badge-card-name">' + info.name + countLabel + '</div>' +
        '<div class="badge-card-detail">' + detail + '</div>' +
        '</div>';
    }
  });

  html += '</div></div>';
  return html;
}

function getPrevRound(round) {
  if (round === 'final' || round === 'third') return 'sf';
  var idx = CONFIG.ROUND_ORDER.indexOf(round);
  if (idx <= 0) return null;
  return CONFIG.ROUND_ORDER[idx - 1];
}

function isRoundActive(type, currentRound) {
  if (type === currentRound) return true;
  for (var i = 0; i < CONFIG.SIMULTANEOUS_ROUNDS.length; i++) {
    var group = CONFIG.SIMULTANEOUS_ROUNDS[i];
    if (group.indexOf(type) !== -1 && group.indexOf(currentRound) !== -1) {
      return true;
    }
  }
  return false;
}

function getDateSortKey(dateStr) {
  if (!dateStr) return '99999999999999';
  var parts = dateStr.split(' ');
  var dateParts = parts[0].split('/');
  var month = dateParts[0].length === 1 ? '0' + dateParts[0] : dateParts[0];
  var day = dateParts[1].length === 1 ? '0' + dateParts[1] : dateParts[1];
  var time = parts[1] || '00:00';
  return dateParts[2] + month + day + time;
}

function renderGamesHTML(container) {
  var knockout = state.games.filter(function(g) { return CONFIG.ROUND_ORDER.indexOf(g.type) !== -1; });
  knockout.sort(function(a, b) {
    var ka = getDateSortKey(a.date);
    var kb = getDateSortKey(b.date);
    if (ka === kb) return parseInt(a.id) - parseInt(b.id);
    return ka < kb ? -1 : 1;
  });

  var rounds = {};
  knockout.forEach(function(g) {
    if (!rounds[g.type]) rounds[g.type] = [];
    rounds[g.type].push(g);
  });

  var currentRound = determineCurrentRound(rounds);
  var html = '';

  CONFIG.ROUND_ORDER.forEach(function(type) {
    if (!rounds[type]) return;
    var games = rounds[type];
    var allDone = games.every(function(g) { return g.finished; });
    var isCurrent = isRoundActive(type, currentRound);

    var badge = allDone ? '<span class="status-badge badge-done">Done</span>'
      : isCurrent ? '<span class="status-badge badge-active">Active</span>'
      : '<span class="status-badge badge-locked">Locked</span>';

    html += '<div class="round-section">';
    html += '<div class="round-header">' + (ROUND_LABELS[type] || type) + ' ' + badge + '</div>';

    games.forEach(function(game) {
      html += renderGameCard(game, isCurrent, allDone, type === currentRound);
    });

    html += '</div>';
  });

  container.innerHTML = html;
}

function determineCurrentRound(rounds) {
  var roundKeys = CONFIG.ROUND_ORDER.filter(function(r) { return rounds[r]; });
  for (var i = 0; i < roundKeys.length; i++) {
    var games = rounds[roundKeys[i]];
    var allDone = games.every(function(g) { return g.finished; });
    if (!allDone) {
      if (i === 0) return roundKeys[0];
      var prevDone = rounds[roundKeys[i - 1]].every(function(g) { return g.finished; });
      if (prevDone) return roundKeys[i];
      return roundKeys[i - 1];
    }
  }
  return roundKeys[roundKeys.length - 1];
}

function isGameStarted(game) {
  if (!game.date || !game.stadiumId) return false;
  var tz = STADIUM_TZ[game.stadiumId];
  if (!tz) return false;
  var startTime = parseVenueDate(game.date, tz);
  return startTime && startTime <= new Date();
}

function renderGameCard(game, isCurrent, allDone, isInteractiveRound) {
  var team1Known = game.team1Id && game.team1Id !== '0';
  var team2Known = game.team2Id && game.team2Id !== '0';
  var canPredict = isCurrent && team1Known && team2Known && !game.finished && !isGameStarted(game);
  var existingPred = state.predictions.find(function(p) { return p.gameId === game.id; });

  var cardClass = 'game-card';
  if (game.finished) {
    cardClass += ' completed';
    var pred = state.predictions.find(function(p) { return p.gameId === game.id; });
    if (!pred) cardClass += ' no-pick';
    else if (pred.predictedTeamId === game.winner) cardClass += ' correct';
    else cardClass += ' wrong';
  } else if (isGameStarted(game)) {
    cardClass += ' started';
  } else if (canPredict) cardClass += ' current';
  else cardClass += ' locked';

  var html = '<div class="' + cardClass + '" data-game-id="' + game.id + '">';

  html += renderVoteBar(game);
  html += '<div class="game-teams">';
  html += renderTeamSlot(game, 'team1', team1Known, canPredict, existingPred ? existingPred.predictedTeamId : null);
  html += '<span class="vs">vs</span>';
  html += renderTeamSlot(game, 'team2', team2Known, canPredict, existingPred ? existingPred.predictedTeamId : null);
  if (game.finished || isGameStarted(game)) {
    html += renderVotePill(game);
  }
  html += '</div>';

  if (game.date) {
    var dateLine = formatGameDate(game);
    if (game.finished) {
      var pred = state.predictions.find(function(p) { return p.gameId === game.id; });
      if (pred) {
        var correct = pred.predictedTeamId === game.winner;
        dateLine = (correct ? '\u2705' : '\u274c') + ' ' + dateLine;
      }
    }
    html += '<div class="game-info game-info-dt">' + dateLine + '</div>';
  }
  if (canPredict && !existingPred) {
    html += renderPredictionControls(game);
  }

  html += '</div>';
  return html;
}

function renderTeamSlot(game, side, known, canPredict, predictedTeamId) {
  var id = side === 'team1' ? game.team1Id : game.team2Id;
  var label = side === 'team1' ? game.team1Label : game.team2Label;
  var name = side === 'team1' ? game.team1Name : game.team2Name;
  var score = side === 'team1' ? game.score1 : game.score2;
  var winId = game.winner;

  if (known) {
    var team = state.teams[id];
    var flagUrl = team ? TEAM_FLAG_MAP[id] : '';
    var teamName = team ? team.name_en : (name || 'Team ' + id);
    var isWinner = game.finished && String(id) === String(winId);
    var isLoser = game.finished && String(id) !== String(winId) && winId !== null;

    var cls = 'team';
    if (game.finished && isWinner) cls += ' winner';
    if (game.finished && isLoser) cls += ' loser';
    if (predictedTeamId && String(id) === String(predictedTeamId)) cls += ' predicted';

    return '<div class="' + cls + '" title="Tap for team info" onclick="showTeamPopup(' + id + ')">' +
      (flagUrl ? '<img src="' + flagUrl + '" alt="" loading="lazy">' : '<span class="flag-placeholder"></span>') +
      '<span>' + escapeHtml(teamName) + '' + '</span>' +
      (game.finished ? '<span class="score">' + (score || '') + '</span>' : '') +
      '</div>';
  } else if (label) {
    var matchNum = label.replace(/[^0-9]/g, '');
    return '<div class="team" title="' + escapeHtml(label) + '"><span class="flag-placeholder"></span><span>TBD (' + matchNum + ')</span></div>';
  } else {
    return '<div class="team"><span class="flag-placeholder"></span><span>?</span></div>';
  }
}

function renderPredictionControls(game) {
  var selectedId = state.selectedTeams[game.id] || '';

  var html = '<div class="game-pick">';

  html += '<button class="btn btn-sm btn-ghost team1-pick" data-game="' + game.id + '" data-team="' + game.team1Id + '"';
  if (selectedId === game.team1Id) html += ' style="background:rgba(232,184,48,0.2);border-color:var(--accent);color:var(--accent)"';
  html += ' onclick="selectTeamById(this, \'' + game.id + '\', \'' + game.team1Id + '\')">';
  var t1 = state.teams[game.team1Id];
  html += (t1 ? t1.name_en : 'Team 1') + '</button>';

  html += '<button class="btn btn-sm btn-ghost team2-pick" data-game="' + game.id + '" data-team="' + game.team2Id + '"';
  if (selectedId === game.team2Id) html += ' style="background:rgba(232,184,48,0.2);border-color:var(--accent);color:var(--accent)"';
  html += ' onclick="selectTeamById(this, \'' + game.id + '\', \'' + game.team2Id + '\')">';
  var t2 = state.teams[game.team2Id];
  html += (t2 ? t2.name_en : 'Team 2') + '</button>';

  html += '<button class="btn btn-sm pred-submit" data-game="' + game.id + '" onclick="submitPrediction(this)">Predict</button>';

  html += '</div>';
  return html;
}

function renderVotePill(game) {
  var predictions = (state._allPredictions || []).filter(function(p) { return p.gameId === game.id; });
  var count = predictions.length;
  if (!count) return '';
  return '<span class="vote-pill" onclick="showVoteBreakdown(\'' + game.id + '\')">' + count + ' vote' + (count !== 1 ? 's' : '') + '</span>';
}

function renderVoteBar(game) {
  var predictions = (state._allPredictions || []).filter(function(p) { return p.gameId === game.id; });
  var count = predictions.length;
  if (count < 8 || state.users.length === 0) return '';
  var team1Votes = 0, team2Votes = 0;
  predictions.forEach(function(p) {
    if (String(p.predictedTeamId) === String(game.team1Id)) team1Votes++;
    else if (String(p.predictedTeamId) === String(game.team2Id)) team2Votes++;
  });
  var total = state.users.length;
  var t1Pct = Math.round(team1Votes / total * 100);
  var t2Pct = Math.round(team2Votes / total * 100);
  var t1c = CONFIG.TEAM_COLORS[game.team1Id] || '#666';
  var t2c = CONFIG.TEAM_COLORS[game.team2Id] || '#666';

  var gapPct = Math.max(0, 100 - t1Pct - t2Pct);
  var gap = gapPct > 0
    ? '<div class="vb-gold-line"></div><div class="vb-seg vb-gap" style="width:' + gapPct + '%"></div>'
    : '';

  return '<div class="vote-bar">' +
    '<div class="vb-seg" style="width:' + t1Pct + '%;background:' + t1c + '"></div>' +
    '<div class="vb-gold-line"></div>' +
    '<div class="vb-seg" style="width:' + t2Pct + '%;background:' + t2c + '"></div>' +
    gap +
    '</div>';
}

function showVoteBreakdown(gameId) {
  var game = state.games.find(function(g) { return g.id === gameId; });
  if (!game) return;

  var team1Id = game.team1Id;
  var team2Id = game.team2Id;
  var t1 = state.teams[team1Id];
  var t2 = state.teams[team2Id];
  var team1Name = t1 ? t1.name_en : ('Team ' + team1Id);
  var team2Name = t2 ? t2.name_en : ('Team ' + team2Id);
  var winnerId = game.winner;

  var predictions = (state._allPredictions || []).filter(function(p) { return p.gameId === gameId; });

  var team1Votes = [], team2Votes = [];
  predictions.forEach(function(p) {
    var user = state.users.find(function(u) { return u.userId === Number(p.userId); });
    var userName = user ? user.name : 'Unknown';
    var isYou = state.currentUser && Number(p.userId) === state.currentUser.userId;
    if (String(p.predictedTeamId) === String(team1Id)) {
      team1Votes.push({ name: userName, isYou: isYou, teamId: user ? user.teamId : null });
    } else if (String(p.predictedTeamId) === String(team2Id)) {
      team2Votes.push({ name: userName, isYou: isYou, teamId: user ? user.teamId : null });
    }
  });

  var html = '<div class="pp-header">' +
    '<h2>Vote Breakdown</h2>' +
    '<span class="pp-tally">' + predictions.length + ' vote' + (predictions.length !== 1 ? 's' : '') + '</span>' +
    '<button class="pp-close" onclick="closeModal(\'modal-vote-breakdown\')">&times;</button>' +
    '</div>' +
    '<div class="pp-body">' +
    renderVoteGroup(team1Name, team1Votes, winnerId, team1Id) +
    renderVoteGroup(team2Name, team2Votes, winnerId, team2Id) +
    '</div>';

  document.getElementById('vb-sheet').innerHTML = html;
  showModal('modal-vote-breakdown');
}

function renderVoteGroup(teamName, voters, winnerId, teamId) {
  var team = state.teams[teamId];
  var flagUrl = team ? TEAM_FLAG_MAP[teamId] : '';
  var isWinner = String(teamId) === String(winnerId);

  var cls = 'vb-group';
  if (isWinner) cls += ' vb-group-winner';
  else cls += ' vb-group-loser';

  var html = '<div class="' + cls + '">' +
    '<div class="vb-group-header">' +
    (flagUrl ? '<img src="' + flagUrl + '" alt="" class="vb-flag">' : '') +
    '<span class="vb-team-name">' + escapeHtml(teamName) + '</span>' +
    (isWinner ? '<span class="vb-badge">Winner</span>' : '') +
    '<span class="vb-count">' + voters.length + '</span>' +
    '</div>' +
    '<div class="vb-voters">';

  voters.forEach(function(v) {
    var voterFlagUrl = v.teamId ? TEAM_FLAG_MAP[v.teamId] : '';
    var bgStyle = voterFlagUrl
      ? 'background:linear-gradient(rgba(30,30,52,0.8),rgba(30,30,52,0.8)),url(' + voterFlagUrl + ') center/auto no-repeat var(--bg3)'
      : '';
    var vCls = 'vb-voter';
    if (v.isYou) vCls += ' vb-you';
    html += '<span class="' + vCls + '" style="' + bgStyle + '">' + escapeHtml(v.name) + '</span>';
  });

  html += '</div></div>';
  return html;
}

window.selectTeamById = function(el, gameId, teamId) {
  state.selectedTeams[gameId] = teamId;
  var card = el.closest('.game-pick');
  var btns = card.querySelectorAll('button[data-team]');
  btns.forEach(function(b) {
    b.style.background = '';
    b.style.borderColor = '';
    b.style.color = '';
    if (String(b.dataset.team) === String(teamId)) {
      b.style.background = 'rgba(232,184,48,0.2)';
      b.style.borderColor = 'var(--accent)';
      b.style.color = 'var(--accent)';
    }
  });
};

window.submitPrediction = function(btn) {
  var gameId = btn.dataset.game;
  var card = btn.closest('.game-pick') || btn.closest('.game-card');
  var pickBtns = (card.querySelectorAll ? card.querySelectorAll('button[data-team]') : []);

  var predictedTeamId = state.selectedTeams[gameId];
  if (!predictedTeamId) {
    pickBtns.forEach(function(b) {
      if (b.style.background && b.style.background.includes('rgba(232,184,48')) {
        predictedTeamId = b.dataset.team;
      }
    });
  }
  if (!predictedTeamId) { toast('Pick a team first', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  apiPost({
    action: 'submitPrediction',
    userId: state.currentUser.userId,
    gameId: gameId,
    predictedTeamId: predictedTeamId
  }).then(function(res) {
    if (res.success) {
      toast('Prediction saved!', 'success');
      renderGames();
    } else {
      toast(res.error || 'Failed to save', 'error');
      btn.disabled = false;
      btn.textContent = 'Predict';
    }
  });
};

window.deletePrediction = function(btn) {
  var gameId = btn.dataset.game;
  if (!confirm('Remove your prediction for this game?')) return;

  btn.disabled = true;
  btn.textContent = 'Deleting...';

  apiPost({
    action: 'deletePrediction',
    userId: state.currentUser.userId,
    gameId: gameId
  }).then(function(res) {
    if (res.success) {
      toast('Prediction removed', 'success');
      renderGames();
    } else {
      toast(res.error || 'Failed to delete', 'error');
      btn.disabled = false;
      btn.textContent = 'Delete';
    }
  });
};

function getPredictionsCached() {
  var CACHE_TTL = 5 * 60 * 1000;
  var now = Date.now();
  if (state.predictionsCache.data && (now - state.predictionsCache.timestamp) < CACHE_TTL) {
    return Promise.resolve(state.predictionsCache.data);
  }
  return apiGet({ action: 'getPredictions' }).then(function(res) {
    if (res.success) {
      state.predictionsCache.data = res;
      state.predictionsCache.timestamp = Date.now();
    }
    return res;
  });
}

function renderLeaderboard() {
  var container = document.getElementById('leaderboard-view');
  container.innerHTML = '<div class="loading">&#9917;</div>';

  getPredictionsCached().then(function(res) {
    if (!res.success || !res.data) {
      container.innerHTML = '<p style="text-align:center;color:var(--text2)">Failed to load leaderboard</p>';
      return;
    }

    var allPredictions = res.data;
    state._allPredictions = allPredictions;

    var scores = {};
    state.users.forEach(function(u) {
      scores[u.userId] = { name: u.name, totalScore: 0, correctCount: 0, rounds: {} };
    });

    var filter = state.leaderboardFilter;

    allPredictions.forEach(function(pred) {
      if (!scores[pred.userId]) return;
      var game = state.games.find(function(g) { return g.id === pred.gameId; });
      if (!game || !game.finished) return;
      if (filter !== 'cumulative' && game.type !== filter) return;
      if (game.winner && String(game.winner) === pred.predictedTeamId) {
        scores[pred.userId].totalScore++;
        scores[pred.userId].correctCount++;
        if (!scores[pred.userId].rounds[game.type]) scores[pred.userId].rounds[game.type] = 0;
        scores[pred.userId].rounds[game.type]++;
      }
    });

    var result = Object.keys(scores).map(function(uid) {
      return {
        userId: Number(uid),
        name: scores[uid].name,
        totalScore: scores[uid].totalScore,
        correctCount: scores[uid].correctCount,
        rounds: scores[uid].rounds
      };
    });

    var badgeData = {};
    state.users.forEach(function(u) {
      var badges = computeBadges(u.userId);
      var total = 0;
      for (var b = 0; b < badges.length; b++) total += badges[b].count;
      badgeData[u.userId] = { badges: badges, total: total };
    });

    if (state.sortBadgeMode) {
      result.sort(function(a, b) {
        var ba = badgeData[a.userId] ? badgeData[a.userId].total : 0;
        var bb = badgeData[b.userId] ? badgeData[b.userId].total : 0;
        return bb - ba || a.name.localeCompare(b.name);
      });
    } else {
      result.sort(function(a, b) {
        return b.totalScore - a.totalScore || a.name.localeCompare(b.name);
      });
    }
    result.forEach(function(r, i) {
      r.rank = i > 0 && (state.sortBadgeMode
        ? (badgeData[r.userId] ? badgeData[r.userId].total : 0) === (badgeData[result[i-1].userId] ? badgeData[result[i-1].userId].total : 0)
        : r.totalScore === result[i-1].totalScore)
        ? result[i-1].rank : i + 1;
    });

    if (!result.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--text2)">No predictions yet</p>';
      return;
    }

    var maxScore = result[0].totalScore;

    var allFinished = state.games.filter(function(g) {
      if (!g.finished) return false;
      if (filter !== 'cumulative' && g.type !== filter) return false;
      return true;
    });
    allFinished.sort(function(a, b) {
      var ka = getDateSortKey(a.date), kb = getDateSortKey(b.date);
      return ka > kb ? 1 : (ka < kb ? -1 : 0);
    });

    var allPreds = state._allPredictions || [];
    var fgData = {};
    state.users.forEach(function(u) {
      fgData[u.userId] = computeStreakHistory(u.userId, allFinished, allPreds).slice(-3);
    });

    var html = '<div class="lb-cards">';

    result.forEach(function(row) {
      var rankStr = '#' + row.rank;
      var rankClass = 'lb-rank';
      if (row.rank === 1) rankClass += ' gold';
      else if (row.rank === 2) rankClass += ' silver';
      else if (row.rank === 3) rankClass += ' bronze';

      var isMe = state.currentUser && row.userId === state.currentUser.userId;
      var user = state.users.find(function(u) { return u.userId === row.userId; });
      var team = user ? state.teams[user.teamId] : null;
      var flagUrl = team ? TEAM_FLAG_MAP[user.teamId] : '';

      var cardBadgesHtml, cardStatsHtml;
      if (state.sortBadgeMode) {
        var bi = badgeData[row.userId];
        var expanded = bi ? expandBadges(bi.badges) : [];
        cardBadgesHtml = renderBadgeList(expanded, row.userId);
        cardStatsHtml = '<span class="lb-stats">' +
          '<span class="lb-score lb-score-badge">' + (bi ? bi.total : 0) + '</span>' +
          '</span>';
      } else {
        cardBadgesHtml = renderLeaderboardBadges(row.userId);
        cardStatsHtml = '<span class="lb-stats">' +
          renderFormGuide(fgData[row.userId]) +
          '<span class="lb-score">' + row.correctCount + '</span>' +
          '</span>';
      }

      html += '<div class="lb-card' + (isMe ? ' me' : '') + '" data-user-id="' + row.userId + '">' +
        '<div class="lb-main">' +
        '<span class="' + rankClass + '">' + rankStr + '</span>' +
        (flagUrl ? '<img class="lb-flag" src="' + flagUrl + '" alt="" loading="lazy">' : '') +
        '<span class="lb-name' + (row.rank <= 3 ? ' ' + ['gold','silver','bronze'][row.rank - 1] : '') + '">' + escapeHtml(row.name) + '</span>' +
        cardBadgesHtml +
        cardStatsHtml +
        '</div>' +
        (state.sortBadgeMode ? '' : renderBar(row, maxScore)) +
        '</div>';
    });

    html += '</div>';
    var badgeBtnClass = 'lb-action-btn' + (state.sortBadgeMode ? ' active' : '');
    container.innerHTML = '<div class="lb-actions">' +
      '<button class="race-chart-btn" id="rc-btn">&#128200; Race Chart</button>' +
      '<button class="' + badgeBtnClass + '" id="badge-mode-btn" type="button">' +
      '<span>&#129351; Badges</span>' +
      '<span class="toggle-switch"><span class="toggle-slider"></span></span>' +
      '</button>' +
      '</div>' + html;

    if (state.selectedRaceUser === null && state.currentUser) {
      state.selectedRaceUser = state.currentUser.userId;
    }

    var rcBtn = document.getElementById('rc-btn');
    if (rcBtn) {
      rcBtn.classList.toggle('dimmed', allFinished.length <= 1);
      rcBtn.addEventListener('click', openRaceChartSheet);
    }

    var badgeBtn = document.getElementById('badge-mode-btn');
    if (badgeBtn) {
      badgeBtn.addEventListener('click', function() {
        state.sortBadgeMode = !state.sortBadgeMode;
        renderLeaderboard();
      });
    }

    container.querySelectorAll('.lb-card').forEach(function(card) {
      card.addEventListener('click', function() {
        openPlayerPredictions(Number(this.dataset.userId));
      });
    });
  });
}

function openRaceChartSheet() {
  var container = document.getElementById('race-chart-container');
  renderRaceChart(container);
  if (container.querySelector('svg')) {
    showModal('modal-race-chart');
  } else {
    toast('Race chart needs at least 2 games in this round', 'error');
  }
}

function renderFormGuide(slots) {
  if (!slots || !slots.length) return '';
  var html = '<span class="fg">';
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i];
    var cls = 'fg-slot' + (i === slots.length - 1 ? ' fg-latest' : '');
    if (!s) {
      html += '<span class="' + cls + '"></span>';
    } else if (s.r === 0) {
      html += '<span class="' + cls + ' fg-wrong"><svg viewBox="0 0 20 20" width="16" height="16"><rect x="4" y="3" width="12" height="14" rx="1.5" fill="#f04850"/></svg></span>';
    } else {
      var sc = s.s >= 3 ? 'fg-s-3' : s.s === 2 ? 'fg-s-2' : '';
      html += '<span class="' + cls + ' fg-correct' + (sc ? ' ' + sc : '') + '">&#9917;</span>';
    }
  }
  return html + '</span>';
}

function renderBar(row, maxScore) {
  var barPct = maxScore > 0 ? (row.totalScore / maxScore * 100) : 0;
  var segsHtml = '';
  if (row.totalScore > 0) {
    CONFIG.ROUND_ORDER.forEach(function(type) {
      var s = row.rounds[type] || 0;
      var pct = (s / row.totalScore) * 100;
      if (pct > 0) {
        segsHtml += '<span class="lb-bar-seg" style="width:' + pct + '%;background:' + ROUND_COLORS[type] + '"></span>';
      }
    });
  }
  return '<div class="lb-bar"><div class="lb-bar-fill" style="width:' + barPct + '%">' +
    '<div class="lb-bar-gold"></div>' +
    '<div class="lb-bar-segs">' + segsHtml + '</div>' +
    '</div></div>';
}

function renderRaceChart(container) {
  var filter = state.leaderboardFilter;
  var games = state.games.filter(function(g) {
    if (!g.finished) return false;
    if (CONFIG.ROUND_ORDER.indexOf(g.type) === -1) return false;
    if (filter !== 'cumulative' && g.type !== filter) return false;
    return true;
  });
  games.sort(function(a, b) {
    var ka = getDateSortKey(a.date), kb = getDateSortKey(b.date);
    return ka > kb ? 1 : (ka < kb ? -1 : 0);
  });
  if (games.length <= 1) { container.innerHTML = ''; return; }

  var predictions = state._allPredictions || [];
  var userLines = [];
  var maxScore = 0;

  state.users.forEach(function(user) {
    var score = 0;
    var points = [];
    games.forEach(function(game) {
      var pred = null;
      for (var p = 0; p < predictions.length; p++) {
        if (Number(predictions[p].userId) === user.userId && predictions[p].gameId === game.id) {
          pred = predictions[p]; break;
        }
      }
      if (pred && String(pred.predictedTeamId) === String(game.winner)) score++;
      points.push(score);
    });
    if (score > maxScore) maxScore = score;
    userLines.push({ userId: user.userId, name: user.name, points: points });
  });

  var M_TOP = 25, M_RIGHT = 20, M_BOTTOM = 80, M_LEFT = 35;
  var SVG_W = 800, SVG_H = window.innerWidth <= 600 ? 560 : 400;
  var CHART_W = SVG_W - M_LEFT - M_RIGHT;
  var CHART_H = SVG_H - M_TOP - M_BOTTOM;
  var CX = M_LEFT, CY = M_TOP, CB = CY + CHART_H, CR = CX + CHART_W;
  var gameCount = games.length;
  var yMax = maxScore + 1;

  function toY(s) { return CB - (s / yMax) * CHART_H; }
  function toX(i) { return CX + ((i + 1) / (gameCount + 1)) * CHART_W; }
  function gameBand(x, px, nx, flagUrl) {
    var left = px != null ? (px + x) / 2 : CX;
    var right = nx != null ? (x + nx) / 2 : CR;
    if (flagUrl) {
      return '<image href="' + flagUrl + '" x="' + left + '" y="' + CY + '" width="' + (right - left) + '" height="' + (CB - CY) + '" preserveAspectRatio="none" style="opacity:var(--rc-band-opacity,0.12)"/>';
    }
    return '<rect x="' + left + '" y="' + CY + '" width="' + (right - left) + '" height="' + (CB - CY) + '" fill="var(--border)" style="opacity:var(--rc-band-opacity,0.12)"/>';
  }

  var selUser = state.users.find(function(u) { return u.userId === state.selectedRaceUser; });
  var selName = selUser ? selUser.name : '';

  var svg = '<svg viewBox="0 0 ' + SVG_W + ' ' + SVG_H + '" xmlns="http://www.w3.org/2000/svg">' +
    '<text x="' + CX + '" y="16" fill="var(--text)" font-weight="600" font-size="13">' +
    escapeHtml(selName) + '\'s Race</text>';

  var ySteps;
  if (yMax <= 5) {
    ySteps = [];
    for (var i = 0; i <= yMax; i++) ySteps.push(i);
  } else {
    ySteps = [0, 1];
    for (var i = 3; i <= yMax; i += 2) ySteps.push(i);
  }
  ySteps.forEach(function(s) {
    var y = toY(s);
    svg += '<line x1="' + CX + '" y1="' + y + '" x2="' + CR + '" y2="' + y + '" stroke="var(--border)" stroke-width="1" stroke-dasharray="4,4"/>';
    svg += '<text x="' + (CX - 6) + '" y="' + (y + 4) + '" text-anchor="end" fill="var(--text2)" font-size="11">' + s + '</text>';
  });

  games.forEach(function(game, i) {
    var x = toX(i);
    var wId = String(game.winner), lId = String(game.team1Id) === wId ? game.team2Id : game.team1Id;
    var wF = TEAM_FLAG_MAP[wId] || '', lF = TEAM_FLAG_MAP[lId] || '';
    var prevX = i > 0 ? toX(i-1) : null;
    var nextX = i < gameCount - 1 ? toX(i+1) : null;
    svg += gameBand(x, prevX, nextX, wF);
    var wScore = String(game.team1Id) === wId ? game.score1 : game.score2;
    var lScore = String(game.team1Id) === wId ? game.score2 : game.score1;
    var wPen = String(game.team1Id) === wId ? game.penalty1 : game.penalty2;
    var lPen = String(game.team1Id) === wId ? game.penalty2 : game.penalty1;
    var isPens = wScore != null && lScore != null && wScore === lScore && game.penalty1 != null && game.penalty2 != null;
    var wSuffix = isPens ? ' (' + wPen + ')' : '';
    var lSuffix = isPens ? ' (' + lPen + ')' : '';
    var fw = 24, fh = 16, fy = CB + 10;
    var ts = 'paint-order:stroke;stroke:rgba(0,0,0,0.6);stroke-width:2px';
    // Winner flag
    if (wF) svg += '<image href="' + wF + '" x="' + (x - fw/2) + '" y="' + fy + '" width="' + fw + '" height="' + fh + '" opacity="0.3"/>';
    if (wF && wScore != null) svg += '<text x="' + x + '" y="' + (fy + fh + 12) + '" text-anchor="middle" fill="var(--accent)" font-size="12" font-weight="700" style="' + ts + '">' + wScore + (wSuffix ? '<tspan font-size="8">' + wSuffix + '</tspan>' : '') + '</text>';
    // Loser flag
    var loseFy = fy + fh + 12 + 2;
    if (lF) svg += '<image href="' + lF + '" x="' + (x - fw/2) + '" y="' + loseFy + '" width="' + fw + '" height="' + fh + '" opacity="0.3"/>';
    if (lF && lScore != null) svg += '<text x="' + x + '" y="' + (loseFy + fh + 12) + '" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" opacity="0.85" style="' + ts + '">' + lScore + (lSuffix ? '<tspan font-size="8">' + lSuffix + '</tspan>' : '') + '</text>';
  });

  userLines.forEach(function(ul) {
    if (!ul.points.length) return;
    var originX = CX, originY = toY(0);
    var pts = originX + ',' + originY + ' ' + ul.points.map(function(s, i) { return toX(i) + ',' + toY(s); }).join(' ');
    var isSel = ul.userId === state.selectedRaceUser;
    var sw = isSel ? 3 : 1.5;
    var op = isSel ? 1 : 0.25;
    svg += '<polyline fill="none" stroke="var(--accent)" stroke-width="' + sw + '" opacity="' + op + '" points="' + pts +
      '" data-user-id="' + ul.userId + '"/>';
    svg += '<circle cx="' + originX + '" cy="' + originY + '" r="2.5" fill="var(--accent)" opacity="' + op + '" data-user-id="' + ul.userId + '"/>';
    ul.points.forEach(function(s, i) {
      svg += '<circle cx="' + toX(i) + '" cy="' + toY(s) + '" r="2.5" fill="var(--accent)" opacity="' + op + '" data-user-id="' + ul.userId + '"/>';
    });
  });

  var scoreGroups = {};
  userLines.forEach(function(ul) {
    if (!ul.points.length) return;
    var s = ul.points[ul.points.length - 1];
    if (!scoreGroups[s]) scoreGroups[s] = [];
    scoreGroups[s].push(ul);
  });

  var markerSpacing = 22;
  var markerR = 10;
  var endX = toX(gameCount - 1);
  var pad = 8;
  var maxPerRow = 8;

  Object.keys(scoreGroups).forEach(function(score) {
    var group = scoreGroups[score];
    var y = toY(Number(score));
    var rows = [];
    for (var ri = 0; ri < group.length; ri += maxPerRow)
      rows.push(group.slice(ri, ri + maxPerRow));

    rows.forEach(function(row, ri) {
      var rowY = y + ri * (markerR * 2 + 4);
      var rowW = (row.length - 1) * markerSpacing;
      var startX = endX - rowW / 2;
      var minX = pad + markerR;
      var maxX = SVG_W - pad - markerR - (row.length > 1 ? rowW : 0);
      if (startX < minX) startX = minX;
      if (startX > maxX) startX = maxX;

      row.forEach(function(ul, i) {
        var x = startX + i * markerSpacing;
        var user = state.users.find(function(u) { return u.userId === ul.userId; });
        var team = user ? state.teams[user.teamId] : null;
        var flagUrl = team ? TEAM_FLAG_MAP[user.teamId] : '';
        var initial = user ? user.name.charAt(0).toUpperCase() : '?';
        var uid = ul.userId;
        var isSel = uid === state.selectedRaceUser;
        var ringColor = isSel ? 'var(--accent)' : '#ffffff';
        var ringWidth = isSel ? 1.5 : 0.75;

        svg += '<g data-user-id="' + uid + '" style="cursor:pointer">';
        svg += '<circle cx="' + x + '" cy="' + rowY + '" r="' + markerR + '" fill="var(--card-bg)" stroke="' + ringColor + '" stroke-width="' + ringWidth + '"/>';
        if (flagUrl) {
          var clipId = 'rc-clip-' + uid;
          svg += '<clipPath id="' + clipId + '"><circle cx="' + x + '" cy="' + rowY + '" r="' + (markerR - 2) + '"/></clipPath>';
          svg += '<image href="' + flagUrl + '" x="' + (x - markerR + 2) + '" y="' + (rowY - markerR + 2) + '" width="' + (2 * markerR - 4) + '" height="' + (2 * markerR - 4) + '" clip-path="url(#' + clipId + ')" preserveAspectRatio="xMidYMid slice"/>';
        }
        svg += '<text x="' + x + '" y="' + (rowY + 4) + '" text-anchor="middle" fill="#fff" font-weight="700" font-size="11" style="paint-order:stroke;stroke:rgba(0,0,0,0.6);stroke-width:1.5px">' + initial + '</text>';
        svg += '</g>';
      });
    });
  });

  svg += '</svg>';
  container.innerHTML = svg;

  container.querySelectorAll('[data-user-id]').forEach(function(el) {
    el.addEventListener('click', function() {
      state.selectedRaceUser = Number(this.dataset.userId);
      renderRaceChart(document.getElementById('race-chart-container'));
    });
  });
  container.scrollLeft = container.scrollWidth - container.clientWidth;
}

function openPlayerPredictions(userId) {
  var user = state.users.find(function(u) { return u.userId === userId; });
  if (!user) return;

  var preds = (state._allPredictions || []).filter(function(p) {
    return Number(p.userId) === userId && p.gameId;
  });

  if (!preds.length) {
    toast('No predictions yet for ' + user.name, 'error');
    return;
  }

  var correct = 0, wrong = 0, pending = 0;
  var gamesByRound = {};

  preds.forEach(function(pred) {
    var game = state.games.find(function(g) { return g.id === pred.gameId; });
    if (!game) return;

    if (!gamesByRound[game.type]) gamesByRound[game.type] = [];
    gamesByRound[game.type].push({ game: game, predictedTeamId: pred.predictedTeamId });

    if (game.finished) {
      if (String(pred.predictedTeamId) === String(game.winner)) correct++;
      else wrong++;
    } else {
      pending++;
    }
  });

  var html = '';

  html += '<div class="pp-header">' +
    '<h2>' + escapeHtml(user.name) + '\'s Predictions</h2>' +
    '<span class="pp-tally">' +
    (correct ? '&#9989;' + correct : '') +
    (wrong ? ' &#10060;' + wrong : '') +
    (pending ? ' &#9203;' + pending : '') +
    '</span>' +
    '<button class="pp-close" onclick="closeModal(\'modal-player-predictions\')">&times;</button>' +
    '</div>';

  html += '<div class="pp-body">';

  html += renderBadgeShowcase(userId);

  var hasAny = false;
  CONFIG.ROUND_ORDER.forEach(function(type) {
    var items = gamesByRound[type];
    if (!items || !items.length) return;
    hasAny = true;

    items.sort(function(a, b) {
      var ka = getDateSortKey(a.game.date);
      var kb = getDateSortKey(b.game.date);
      if (ka === kb) return parseInt(a.game.id) - parseInt(b.game.id);
      return ka < kb ? -1 : 1;
    });

    html += '<div class="pp-round">';
    html += '<div class="pp-round-title">' + (ROUND_LABELS[type] || type) + '</div>';

    var addedDivider = false;
    items.forEach(function(item) {
      if (!addedDivider && !item.game.finished) {
        html += '<div class="pp-divider"></div>';
        addedDivider = true;
      }
      html += renderPlayerGameRow(item.game, item.predictedTeamId);
    });

    html += '</div>';
  });

  if (!hasAny) {
    html += '<div class="pp-empty">No finished games with predictions yet</div>';
  }

  html += '</div>';

  document.getElementById('pp-sheet').innerHTML = html;
  showModal('modal-player-predictions');
}

function renderPlayerGameRow(game, predictedTeamId) {
  var statusIcon;
  if (game.finished && predictedTeamId) {
    statusIcon = String(predictedTeamId) === String(game.winner) ? '&#9989;' : '&#10060;';
  } else {
    statusIcon = '&#9203;';
  }

  return '<div class="pp-game">' +
    '<span class="pp-status">' + statusIcon + '</span>' +
    '<div class="pp-game-teams">' +
    renderCompactTeam(game, 'team1', predictedTeamId) +
    '<span class="pp-vs">' + (game.finished ? '-' : 'vs') + '</span>' +
    renderCompactTeam(game, 'team2', predictedTeamId) +
    '</div></div>';
}

function renderCompactTeam(game, side, predictedTeamId) {
  var id = side === 'team1' ? game.team1Id : game.team2Id;
  var name = side === 'team1' ? game.team1Name : game.team2Name;
  var score = side === 'team1' ? game.score1 : game.score2;
  var winId = game.winner;

  if (!id || id === '0') {
    return '<div class="pp-team"><span>' + (name || 'TBD') + '</span></div>';
  }

  var team = state.teams[id];
  var flagUrl = team ? TEAM_FLAG_MAP[id] : '';
  var teamName = team ? team.name_en : (name || 'Team ' + id);
  var isWinner = game.finished && String(id) === String(winId);
  var isLoser = game.finished && String(id) !== String(winId) && winId !== null;
  var isPredicted = predictedTeamId && String(id) === String(predictedTeamId);

  var cls = 'pp-team';
  if (game.finished && isWinner) cls += ' winner';
  if (game.finished && isLoser) cls += ' loser';
  if (isPredicted) cls += ' predicted';

  return '<div class="' + cls + '">' +
    (flagUrl ? '<img src="' + flagUrl + '" alt="" loading="lazy">' : '') +
    '<span>' + escapeHtml(teamName) + (isPredicted ? ' \u2713' : '') + '</span>' +
    (game.finished ? '<span class="pp-score">' + (score || '0') + '</span>' : '') +
    '</div>';
}

function showTeamPopup(teamId) {
  var team = state.teams[teamId];
  if (!team) return;

  var rank = state.rankings[team.name_en] || state.rankings[team.name_en.replace(/['\u2019]/g, "'")] || 'N/A';
  var region = CONFIG.REGION_MAP[team.name_en] || '';
  var flagUrl = TEAM_FLAG_MAP[teamId];
  var kitUrl = CONFIG.KIT_IMAGES[teamId] || localStorage.getItem('kit_' + teamId) || '';
  if (kitUrl && !CONFIG.KIT_IMAGES[teamId]) {
    CONFIG.KIT_IMAGES[teamId] = kitUrl;
  }

  var pastGames = state.games.filter(function(g) {
    return g.finished && (String(g.team1Id) === String(teamId) || String(g.team2Id) === String(teamId));
  }).slice(-6);

  var html = '<button class="tp-close" onclick="closeModal(\'modal-team-popup\')">&times;</button>' +
    '<div class="tp-header">' +
    (flagUrl ? '<img src="' + flagUrl + '" alt="">' : '') +
    '<h2>' + escapeHtml(team.name_en) + '</h2>' +
    '</div>' +
    '<div class="tp-info">' +
    '<div class="item"><div class="label">FIFA Ranking</div><div class="value">' + rank + '</div></div>' +
    '<div class="item"><div class="label">Region</div><div class="value">' + region + '</div></div>' +
    '</div>' +
    '<div class="tp-map-row">' +
    '<div class="tp-map"><div id="team-map" style="height:200px;border-radius:6px;background:var(--bg3)"></div></div>' +
    (kitUrl ? '<div class="tp-kit"><h3>Kit</h3><img src="' + escapeHtml(kitUrl) + '" alt="Kit" onclick="openKitLightbox(this.src)"></div>' : '') +
    '</div>';

  if (pastGames.length) {
    html += '<div class="tp-results"><h3>Recent Results</h3>';
    pastGames.sort(function(a, b) { return parseInt(b.id) - parseInt(a.id); });
    pastGames.forEach(function(g) {
      var opponentId = String(g.team1Id) === String(teamId) ? g.team2Id : g.team1Id;
      var opponent = state.teams[opponentId];
      var oppName = opponent ? opponent.name_en : 'Unknown';
      var ourScore = String(g.team1Id) === String(teamId) ? g.score1 : g.score2;
      var oppScore = String(g.team1Id) === String(teamId) ? g.score2 : g.score1;
      var resultClass = parseInt(ourScore) > parseInt(oppScore) ? 'win' : (parseInt(ourScore) < parseInt(oppScore) ? 'loss' : 'draw');
      var resultLabel = parseInt(ourScore) > parseInt(oppScore) ? 'W' : (parseInt(ourScore) < parseInt(oppScore) ? 'L' : 'D');
      html += '<div class="result-item"><span class="' + resultClass + '">[' + resultLabel + ']</span> ' +
        escapeHtml(oppName) + ' ' + ourScore + '-' + oppScore + '</div>';
    });
    html += '</div>';
  }

  document.getElementById('team-popup-body').innerHTML = html;
  showModal('modal-team-popup');

  if (!kitUrl) {
    fetchKitImage(teamId);
  }

  setTimeout(function() {
    var mapDiv = document.getElementById('team-map');
    if (mapDiv) {
      initTeamMap(team, mapDiv);
    }
  }, 200);
}

function fetchKitImage(teamId) {
  var team = state.teams[teamId];
  if (!team) return;

  var searchName = CONFIG.SPORTSDB_MAP[team.name_en] || team.name_en;
  var apiUrl = 'https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=' + encodeURIComponent(searchName);

  fetch(apiUrl)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.teams && data.teams[0] && data.teams[0].strEquipment) {
        var kitUrl = data.teams[0].strEquipment;
        CONFIG.KIT_IMAGES[teamId] = kitUrl;
        localStorage.setItem('kit_' + teamId, kitUrl);

        var popup = document.getElementById('modal-team-popup');
        if (popup && popup.classList.contains('active')) {
          var row = document.getElementById('team-popup-body').querySelector('.tp-map-row');
          if (row && !row.querySelector('.tp-kit')) {
            var el = document.createElement('div');
            el.className = 'tp-kit';
            el.innerHTML = '<h3>Kit</h3><img src="' + escapeHtml(kitUrl) + '" alt="Kit" onclick="openKitLightbox(this.src)">';
            row.appendChild(el);
          }
        }
      }
    })
    .catch(function(err) { console.error('Kit fetch error:', err); });
}

function openKitLightbox(src) {
  var img = document.getElementById('kit-lightbox-img');
  if (img) {
    img.src = src;
    showModal('modal-kit-lightbox');
  }
}

function initTeamMap(team, mapDiv) {
  var teamColor = CONFIG.TEAM_COLORS[team.id] || '#e8b830';
  fetch('https://nominatim.openstreetmap.org/search?country=' + encodeURIComponent(team.name_en) + '&format=json&limit=1&polygon_geojson=1')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data[0]) {
        var loc = data[0];
        mapDiv.innerHTML = '';
        var map = L.map(mapDiv, { zoomControl: true, attributionControl: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18
        }).addTo(map);
        map.setView([parseFloat(loc.lat), parseFloat(loc.lon)], 5);

        if (loc.geojson) {
          var geoLayer = L.geoJSON(loc.geojson, {
            style: {
              color: teamColor,
              weight: 2,
              fillColor: teamColor,
              fillOpacity: 0.2
            }
          }).addTo(map);
          map.fitBounds(geoLayer.getBounds());
        } else {
          var bounds = loc.boundingbox;
          if (bounds) {
            try {
              map.fitBounds([
                [parseFloat(bounds[0]), parseFloat(bounds[2])],
                [parseFloat(bounds[1]), parseFloat(bounds[3])]
              ]);
            } catch(e) {}
          }
        }
      } else {
        mapDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">Map unavailable</div>';
      }
    })
    .catch(function() {
      mapDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">Map unavailable</div>';
    });
}

function computeStreakHistory(userId, games, predictions) {
  var streak = 0;
  var slots = [];
  for (var g = 0; g < games.length; g++) {
    var game = games[g];
    var pred = null;
    for (var p = 0; p < predictions.length; p++) {
      if (Number(predictions[p].userId) === userId && predictions[p].gameId === game.id) {
        pred = predictions[p]; break;
      }
    }
    if (!pred) { slots.push(null); streak = 0; }
    else if (String(pred.predictedTeamId) === String(game.winner)) {
      streak++;
      slots.push({ r: 1, s: streak });
    }
    else { slots.push({ r: 0 }); streak = 0; }
  }
  return slots;
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
