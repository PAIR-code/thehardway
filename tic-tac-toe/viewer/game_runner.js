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

import {checkForIllegalMove, checkForWinner, wait} from '../shared/game_utils.js';

import {CONFIG} from './config.js';

/**
 *
 */
export class GameRunner {
  /**
   *
   * @param {*} player1 an Agent instance
   * @param {*} player2 an Agent instance
   */
  constructor(player1, player2) {
    this.player1 = player1;
    this.player2 = player2;
    this.container = document.getElementById('board');
    this.reset();
  }

  /**
   * Initialize the agents, must be called at least once before calling
   * playGame
   */
  async init() {
    await Promise.all([this.player1.init(), this.player2.init()]);
  }

  /**
   * Reset the game state. THis includes:
   *    - board state
   *    - which agent goes first
   *    - the symbols assigned to each agent
   *
   * The behaviour is controlled by CONFIG.randomizeOrder and
   * CONFIG.randomizeSymbol.
   */
  reset() {
    if (CONFIG.randomizeOrder) {
      this.currentPlayer = Math.random() <= 0.5 ? this.player1 : this.player2;
    } else {
      this.currentPlayer = this.player1;
    }
    this.firstPlayer = this.currentPlayer;

    if (CONFIG.randomizeSymbol) {
      if (Math.random() < 0.5) {
        this.player1.symbol = 'x';
        this.player2.symbol = 'o';
      } else {
        this.player1.symbol = 'o';
        this.player2.symbol = 'x';
      }
    }
    this.boardState = new Array(9);
    this.boardState.fill(-1);
  }

  async play() {}

  /**
   * Plays a single game of tic-tac-toe.
   *
   * Returns winState and errorState objects for the game once complete
   */
  async playGame() {
    let winState = {};
    let errorState = {};
    this.renderBoard(this.boardState, winState, errorState);

    const MAX_MOVES = 9;
    for (let i = 0; i < MAX_MOVES; i++) {
      const next = this.currentPlayer.move(this.boardState);

      errorState = checkForIllegalMove(this.boardState, next);
      if (errorState.hasError) {
        errorState.disqualifiedPlayer = this.currentPlayer;
        break;
      }

      this.boardState[next.position] = next.symbol;
      winState = checkForWinner(this.boardState);
      if (winState.hasWinner) {
        winState.winningPlayer = this.currentPlayer;
        break;
      }

      this.renderBoard(this.boardState, winState, errorState);

      // Prepare for next move
      if (this.currentPlayer === this.player1) {
        this.currentPlayer = this.player2;
      } else {
        this.currentPlayer = this.player1;
      }
      if (CONFIG.waitBetweenMoves > 0) {
        await wait(CONFIG.waitBetweenMoves);
      }
    }

    this.renderBoard(this.boardState, winState, errorState);
    return {winState, errorState};
  }

  /**
   * Renders board state to the dom.
   *
   * @param {Array<string|number>} boardState
   * @param {Object} winState
   * @param {Object} errorState
   */
  renderBoard(boardState, winState, errorState) {
    const cells = d3.select(this.container)
                      .selectAll('.cell')
                      .data(boardState, (d, i) => i);
    const cellEnter = cells.enter().append('div').attr('class', 'cell');

    cells.merge(cellEnter)
        .html((d, i) => {
          switch (d) {
            case 'x':
              return 'X';
            case 'o':
              return 'O';
            default:
              return '';
          }
        })
        .classed(
            'winning-cell',
            (d, i) => winState.hasWinner && winState.winningCells.includes(i))
        .classed(
            'error-cell',
            (d, i) => errorState.hasError && errorState.errorCell === i);
  }
}
