/**
 * @license
 * Copyright 2018 Google LLC. All Rights Reserved.
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

import {wait} from '../shared/game_utils.js';
import {RandomAgent} from '../shared/random_agent.js';

import {CONFIG} from './config.js';
import {DavidAgent} from './david_agent.js';
import {GameRunner} from './game_runner.js';
import {initUIListeners, initUiState, updateStats, updateStatsUI} from './ui.js';
import {YannickAgent} from './yannick_agent.js';



/*
 * Create agents and game environment
 */
const agentR = new RandomAgent({symbol: 'x', name: 'Randy'});
const agentY = new YannickAgent({
  symbol: 'x',
  name: 'Yannick Agent',
  playOptimally: false,
});
const agentDW = new DavidAgent({symbol: 'o', name: 'David Agent'});

// Select ehich agents to use.
const player1 = agentDW;
const player2 = agentY;


// Start the game.
const game = new GameRunner(player1, player2);
initUIListeners((wait) => {
  CONFIG.waitBetweenMoves = wait;
  CONFIG.waitBetweenGames = wait * 5;
}, start);

function start() {
  initUiState(player1, player2);
  game.init().then(async () => {
    for (let index = 0; index < CONFIG.numGames; index++) {
      game.reset();
      const {winState, errorState} = await game.playGame();
      updateStats(winState, errorState, game, player1, player2);
      updateStatsUI();
      if (winState.hasWinner || errorState.hasError) {
        if (CONFIG.waitBetweenGames > 0) {
          await wait(CONFIG.waitBetweenGames);
        }
      }
    }
  });
}

start();
