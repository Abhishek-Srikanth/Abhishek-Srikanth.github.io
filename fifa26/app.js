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

  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      var target = document.getElementById('tab-' + this.dataset.tab);
      target.classList.add('active');
      if (this.dataset.tab === 'bracket') renderBracket();
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
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : game.date;

  var stadium = game.stadiumId ? state.stadiums[game.stadiumId] : null;
  if (!stadium) return localStr;

  var countryClass = '';
  if (stadium.country_en === 'Mexico') countryClass = 'mexico';
  else if (stadium.country_en === 'Canada') countryClass = 'canada';
  else countryClass = 'usa';

  return '<span class="stadium-name ' + countryClass + '">' + escapeHtml(stadium.name_en) + '</span> \u2014 ' + localStr;
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
  renderBracket();
}

function renderBracket() {
  var container = document.getElementById('bracket-view');
  container.innerHTML = '<div class="loading">&#9917;</div>';

  if (!state.games.length || !state.teamsArr.length) {
    return;
  }

  if (state.currentUser) {
    apiGet({ action: 'getPredictions', userId: state.currentUser.userId }).then(function(res) {
      if (res.success) state.predictions = res.data;
      else state.predictions = [];
      renderBracketHTML(container);
    });
  } else {
    state.predictions = [];
    renderBracketHTML(container);
  }
}

var ROUND_LABELS = {
  r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-finals',
  sf: 'Semi-finals', third: '3rd Place', final: 'Final'
};

