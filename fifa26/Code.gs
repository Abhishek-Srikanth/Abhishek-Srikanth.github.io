
var ROUND_ORDER = ['r32', 'r16', 'qf', 'sf', 'third', 'final'];

function doGet(e) {
  var action = e.parameter.action;
  var result;

  if (action === 'checkMasterPassword') {
    result = handleCheckMasterPassword(e);
  } else if (action === 'getUsers') {
    result = handleGetUsers();
  } else if (action === 'authenticate') {
    result = handleAuthenticate(e);
  } else if (action === 'getPredictions') {
    result = handleGetPredictions(e);
  } else if (action === 'getLeaderboard') {
    result = handleGetLeaderboard();
  } else {
    result = { success: false, error: 'Unknown action' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var result;

  if (action === 'checkMasterPassword') {
    result = handleCheckMasterPassword(data);
  } else if (action === 'registerUser') {
    result = handleRegisterUser(data);
  } else if (action === 'submitPrediction') {
    result = handleSubmitPrediction(data);
  } else if (action === 'deletePrediction') {
    result = handleDeletePrediction(data);
  } else if (action === 'saveHighlight') {
    result = handleSaveHighlight(data);
  } else {
    result = { success: false, error: 'Unknown action' };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

function findSections(sheet) {
  var data = sheet.getDataRange().getValues();
  var sections = { users: -1, predictions: -1, highlights: -1 };
  for (var i = 0; i < data.length; i++) {
    var val = String(data[i][0]).trim().toUpperCase();
    if (val === 'USERS' && sections.users === -1) sections.users = i;
    if (val === 'PREDICTIONS' && sections.predictions === -1) sections.predictions = i;
    if (val === 'HIGHLIGHTS' && sections.highlights === -1) sections.highlights = i;
  }
  return sections;
}

function getNextRowInSection(sheet, sectionIndex, nextSectionNames) {
  var vals = sheet.getDataRange().getValues();

  var nextSectionIdx = vals.length;
  for (var i = sectionIndex + 1; i < vals.length; i++) {
    var val = String(vals[i][0]).trim().toUpperCase();
    for (var n = 0; n < nextSectionNames.length; n++) {
      if (val === nextSectionNames[n]) {
        nextSectionIdx = i;
        break;
      }
    }
    if (nextSectionIdx < vals.length) break;
  }

  var lastOccupied = sectionIndex;
  for (var i = sectionIndex + 1; i < nextSectionIdx; i++) {
    if (vals[i][1] && String(vals[i][1]).trim() !== '') {
      lastOccupied = i;
    }
  }

  var insertIdx = lastOccupied + 1;
  if (insertIdx >= nextSectionIdx && nextSectionIdx < vals.length) {
    sheet.insertRowBefore(nextSectionIdx + 1);
    return getNextRowInSection(sheet, sectionIndex, nextSectionNames);
  }

  return insertIdx + 1;
}

function handleCheckMasterPassword(e) {
  var sheet = getSheet();
  var stored = String(sheet.getRange('B1').getValue()).trim();
  if (stored === '' || stored === 'ENTER_YOUR_PASSWORD_HERE') {
    return { success: false, error: 'Master password not configured in cell B1' };
  }
  // Accept password from GET (e.parameter) or POST (e.password)
  var password = e.parameter ? e.parameter.password : e.password;
  return { success: password === stored };
}

function handleGetUsers() {
  var sheet = getSheet();
  var sections = findSections(sheet);
  if (sections.users === -1) return { success: false, error: 'USERS section not found' };

  var data = sheet.getDataRange().getValues();
  var users = [];
  for (var i = sections.users + 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]).trim().toUpperCase() === 'PREDICTIONS') break;
    if (!row[1] || String(row[1]).trim() === '') continue;
    users.push({
      userId: Number(row[1]),
      name: String(row[2]).trim(),
      teamId: Number(row[3]),
      jerseyNumber: Number(row[4])
    });
  }
  return { success: true, data: users };
}

function handleAuthenticate(e) {
  var users = handleGetUsers().data || [];
  var name = (e.parameter.name || '').trim();
  var jersey = e.parameter.jerseyNumber;

  var user = users.find(function(u) {
    return u.name === name && String(u.jerseyNumber) === String(jersey);
  });
  if (user) return { success: true, userId: user.userId };
  return { success: false, error: 'Name and jersey number do not match' };
}

function handleRegisterUser(data) {
  var sheet = getSheet();
  var sections = findSections(sheet);
  if (sections.users === -1) return { success: false, error: 'USERS section not found' };

  var users = handleGetUsers().data || [];
  var name = (data.name || '').trim();
  if (!name) return { success: false, error: 'Name is required' };
  if (!data.teamId) return { success: false, error: 'Team selection required' };
  if (!data.jerseyNumber) return { success: false, error: 'Jersey number required' };

  var taken = users.find(function(u) {
    return String(u.jerseyNumber) === String(data.jerseyNumber);
  });
  if (taken) return { success: false, error: 'Jersey number already taken' };

  var maxId = users.reduce(function(m, u) { return Math.max(m, u.userId); }, 0);
  var newId = maxId + 1;

  var insertRow = getNextRowInSection(sheet, sections.users, ['PREDICTIONS', 'HIGHLIGHTS', 'MASTER_PASS']);
  sheet.getRange(insertRow, 1, 1, 5).setValues([
    ['', newId, name, Number(data.teamId), Number(data.jerseyNumber)]
  ]);

  return { success: true, userId: newId };
}

function readPredictions(sheet, sections) {
  if (sections.predictions === -1) return [];
  var data = sheet.getDataRange().getValues();
  var predictions = [];
  for (var i = sections.predictions + 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]).trim().toUpperCase() === 'HIGHLIGHTS') break;
    if (!row[1] || String(row[1]).trim() === '') continue;
    predictions.push({
      predictionId: Number(row[1]),
      userId: Number(row[2]),
      gameId: String(row[3]),
      predictedTeamId: String(row[4])
    });
  }
  return predictions;
}

