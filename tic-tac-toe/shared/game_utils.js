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

export const BOARD_EMPTY_VAL = -1;

export function checkForWinner(boardState) {
  const rows = 3;
  const cols = 3;
  const stride = 3;

  function checkCells(boardState, indices) {
    const cell1 = boardState[indices[0]];
    const cell2 = boardState[indices[1]];
    const cell3 = boardState[indices[2]];

    if (cell1 != -1 && cell1 === cell2 && cell2 === cell3) {
      return {
        hasWinner: true, winningSymbol: cell1, winningCells: indices,
      }
    } else {
      return {
        hasWinner: false,
      }
    }
  }

  // Check the rows
  for (let i = 0; i < (rows * stride); i += stride) {
    const indices = [
      i,
      i + 1,
      i + 2,
    ];
    const result = checkCells(boardState, indices);
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
    const result = checkCells(boardState, indices);
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
    const result = checkCells(boardState, indices);
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

    const result = checkCells(boardState, indices);
    if (result.hasWinner) {
      return result;
    }
  }

  return {
    hasWinner: false,
  };
}

export function checkForIllegalMove(boardState, move) {
  if (boardState[move.position] !== BOARD_EMPTY_VAL || move.position < 0 ||
      move.position > 8) {
    return {
      hasError: true,
      errorCell: move.position,
    };
  }

  return {
    hasError: false,
  };
}

export function checkDone(boardState) {
  const isDone = boardState.every(symbol => symbol != -1);
  return isDone;
}

export async function wait(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}
