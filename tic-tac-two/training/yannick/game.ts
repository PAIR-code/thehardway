
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
import {BOARD_EMPTY_VAL, checkDone, checkForIllegalMove, checkForWinner, createEmptyBoard} from '../../shared/game_utils.js';

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

  agentHasMadeDoubleMove: Map<AbstractAgent, boolean>;

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
    this.boardState = createEmptyBoard();

    this.agentHasMadeDoubleMove = new Map();
    this.agentHasMadeDoubleMove.set(this.player1, false);
    this.agentHasMadeDoubleMove.set(this.player2, false);

    this.player1.startGame();
    this.player2.startGame();
  }

  togglePlayer() {
    if (this.currentPlayer === this.player1) {
      this.currentPlayer = this.player2;
    } else {
      this.currentPlayer = this.player1;
    }
  }

  step(): StepResult {
    const next =
        this.currentPlayer.move(this.boardState) as unknown as AgentMove;
    next.agentHasMadeDoubleMove =
        this.agentHasMadeDoubleMove.get(this.currentPlayer);

    const errorState = checkForIllegalMove(this.boardState, next);
    if (errorState.hasError) {
      const result: ErrorState = {
        done: true,
        action: next,
        hasError: true,
        disqualifiedPlayer: this.currentPlayer,
        errorCell: errorState.errorCell,
      };
      return result;
    }

    // Play the move
    next.positions.forEach((position) => {
      const nextCell = this.boardState[position];
      const nextFree = nextCell.indexOf(BOARD_EMPTY_VAL);
      nextCell[nextFree] = next.symbol;
    });
    if (next.isDoubleMove) {
      this.agentHasMadeDoubleMove.set(this.currentPlayer, true);
    }

    //
    const winState = checkForWinner(this.boardState);
    if (winState.hasWinner) {
      const result: WinState = {
        done: true,
        action: next,
        hasWinner: true,
        winningPlayer: this.currentPlayer,
        winningSymbol: this.currentPlayer.symbol,
      };

      return result;
    }

    // If board is full signal done.
    const isDone = checkDone(this.boardState);
    if (isDone) {
      const result: MoveState = {
        done: true,
        action: next,
      };
      return result;
    }

    // toggle player
    this.togglePlayer();
    const result: MoveState = {
      done: false,
      action: next,
    };
    return result;
  }
}

export type Cell = Array<-1|'x'|'o'>;
export type BoardState = Cell[];

// A move as returned by the agent.
export interface AgentMove {
  positions: [number]|[number, number];
  symbol: 'x'|'o';
  isDoubleMove: boolean;
  agentHasMadeDoubleMove?: boolean;
}

// The final result of this move in game terms
export interface MoveState {
  done: boolean;
  action: AgentMove;
}

export interface ErrorState extends MoveState {
  hasError: boolean;
  errorCell: number;
  disqualifiedPlayer: AbstractAgent;
}

export interface WinState extends MoveState {
  hasWinner: boolean;
  winningSymbol: 'x'|'o';
  winningCells?: number[];
  winningPlayer: AbstractAgent;
}

export type StepResult = MoveState|ErrorState|WinState;

export function isWinState(state: StepResult): state is WinState {
  return (state as WinState).hasWinner !== undefined;
}

export function isErrorState(state: StepResult): state is ErrorState {
  return (state as ErrorState).hasError !== undefined;
}

export function isMoveState(state: StepResult): state is MoveState {
  return (!isErrorState(state) && !isWinState(state));
}

function printRow(board: BoardState, row: number, stride: number) {
  process.stdout.write('|');
  for (let j = 0; j < stride; j++) {
    const cell = board[row + j];
    const cellStr = cell.join('').replace(/-1/g, '-').padEnd(3);
    process.stdout.write(cellStr);
    process.stdout.write('|');
  }
}
export function printBoard(board: BoardState, prevBoard?: BoardState) {
  const rows = 3;
  const stride = 3;

  for (let i = 0; i < (rows * stride); i += stride) {
    if (prevBoard) {
      printRow(prevBoard, i, stride);
      process.stdout.write('\t -> \t');
    }
    printRow(board, i, stride);
    process.stdout.write('\n');
  }
}
