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

import {AbstractAgent} from './agent.js';
import {freeSpacesInCell, hasOwner, isCellFull} from './game_utils.js'

export class RandomAgent extends AbstractAgent {
  constructor(options) {
    super(options);
    this.doubleMoveProb = options.doubleMoveProb || 0.25;
    this.hasMadeDoubleMove = false;
  }

  startGame() {
    this.hasMadeDoubleMove = false;
  }

  cellCanTakeDoubleMove(cell) {
    const matchingSymbolCount = cell.filter(m => m === this.symbol).length;
    // Dont make double moves in cells where you already have a symbol
    // (which would be legal but a bad strategy).
    if (matchingSymbolCount === 0 && !hasOwner(cell) && !isCellFull(cell)) {
      return true;
    }
    return false;
  }

  move(boardState, hasOtherPlayerPlayedDouble) {
    // console.log(`Agent ${this.name}. Has hasOtherPlayerPlayedDouble: ${
    //     hasOtherPlayerPlayedDouble}`);
    const freeIndices = boardState.reduce((memo, cell, idx) => {
      if (!isCellFull(cell)) {
        memo.push(idx);
      }
      return memo;
    }, []);

    if (freeIndices.length === 0) {
      console.log('No Legal Moves', boardState);
      throw new Error('No legal moves');
    }

    // Make move
    if (!this.hasMadeDoubleMove && (Math.random() < this.doubleMoveProb)) {
      let nextIndex1;
      let nextIndex2;
      if (freeIndices.length > 1) {
        // We will defeinitely be able to make a doubld move. Possibly to two
        // different cells.
        nextIndex1 =
            freeIndices[Math.floor(Math.random() * freeIndices.length)];
        do {
          nextIndex2 =
              freeIndices[Math.floor(Math.random() * freeIndices.length)];

          const differentCells = nextIndex1 !== nextIndex2;
          if (differentCells) {
            break;
          }

          // Same cell
          const cell1Has2Spaces = freeSpacesInCell(boardState[nextIndex1]) > 1;
          if (cell1Has2Spaces) {
            break;
          }
        } while (true);

        const move = {
          positions: [nextIndex1, nextIndex2],
          symbol: this.symbol,
          isDoubleMove: true,
        };
        this.hasMadeDoubleMove = true;
        return move;
      } else {
        // There is only one free index check if we can make a double move
        // there if we can't just make a single move.
        const nextIndex = freeIndices[0];
        const move = {
          positions: [nextIndex],
          symbol: this.symbol,
          isDoubleMove: false,
        };
        return move;
      }
    } else {
      const nextIndex =
          freeIndices[Math.floor(Math.random() * freeIndices.length)];
      const move = {
        positions: [nextIndex],
        symbol: this.symbol,
        isDoubleMove: false,
      };
      return move;
    }
  }
}