function handleGetPredictions(e) {
  var sheet = getSheet();
  var sections = findSections(sheet);
  var all = readPredictions(sheet, sections);
  var userId = e.parameter.userId ? Number(e.parameter.userId) : null;

  if (userId !== null) {
    return { success: true, data: all.filter(function(p) { return p.userId === userId; }) };
  }
  return { success: true, data: all };
}

function fetchGames() {
  try {
    var resp = UrlFetchApp.fetch('https://worldcup26.ir/get/games', {
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' }
    });
    var data = JSON.parse(resp.getContentText());
    if (data && data.games) {
      return data.games.map(function(g) {
        var winner = null;
        if (g.finished === 'TRUE') {
          var hs = parseInt(g.home_score);
          var as = parseInt(g.away_score);
          if (hs > as) winner = g.home_team_id;
          else if (as > hs) winner = g.away_team_id;
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
          local_date: g.local_date || null
        };
      });
    }
  } catch(e) {}
  return null;
}

function getWinner(game) {
  if (!game.finished) return null;
  var s1 = parseInt(game.score1);
  var s2 = parseInt(game.score2);
  if (s1 > s2) return game.team1Id;
  if (s2 > s1) return game.team2Id;
  return null;
}

function getPrevRound(round) {
  if (round === 'final' || round === 'third') return 'sf';
  var idx = ROUND_ORDER.indexOf(round);
  if (idx <= 0) return null;
  return ROUND_ORDER[idx - 1];
}

