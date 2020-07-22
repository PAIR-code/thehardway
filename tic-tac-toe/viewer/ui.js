/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

// Struct for all the stats we will track.
let gameStats = {
  agent1: {
    first: {
      games: 0,
      asX: 0,
      asO: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      dqs: 0,
    },
    second: {
      games: 0,
      asX: 0,
      asO: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      dqs: 0,
    }
  },
  agent2: {
    first: {
      games: 0,
      asX: 0,
      asO: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      dqs: 0,
    },
    second: {
      games: 0,
      asX: 0,
      asO: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      dqs: 0,
    }
  },
};

const initialState = JSON.parse(JSON.stringify(gameStats));

/*
 * Initialize the UI state.
 */
export function initUiState(agent1, agent2) {
  d3.select('#agent1 .agent-name').text(agent1.name);
  d3.select('#agent2 .agent-name').text(agent2.name);
}

/*
 * Helper function to update stats for an agent. Updates one section
 * of stats at a time.
 */
function updateAgentStats(agent, order, gameStats) {
  const agentDomId = agent === 'agent1' ? 'a1' : 'a2';
  const selectorPrefix = `#${agentDomId}-${order}`;

  const winPercent = gameStats[agent][order].games > 0 ?
      `${
          (gameStats[agent][order].wins / gameStats[agent][order].games * 100)
              .toFixed(1)}%` :
      0;
  const lossPercent = gameStats[agent][order].games > 0 ?
      `${
          (gameStats[agent][order].losses / gameStats[agent][order].games * 100)
              .toFixed(1)}%` :
      0;
  const tiePercent = gameStats[agent][order].games > 0 ?
      `${
          (gameStats[agent][order].ties / gameStats[agent][order].games * 100)
              .toFixed(1)}%` :
      0;
  const dqPercent = gameStats[agent][order].games > 0 ?
      `${
          (gameStats[agent][order].dqs / gameStats[agent][order].games * 100)
              .toFixed(1)}%` :
      0;

  d3.select(`${selectorPrefix}-games`).text(gameStats[agent][order].games);
  d3.select(`${selectorPrefix}-x-games`).text(gameStats[agent][order].asX);
  d3.select(`${selectorPrefix}-o-games`).text(gameStats[agent][order].asO);
  d3.select(`${selectorPrefix}-win`)
      .text(`${gameStats[agent][order].wins} (${winPercent})`);
  d3.select(`${selectorPrefix}-loss`)
      .text(`${gameStats[agent][order].losses} (${lossPercent})`);
  d3.select(`${selectorPrefix}-ties`)
      .text(`${gameStats[agent][order].ties} (${tiePercent})`);
  d3.select(`${selectorPrefix}-dq`).text(`${gameStats[agent][order].dqs} (${dqPercent})`);
}

/**
 * Update the display of stats for each agent.
 */
export function updateStatsUI() {
  updateAgentStats('agent1', 'first', gameStats);
  updateAgentStats('agent1', 'second', gameStats);
  updateAgentStats('agent2', 'first', gameStats);
  updateAgentStats('agent2', 'second', gameStats);

  // Update the overall winrates.
  const agent1Wins = gameStats.agent1.first.wins + gameStats.agent1.second.wins;
  const agent2Wins = gameStats.agent2.first.wins + gameStats.agent2.second.wins;

  const agent1Ties = gameStats.agent1.first.ties + gameStats.agent1.second.ties;
  const agent2Ties = gameStats.agent2.first.ties + gameStats.agent2.second.ties;

  const totalGames =
      gameStats.agent1.first.games + gameStats.agent1.second.games;
  if (totalGames > 0) {
    const agent1WinRate = (agent1Wins / totalGames * 100).toFixed(1);
    const agent2WinRate = (agent2Wins / totalGames * 100).toFixed(1);

    const agent1TieRate = (agent1Ties / totalGames * 100).toFixed(1);
    const agent2TieRate = (agent2Ties / totalGames * 100).toFixed(1);

    d3.select('#a1-win-rate-overall').text(`${agent1WinRate}%`);
    d3.select('#a2-win-rate-overall').text(`${agent2WinRate}%`);

    d3.select('#a1-tie-rate-overall').text(`${agent1TieRate}%`);
    d3.select('#a2-tie-rate-overall').text(`${agent2TieRate}%`);
  }
}

