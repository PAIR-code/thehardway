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

import {BOARD_EMPTY_VAL, checkDone, checkForIllegalMove, checkForWinner, createEmptyBoard, wait} from '../shared/game_utils.js';
import {CONFIG} from './config.js';

window.patterns = {
  david: {
    firstMoveCell: [],
    secondMoveCell: [],
    doubleMoveTurn: [],
    doubleMovePositions: [],
  },
  yannick: {
    firstMoveCell: [],
    secondMoveCell: [],
    doubleMoveTurn: [],
    doubleMovePositions: [],
  },
}

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

    this.moveCounter = 0;
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
    this.boardState = null;
    this.boardState = createEmptyBoard();
    this.player1.startGame();
    this.player2.startGame();

    this.player1.__agentHasMadeDoubleMove = false;
    this.player2.__agentHasMadeDoubleMove = false;

    this.moveCounter = 0;
  }

  logBoardState(msg) {
    // Make a copy and then log to avoid de-synchronization between console.log
    // and this.boardState.
    const copy = JSON.parse(JSON.stringify(this.boardState));
    console.log(msg, copy);
  }

  getNonCurrentPlayer() {
    if (this.currentPlayer === this.player1) {
      return this.player2;
    } else {
      return this.player1;
    }
  }

  getStatsObject() {
    const agentName = this.currentPlayer.name;
    if (agentName.match(/Yannick/i)) {
      return window.patterns.yannick;
    } else if (agentName.match(/David/i)) {
      return window.patterns.david;
    } else {
      return;
    }
  }

  /**
   * Plays a single game of tic-tac-toe.
   *
   * Returns winState and errorState objects for the game once complete
   */
  async playGame() {
    let winState = {};
    let errorState = {};
    this.renderBoard(this.boardState, winState, errorState);

    while (!checkDone(this.boardState)) {
      const hasOpponentMadeDoubleMoveThisGame =
          this.getNonCurrentPlayer().__agentHasMadeDoubleMove;

      const next = this.currentPlayer.move(
          this.boardState, hasOpponentMadeDoubleMoveThisGame);
      next.agentHasMadeDoubleMove = this.currentPlayer.__agentHasMadeDoubleMove

      errorState = checkForIllegalMove(this.boardState, next);
      if (errorState.hasError) {
        errorState.disqualifiedPlayer = this.currentPlayer;
        break;
      }

      if (this.moveCounter === 0) {
        // record first move stats
        const statsObject = this.getStatsObject();
        if (statsObject) {
          statsObject.firstMoveCell.push(next.positions)
        }
      }

      if (this.moveCounter === 1) {
        // record first move stats
        const statsObject = this.getStatsObject();
        if (statsObject) {
          // console.log(
          //     'first move cell', this.currentPlayer.name, next.positions);
          statsObject.secondMoveCell.push(next.positions)
        }
      }

      if (next.isDoubleMove) {
        const statsObject = this.getStatsObject();
        if (statsObject) {
          statsObject.doubleMoveTurn.push(this.moveCounter);
          statsObject.doubleMovePositions.push(next.positions);
        }
      }

      next.positions.forEach((position) => {
        const nextCell = this.boardState[position];
        const nextFree = nextCell.indexOf(BOARD_EMPTY_VAL);
        nextCell[nextFree] = next.symbol;
      });
      if (next.isDoubleMove) {
        this.currentPlayer.__agentHasMadeDoubleMove = true;
      }

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
      this.moveCounter += 1;
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
    const cellsEnter = cells.enter().append('div').attr('class', 'cell');
    const cellsUpdate = cells.merge(cellsEnter)

    const marks = cellsUpdate.selectAll('.mark').data((d) => d);
    const marksEnter = marks.enter().append('div').attr('class', 'mark');
    const marksUpdate = marks.merge(marksEnter);

    // Cell level rendering
    cellsUpdate
        .classed(
            'winning-cell',
            (d, i) => winState.hasWinner && winState.winningCells.includes(i))
        .classed(
            'error-cell',
            (d, i) => errorState.hasError && errorState.errorCell === i);

    // Cell level rendering
    marksUpdate.text((d) => {
      switch (d) {
        case 'x':
          return 'X';
        case 'o':
          return 'O';
        default:
          return '';
      }
    });
  }
}