function handleSubmitPrediction(data) {
  var sheet = getSheet();
  var sections = findSections(sheet);
  if (sections.predictions === -1) return { success: false, error: 'PREDICTIONS section not found' };

  var userId = Number(data.userId);
  var gameId = String(data.gameId);
  var predictedTeamId = String(data.predictedTeamId);

  if (!userId || !gameId || !predictedTeamId) {
    return { success: false, error: 'Invalid prediction data' };
  }

  var games = fetchGames();
  if (!games) return { success: false, error: 'Failed to fetch game data' };

  var game = games.find(function(g) { return g.id === gameId; });
  if (!game) return { success: false, error: 'Game not found' };
  if (game.finished) return { success: false, error: 'Game already completed' };

  var round = game.type;
  if (!round) return { success: false, error: 'Unknown game round' };

  if (round !== 'r32') {
    var prv = getPrevRound(round);
    var prevGames = games.filter(function(g) { return g.type === prv; });
    var allDone = prevGames.every(function(g) { return g.finished; });
    if (!allDone) return { success: false, error: 'Previous round not complete' };
  }

  var allPicks = readPredictions(sheet, sections);
  var existing = allPicks.find(function(p) { return p.userId === userId && p.gameId === gameId; });

  var vals = sheet.getDataRange().getValues();

  if (existing) {
    for (var ri = sections.predictions + 1; ri < vals.length; ri++) {
      if (Number(vals[ri][1]) === existing.predictionId) {
        sheet.getRange(ri + 1, 5).setValue(predictedTeamId);
        return { success: true, updated: true };
      }
    }
  }

  var maxId = allPicks.reduce(function(m, p) { return Math.max(m, p.predictionId); }, 0);
  var insertRow = getNextRowInSection(sheet, sections.predictions, ['HIGHLIGHTS', 'MASTER_PASS']);
  sheet.getRange(insertRow, 1, 1, 6).setValues([
    ['', maxId + 1, userId, gameId, predictedTeamId, 1]
  ]);

  return { success: true, updated: false };
}

function handleDeletePrediction(data) {
  var sheet = getSheet();
  var sections = findSections(sheet);
  if (sections.predictions === -1) return { success: false, error: 'PREDICTIONS section not found' };

  var userId = Number(data.userId);
  var gameId = String(data.gameId);
  if (!userId || !gameId) return { success: false, error: 'userId and gameId required' };

  var vals = sheet.getDataRange().getValues();
  for (var i = sections.predictions + 1; i < vals.length; i++) {
    var row = vals[i];
    if (String(row[0]).trim().toUpperCase() === 'HIGHLIGHTS') break;
    if (!row[1] || String(row[1]).trim() === '') continue;
    if (Number(row[2]) === userId && String(row[3]) === gameId) {
      sheet.getRange(i + 1, 1, 1, 6).clearContent();
      return { success: true };
    }
  }
  return { success: false, error: 'Prediction not found' };
}

function handleSaveHighlight(data) {
  var sheet = getSheet();
  var sections = findSections(sheet);
  if (sections.highlights === -1) return { success: false, error: 'HIGHLIGHTS section not found' };

  var gameId = String(data.gameId);
  var url = String(data.url).trim();
  if (!gameId || !url) return { success: false, error: 'gameId and url required' };

  var vals = sheet.getDataRange().getValues();
  for (var i = sections.highlights + 1; i < vals.length; i++) {
    if (String(vals[i][1]) === gameId) {
      sheet.getRange(i + 1, 3).setValue(url);
      return { success: true };
    }
  }

  var insertRow = getNextRowInSection(sheet, sections.highlights, ['MASTER_PASS']);
  sheet.getRange(insertRow, 1, 1, 3).setValues([['', gameId, url]]);
  return { success: true };
}

function handleGetLeaderboard() {
  var users = handleGetUsers().data || [];
  var sheet = getSheet();
  var sections = findSections(sheet);
  var predictions = readPredictions(sheet, sections);
  var games = fetchGames();
  if (!games) return { success: false, error: 'Failed to fetch game data' };

  var scores = {};
  users.forEach(function(u) { scores[u.userId] = { name: u.name, totalScore: 0, correctCount: 0 }; });

  for (var pi = 0; pi < predictions.length; pi++) {
    var pred = predictions[pi];
    if (!scores[pred.userId]) continue;
    var game = games.find(function(g) { return g.id === pred.gameId; });
    if (!game || !game.finished) continue;
    var w = getWinner(game);
    if (w && String(w) === pred.predictedTeamId) {
      scores[pred.userId].totalScore++;
      scores[pred.userId].correctCount++;
    }
  }

  var result = Object.keys(scores).map(function(uid) {
    return {
      userId: Number(uid),
      name: scores[uid].name,
      totalScore: scores[uid].totalScore,
      correctCount: scores[uid].correctCount
    };
  });
  result.sort(function(a, b) { return b.totalScore - a.totalScore || a.name.localeCompare(b.name); });
  result.forEach(function(r, i) { r.rank = i + 1; });

  return { success: true, data: result };
}