/**
 * Update stats for each agent.
 */
export function updateStats(winState, errorState, game, agent1, agent2) {
  if (game.firstPlayer === agent1) {
    //
    // Update gameStats.agent1.first
    //
    gameStats.agent1.first.games += 1;
    if (agent1.symbol === 'x') {
      gameStats.agent1.first.asX += 1;
    } else {
      gameStats.agent1.first.asO += 1;
    }

    if (winState.hasWinner && winState.winningPlayer === agent1) {
      gameStats.agent1.first.wins += 1;
    }
    if (winState.hasWinner && winState.winningPlayer !== agent1) {
      gameStats.agent1.first.losses += 1;
    }
    if (errorState.hasError && errorState.disqualifiedPlayer === agent1) {
      gameStats.agent1.first.dqs += 1;
    }
    if (!winState.hasWinner && !errorState.hasError) {
      gameStats.agent1.first.ties += 1;
    }

    //
    // Update gameStats.agent2.second
    //
    gameStats.agent2.second.games += 1;
    if (agent2.symbol === 'x') {
      gameStats.agent2.second.asX += 1;
    } else {
      gameStats.agent2.second.asO += 1;
    }
    if (winState.hasWinner && winState.winningPlayer === agent2) {
      gameStats.agent2.second.wins += 1;
    }
    if (winState.hasWinner && winState.winningPlayer !== agent2) {
      gameStats.agent2.second.losses += 1;
    }
    if (errorState.hasError && errorState.disqualifiedPlayer === agent2) {
      gameStats.agent2.second.dqs += 1;
    }
    if (!winState.hasWinner && !errorState.hasError) {
      gameStats.agent2.second.ties += 1;
    }
  } else {
    //
    // Update gameStats.agent2.first
    //
    gameStats.agent2.first.games += 1;
    if (agent2.symbol === 'x') {
      gameStats.agent2.first.asX += 1;
    } else {
      gameStats.agent2.first.asO += 1;
    }
    if (winState.hasWinner && winState.winningPlayer === agent2) {
      gameStats.agent2.first.wins += 1;
    }
    if (winState.hasWinner && winState.winningPlayer !== agent2) {
      gameStats.agent2.first.losses += 1;
    }
    if (errorState.hasError && errorState.disqualifiedPlayer === agent2) {
      gameStats.agent2.first.dqs += 1;
    }
    if (!winState.hasWinner && !errorState.hasError) {
      gameStats.agent2.first.ties += 1;
    }

    //
    // Update gameStats.agent1.second
    //
    gameStats.agent1.second.games += 1;
    if (agent1.symbol === 'x') {
      gameStats.agent1.second.asX += 1;
    } else {
      gameStats.agent1.second.asO += 1;
    }
    if (winState.hasWinner && winState.winningPlayer === agent1) {
      gameStats.agent1.second.wins += 1;
    }
    if (winState.hasWinner && winState.winningPlayer !== agent1) {
      gameStats.agent1.second.losses += 1;
    }
    if (errorState.hasError && errorState.disqualifiedPlayer === agent1) {
      gameStats.agent1.second.dqs += 1;
    }
    if (!winState.hasWinner && !errorState.hasError) {
      gameStats.agent1.second.ties += 1;
    }
  }
}

export function initUIListeners(onChange, onPlay) {
  document.getElementById('play').addEventListener('click', () => {
    //reset stats;
    gameStats = JSON.parse(JSON.stringify(initialState));
    onPlay();
  }, false);


  const slider = document.getElementById('speed-ctrl');
  slider.addEventListener('input', () => {
    onChange(slider.value);
  }, false);
}
