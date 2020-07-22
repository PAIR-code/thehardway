
/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {AbstractAgent} from '../../shared/agent.js';
import {checkDone, checkForIllegalMove, checkForWinner} from '../../shared/game_utils.js';

/**
 * Represents a game of tic-tac-toe.
 *
 * This class does not have a game loop, but excepts to be driven by a caller,
 * this allows yielding the result of each step of the game.
 */
export class Game {
  player1: AbstractAgent;
  player2: AbstractAgent;

  currentPlayer: AbstractAgent;
  boardState: BoardState;

  randomizeOrder: boolean;
  randomizeSymbol: boolean;

  constructor(player1, player2, randomizeOrder, randomizeSymbol) {
    this.player1 = player1;
    this.player2 = player2;
    this.randomizeOrder = randomizeOrder;
    this.randomizeSymbol = randomizeSymbol;
    this.reset();
  }

  async init() {
    await Promise.all([this.player1.init(), this.player2.init()]);
  }

  reset() {
    if (this.randomizeOrder) {
      this.currentPlayer = Math.random() <= 0.5 ? this.player1 : this.player2;
    } else {
      this.currentPlayer = this.player1;
    }

    if (this.randomizeSymbol) {
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

  step() {
    const next = this.currentPlayer.move(this.boardState) as unknown as Move;

    let winState: WinState = {hasWinner: false};
    let errorState: ErrorState = {hasError: false};
    const moveState = {done: false, player: this.currentPlayer, action: next};

    errorState = checkForIllegalMove(this.boardState, next);
    if (errorState.hasError) {
      errorState.disqualifiedPlayer = this.currentPlayer;
      return {done: true, errorState, action: next};
    }

    this.boardState[next.position] = next.symbol;
    winState = checkForWinner(this.boardState);
    if (winState.hasWinner) {
      winState.winningPlayer = this.currentPlayer;
      return {done: true, winState, action: next};
    }

    // If board is full signal done.
    const isDone = checkDone(this.boardState);
    if (isDone) {
      return {done: true, action: next};
    }

    // toggle player
    if (this.currentPlayer === this.player1) {
      this.currentPlayer = this.player2;
    } else {
      this.currentPlayer = this.player1;
    }
    return moveState;
  }
}

export type BoardState = Array<-1|'x'|'o'>;

export interface Move {
  position: number;
  symbol: 'x'|'o';
}

export interface ErrorState {
  hasError: boolean;
  errorCell?: number;
  disqualifiedPlayer?: AbstractAgent;
}

export interface WinState {
  hasWinner: boolean;
  winningSymbol?: 'x'|'o';
  winningCells?: number[];
  winningPlayer?: AbstractAgent;
}
