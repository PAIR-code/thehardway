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

/**
 * Game utils for tic tac two. In tic-tac-two a board is represented as an array
 * of cells each of which contains an array of marks (as opposed to a singl
 * mark)
 *
 */
export const BOARD_EMPTY_VAL = -1;
const MARKS = {
  x: 'x',
  o: 'o'
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * 'type checks' a move / defines a move. This does not check validity of a
 * move in terms of game logic
 *
 * Mostly for sanity since we are not in typescript here.
 * @param {*} move a move object. Looks like the following
 * {
 *  symbol: 'x'|'o',
 *  isDoubleMove: boolean,
 *  positions: [number]|[number, number],
 * }
 *
 */
export function isMoveInstance(move) {
  assert(
      (move.symbol === MARKS.x || move.symbol === MARKS.o),
      `Malformed move: symbol is ${move.symbol}`);

  assert(
      typeof move.isDoubleMove === 'boolean',
      `Malformed move: isDoubleMove is not a boolean. It is '${
          move.isDoubleMove}'`);

  assert(
      Array.isArray(move.positions),
      `Malformed move: positions is not an array. It is '${move.positions}'`);

  const positionsIsDoubleAgreement = move.isDoubleMove ?
      move.positions.length === 2 :
      move.positions.length === 1;
  assert(
      positionsIsDoubleAgreement,
      `Malformed move: isDoubleMove is '${
          move.isDoubleMove}' and positions is '${move.positions}'`);
}

export function createEmptyBoard() {
  const rows = 3;
  const cols = 3;
  const maxMarks = 3;

  const board = [];
  for (let i = 0; i < rows * cols; i++) {
    const cell = new Array(maxMarks);
    cell.fill(BOARD_EMPTY_VAL);
    board[i] = cell;
  }
  return board;
}

/**
 * Does this cell already have an owner.
 * @param {string[]} cell
 * @returns {false|'x'|'o'}
 */
export function hasOwner(cell) {
  const xs = cell.filter(m => m === MARKS.x);
  const os = cell.filter(m => m === MARKS.o);

  if (xs.length > 1) {
    return MARKS.x
  }
  if (os.length > 1) {
    return MARKS.o
  }
  return false;
}

/**
 * Utility function for checking for a winner.
 * @param {*} boardState current board state
 * @param {number[]} indices the indices of 3 cells to test for winners
 */
function checkCellsForWinner(boardState, indices) {
  const cell1Owner = hasOwner(boardState[indices[0]]);
  const cell2Owner = hasOwner(boardState[indices[1]]);
  const cell3Owner = hasOwner(boardState[indices[2]]);

  const allOwned = Boolean(cell1Owner && cell2Owner && cell3Owner);

  if (allOwned && cell1Owner === cell2Owner && cell2Owner === cell3Owner) {
    return {
      hasWinner: true, winningSymbol: cell1Owner, winningCells: indices
    }
  } else {
    return {
      hasWinner: false
    }
  }
}

/**
 * Check for a winner on the board
 * @param {*} boardState
 */
export function checkForWinner(boardState) {
  const rows = 3;
  const cols = 3;
  const stride = 3;

  // Check the rows
  for (let i = 0; i < (rows * stride); i += stride) {
    const indices = [
      i,
      i + 1,
      i + 2,
    ];
    const result = checkCellsForWinner(boardState, indices);
    if (result.hasWinner) {
      return result;
    }
  }

  // Check the columns
  for (let i = 0; i < cols; i++) {
    const indices = [
      i,
      i + stride,
      i + (stride * 2),
    ];
    const result = checkCellsForWinner(boardState, indices);
    if (result.hasWinner) {
      return result;
    }
  }

  // Check Diagonal 1, [0,0], [1,1], [2,2];
  {
    const indices = [
      0,
      1 + (1 * stride),
      2 + (2 * stride),
    ];
    const result = checkCellsForWinner(boardState, indices);
    if (result.hasWinner) {
      return result;
    }
  }

  // Check Diagonal 2, [0,2], [1,1], [2,0],
  {
    const indices = [
      stride - 1,
      1 + (1 * stride),
      0 + (2 * stride),
    ];

    const result = checkCellsForWinner(boardState, indices);
    if (result.hasWinner) {
      return result;
    }
  }

  return {
    hasWinner: false,
  };
}

export function isCellFull(cell) {
  if (hasOwner(cell)) {
    return true;
  }

  const nonEmpty = cell.filter(m => m !== BOARD_EMPTY_VAL);
  if (nonEmpty.length === cell.length) {
    return true;
  } else {
    return false;
  }
}

/**
 * Get the number of free spaces within  a cell
 * @param {number[]} cell
 */
export function freeSpacesInCell(cell) {
  return cell.filter(m => m === BOARD_EMPTY_VAL).length;
}

/**
 * Check for illegal moves.
 *
 * What is a move?
 * interface move {
 *  position: number,
 *  symbol: string,
 *  isDoubleMove: boolean,
 *  agentHasMadeDoubleMove: boolean,
 * }
 */
export function checkForIllegalMove(boardState, move) {
  isMoveInstance(move);

  if (move.isDoubleMove && move.agentHasMadeDoubleMove) {
    // console.log('checkForIllegalMove', 'double-move-not-available');
    return {
      hasError: true,
      errorCell: move.positions[0],
      type: 'double-move-not-available',
    };
  }

  if (move.isDoubleMove && move.positions[0] == move.positions[1]) {
    if (freeSpacesInCell(boardState[move.positions[0]]) < 2) {
      // console.log('checkForIllegalMove', 'double-move-not-possible-there');
      return {
        hasError: true,
        errorCell: move.positions[0],
        type: 'double-move-not-possible',
      };
    }
  }

  move.positions.forEach((position, index) => {
    if (position < 0 || position > 8) {
      // console.log('checkForIllegalMove', 'out-of-bounds');
      return {
        hasError: true,
        errorCell: move.positions[index],
        type: 'out-of-bounds',
      };
    }

    if (isCellFull(boardState[position])) {
      // console.log('checkForIllegalMove', 'cell-full-or-owned');
      return {
        hasError: true,
        errorCell: move.positions[index],
        type: 'cell-full',
      };
    }
  });

  return {
    hasError: false,
  };
}

export function checkDone(boardState) {
  const isDone = boardState.every(cell => isCellFull(cell));
  return isDone;
}

export async function wait(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
