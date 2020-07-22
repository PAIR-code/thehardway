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

export class AbstractAgent {
  /**
   * Creates an agent that can play
   * options is of the form: { symbol: 'x' }
   */
  constructor(options) {
    this.symbol = options.symbol;
    this.name = options.name || this.constructor.name;
  }

  /**
   * An initialization function that can be used to load state that may
   * take a while to complete.
   */
  async init() {
    return;
  }

  /**
   * Will be called before the start of a game, useful for resetting agent
   * internal state.
   */
  startGame() {}

  /**
   * Takes a boardState and returns a move.
   * @param {Object} boardState
   * @param {boolean} hasOtherPlayerPlayedDouble optional param that indicates
   *     if the other player has made a double move this game.
   * @returns {symbol: 'x'|'o', position: number} move
   */
  move(boardState, hasOtherPlayerPlayedDouble = undefined) {}
}
