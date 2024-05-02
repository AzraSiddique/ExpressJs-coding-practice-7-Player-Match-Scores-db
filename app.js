const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());

let db = null;
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("The server is running at http://localhost/3000/");
    });
  } catch (e) {
    console.log(`DB error is ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertToResponse = (object) => {
  return {
    playerId: object.player_id,
    playerName: object.player_name,
    matchId: object.match_id,
    match: object.match,
    year: object.year,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayerQuery = `
    SELECT * 
    FROM player_details
    ORDER BY player_id;`;
  const dbResponse = await db.all(getPlayerQuery);
  response.send(dbResponse.map((player) => convertToResponse(player)));
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerDetailsQuery = `
  SELECT *
  FROM player_details
  WHERE player_id=${playerId};`;
  const dbResponse = await db.get(getPlayerDetailsQuery);
  response.send(convertToResponse(dbResponse));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
  UPDATE player_details
  SET
  player_name='${playerName}'
  WHERE player_id=${playerId};
  `;
  const dbResponse = await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchQuery = `
  SELECT *
  FROM match_details
  WHERE match_id=${matchId};`;
  const dbResponse = await db.get(matchQuery);
  response.send(convertToResponse(dbResponse));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesQuery = `
    SELECT match_details.match_id AS matchId,match_details.match, match_details.year 
    FROM match_details
    NATURAL JOIN player_match_score
    WHERE player_id=${playerId};`;

  const dbResponse = await db.all(getMatchesQuery);
  response.send(dbResponse);
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersQuery = `
    SELECT player_details.player_id AS playerId,
    player_details.player_name AS playerName
    FROM player_details NATURAL JOIN player_match_score
    WHERE match_id=${matchId};
    `;

  const dbResponse = await db.all(getPlayersQuery);
  response.send(dbResponse);
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayersQuery = `
    SELECT player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(player_match_score.fours) AS totalFours, 
    SUM(player_match_score.sixes) AS totalSixes 
    FROM player_details INNER JOIN player_match_score
    ON player_details.player_id=player_match_score.player_id
    WHERE player_details.player_id=${playerId}
    `;

  const dbResponse = await db.get(getPlayersQuery);
  response.send(dbResponse);
});

module.exports = app;