function getPrevRound(round) {
  if (round === 'final' || round === 'third') return 'sf';
  var idx = CONFIG.ROUND_ORDER.indexOf(round);
  if (idx <= 0) return null;
  return CONFIG.ROUND_ORDER[idx - 1];
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

function renderBracketHTML(container) {
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
    var isCurrent = type === currentRound;

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

function renderGameCard(game, isCurrent, allDone, isInteractiveRound) {
  var team1Known = game.team1Id && game.team1Id !== '0';
  var team2Known = game.team2Id && game.team2Id !== '0';
  var canPredict = isCurrent && team1Known && team2Known && !game.finished;
  var existingPred = state.predictions.find(function(p) { return p.gameId === game.id; });

  var cardClass = 'game-card';
  if (game.finished) {
    cardClass += ' completed';
    var pred = state.predictions.find(function(p) { return p.gameId === game.id; });
    if (!pred) cardClass += ' no-pick';
    else if (pred.predictedTeamId === game.winner) cardClass += ' correct';
    else cardClass += ' wrong';
  } else if (canPredict) cardClass += ' current';
  else if (!game.finished) cardClass += ' locked';

  var html = '<div class="' + cardClass + '" data-game-id="' + game.id + '">';

  html += '<div class="game-teams">';
  html += renderTeamSlot(game, 'team1', team1Known, canPredict, existingPred ? existingPred.predictedTeamId : null);
  html += '<span class="vs">vs</span>';
  html += renderTeamSlot(game, 'team2', team2Known, canPredict, existingPred ? existingPred.predictedTeamId : null);
  html += '</div>';

  if (game.date) {
    html += '<div class="game-info game-info-dt">' + formatGameDate(game) + '</div>';
  }
  if (canPredict && existingPred) {
    var pickName = existingPred.predictedTeamId === game.team1Id
      ? (state.teams[game.team1Id] ? state.teams[game.team1Id].name_en : 'Team 1')
      : (state.teams[game.team2Id] ? state.teams[game.team2Id].name_en : 'Team 2');
    html += '<div class="game-info">Your pick: ' + escapeHtml(pickName) + '</div>';
  } else if (canPredict) {
    html += renderPredictionControls(game);
  }

  if (game.finished) {
    html += renderUserPredictionResult(game);
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
      '<span>' + escapeHtml(teamName) + (predictedTeamId && String(id) === String(predictedTeamId) ? ' \u2713' : '') + '</span>' +
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

function renderUserPredictionResult(game) {
  var pred = state.predictions.find(function(p) { return p.gameId === game.id; });
  if (!pred) return '';

  var correct = pred.predictedTeamId === game.winner;
  var icon = correct ? '\u2705' : '\u274c';
  var label = correct ? 'Correct!' : 'Wrong';
  var cls = correct ? 'win' : 'loss';

  return '<div class="game-info">' +
    '<span class="' + cls + '">' + icon + ' You predicted: ' + (state.teams[pred.predictedTeamId] ? state.teams[pred.predictedTeamId].name_en : 'Team ' + pred.predictedTeamId) + ' ' + label + '</span>' +
    '</div>';
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
      renderBracket();
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
      renderBracket();
    } else {
      toast(res.error || 'Failed to delete', 'error');
      btn.disabled = false;
      btn.textContent = 'Delete';
    }
  });
};

function renderLeaderboard() {
  var container = document.getElementById('leaderboard-view');
  container.innerHTML = '<div class="loading">&#9917;</div>';

  apiGet({ action: 'getPredictions' }).then(function(res) {
    if (!res.success || !res.data) {
      container.innerHTML = '<p style="text-align:center;color:var(--text2)">Failed to load leaderboard</p>';
      return;
    }

    var allPredictions = res.data;
    state._allPredictions = allPredictions;

    var scores = {};
    state.users.forEach(function(u) {
      scores[u.userId] = { name: u.name, totalScore: 0, correctCount: 0 };
    });

    allPredictions.forEach(function(pred) {
      if (!scores[pred.userId]) return;
      var game = state.games.find(function(g) { return g.id === pred.gameId; });
      if (!game || !game.finished) return;
      if (game.winner && String(game.winner) === pred.predictedTeamId) {
        scores[pred.userId].totalScore++;
        scores[pred.userId].correctCount++;
      }
    });

    var result = Object.keys(scores).map(function(uid) {
      return {
        userId: Number(uid),
        name: scores[uid].name,
        totalScore: scores[uid].totalScore,
        correctCount: scores[uid].correctCount
      };
    });
    result.sort(function(a, b) {
      return b.totalScore - a.totalScore || a.name.localeCompare(b.name);
    });
    result.forEach(function(r, i) { r.rank = i + 1; });

    if (!result.length) {
      container.innerHTML = '<p style="text-align:center;color:var(--text2)">No predictions yet</p>';
      return;
    }

    var maxScore = result[0].totalScore;

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

      var barPct = maxScore > 0 ? (row.totalScore / maxScore * 100) : 0;

      html += '<div class="lb-card' + (isMe ? ' me' : '') + '" data-user-id="' + row.userId + '">' +
        '<div class="lb-main">' +
        '<span class="' + rankClass + '">' + rankStr + '</span>' +
        (flagUrl ? '<img class="lb-flag" src="' + flagUrl + '" alt="" loading="lazy">' : '') +
        '<span class="lb-name">' + escapeHtml(row.name) + '</span>' +
        '<span class="lb-score">' + row.correctCount + '</span>' +
        '</div>' +
        '<div class="lb-bar"><div class="lb-bar-fill" style="width:' + barPct + '%"></div></div>' +
        '</div>';
    });

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.lb-card').forEach(function(card) {
      card.addEventListener('click', function() {
        openPlayerPredictions(Number(this.dataset.userId));
      });
    });
  });
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

  var hasAny = false;
  CONFIG.ROUND_ORDER.forEach(function(type) {
    var items = gamesByRound[type];
    if (!items || !items.length) return;
    hasAny = true;

    items.sort(function(a, b) { return parseInt(a.game.id) - parseInt(b.game.id); });

    html += '<div class="pp-round">';
    html += '<div class="pp-round-title">' + (ROUND_LABELS[type] || type) + '</div>';

    items.forEach(function(item) {
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
  var kitUrl = CONFIG.KIT_IMAGES[teamId] || '';

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
    '<div class="tp-map"><div id="team-map" style="height:200px;border-radius:6px;background:var(--bg3)"></div></div>';

  if (kitUrl) {
    html += '<div class="tp-kit"><h3>Kit</h3><img src="' + escapeHtml(kitUrl) + '" alt="Kit"></div>';
  }

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

  setTimeout(function() {
    var mapDiv = document.getElementById('team-map');
    if (mapDiv) {
      initTeamMap(team, mapDiv);
    }
  }, 200);
}

function initTeamMap(team, mapDiv) {
  fetch('https://nominatim.openstreetmap.org/search?country=' + encodeURIComponent(team.name_en) + '&format=json&limit=1')
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
        var bounds = loc.boundingbox;
        if (bounds) {
          try {
            map.fitBounds([
              [parseFloat(bounds[0]), parseFloat(bounds[2])],
              [parseFloat(bounds[1]), parseFloat(bounds[3])]
            ]);
          } catch(e) {}
        }
      } else {
        mapDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">Map unavailable</div>';
      }
    })
    .catch(function() {
      mapDiv.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2)">Map unavailable</div>';
    });
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', init);
