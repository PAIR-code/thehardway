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

import {AbstractAgent} from '../shared/agent.js';

export class YannickAgent extends AbstractAgent {
  constructor(options) {
    super(options);
  }

  /**
   * An initialization function that can be used to load state that may
   * take a while to complete.
   */
  async init() {
    const modelname =
        'DQN-Fri-Feb-21-2020-3:30:22-PM-es0.95-me0.01-ed0.025-ue200-rmc8000-b512-n30000';
    const model = await tf.loadLayersModel(
        `../training/yannick/models/${modelname}/model.json`);
    this.model = model;
    return;
  }

  symbolToNumber(symbol) {
    switch (symbol) {
      case 'x':
        return 0;
      case 'o':
        return 1;
      case '-':
      case -1:
      default:
        return 2;
    }
  }

  convertToTensor(boardState) {
    return tf.tidy(() => {
      const NUM_SYMBOLS = 3;
      const NUM_PLAYERS = 2;
      const boardStateT =
          tf.oneHot(boardState.map(this.symbolToNumber), NUM_SYMBOLS)
      const playerState =
          tf.oneHot(this.symbolToNumber(this.symbol), NUM_PLAYERS);
      const combined = tf.concat([
                           boardStateT.flatten(),
                           playerState.flatten(),
                         ]).expandDims();
      return combined;
    });
  }

  move(boardState) {
    const playPosition = tf.tidy(() => {
      const stateTensor = this.convertToTensor(boardState);
      const pred = this.model.predict(stateTensor).flatten();
      // Sample a move according the probability distribution. This will
      // occasionally result in a sub-optimal or bad move, but does allow for
      // variety in play.
      const move =
          tf.multinomial(pred.softmax(), 1, undefined, true).dataSync()[0];
      return move;
    });

    return {
      symbol: this.symbol,
      position: playPosition,
    };
  }
}
