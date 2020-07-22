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
import {clone} from '../shared/game_utils.js';
// Uncomment this line to use this file in node.
// import * as tf from '../training/yannick/node_modules/@tensorflow/tfjs'

const possibleCellStates = [
  '---',
  '--x',
  '--o',
  '-xx',
  '-oo',
  '-ox',
  'oxx',
  'oox',
  'ooo',
  'xxx',
];

export class YannickAgent extends AbstractAgent {
  constructor(options) {
    super(options);
    this.hasMadeDoubleMove = false;
    this.initEncoderDecoder();
    this.numActions = this.moveDecoderMap.size;
    this.moveCountInGame = 0;
    this.playOptimally = true;
    if (options.playOptimally != null) {
      this.playOptimally = options.playOptimally;
    }
    this.useRelativePath = true;
    if (options.useRelativePath != null) {
      this.useRelativePath = options.useRelativePath;
    }
    if (options.modelName != null) {
      this.modelName = options.modelName;
    }
  }

  /**
   * An initialization function that can be used to load state that may
   * take a while to complete.
   */
  async init() {
    let url;

    if (this.modelName == null) {
      this.modelName =
          '2020-3-25/DQN-STUDENT-MULTINOMIAL-Sat-Apr-25-2020-1:21:17-AM-es0.95-me0.01-ed0.014-ue200-rmc8000-b256-n20000';
    }

    if (this.useRelativePath) {
      url = `../training/yannick/models/${this.modelName}/model.json`;
    } else {
      url = `http://localhost:8000/training/yannick/models/` +
          `${this.modelName}/model.json`;
    }

    const model = await tf.loadLayersModel(url);
    this.model = model;
    return;
  }

  /**
   * Will be called before the start of a game, useful for resetting agent
   * internal state.
   */
  startGame() {
    this.hasMadeDoubleMove = false;
    this.moveCountInGame = 0;
  }

  initEncoderDecoder() {
    this.moveEncoderMap = new Map();
    this.moveDecoderMap = new Map();

    const allPositions = [];
    // Single moves
    for (let position1 = 0; position1 < 9; position1++) {
      const move = [position1];
      allPositions.push(move);
    }
    // Double moves
    for (let position1 = 0; position1 < 9; position1++) {
      for (let position2 = 0; position2 < 9; position2++) {
        const move = [position1, position2];
        allPositions.push(move);
      }
    }

    const oneHotDepth = allPositions.length;
    allPositions.forEach((position, i) => {
      const positionString = JSON.stringify(position);
      const oneHot = tf.oneHot(i, oneHotDepth);
      const indexStr = JSON.stringify(i);

      this.moveEncoderMap.set(positionString, oneHot);
      this.moveDecoderMap.set(indexStr, position);
    });
  }

  decodeMove(index) {
    const indexStr = JSON.stringify(index);
    if (!this.moveDecoderMap.has(indexStr)) {
      throw new Error(`No move encoding found for index: ${
          index}. Num actions is ${this.numActions}.`);
    }
    return this.moveDecoderMap.get(indexStr);
  }

  symbolToNumber(symbol) {
    switch (symbol) {
      case 'x':
        return 0;
      case 'o':
        return 1;
      case '-':
      case -1:
        return 2;
      default:
        return 2;
    }
  }

  cellToString(cell) {
    const sorted = clone(cell).sort();
    const asString = sorted.join('').replace(/-1/g, '-');
    return asString;
  }

  boardStateToOneHot(boardState) {
    const oneHotIndices = boardState.map(
        cell => possibleCellStates.indexOf(this.cellToString(cell)));

    // assert all cell state values are actually found in the lookup.
    const validIndices = oneHotIndices.every(i => i >= 0);
    if (!validIndices) {
      throw new Error(`Error encoding board: ${boardState}, ${oneHotIndices}`);
    }

    const oneHot =
        tf.oneHot(oneHotIndices, possibleCellStates.length).flatten();
    return oneHot;
  }

  agentStateToOneHot(playerSymbol, doubleMoveState) {
    const symbolOneHot = tf.oneHot(this.symbolToNumber(playerSymbol), 2);
    const hasPlayedDoubleOneHot = tf.oneHot(doubleMoveState, 2);

    return symbolOneHot.concat(hasPlayedDoubleOneHot);
  }

  convertToTensor(boardState, playerSymbol, doubleMoveState) {
    const boardStateOH = this.boardStateToOneHot(boardState);
    const playerStateOH =
        this.agentStateToOneHot(playerSymbol, doubleMoveState);
    const combinedOH = tf.concat([boardStateOH, playerStateOH]);

    return combinedOH;
  }

  move(boardState) {
    const action = tf.tidy(() => {
      const stateTensor =
          this.convertToTensor(boardState, this.symbol, this.hasMadeDoubleMove);
      const logits = this.model.predict(stateTensor.expandDims()).flatten();

      if (this.playOptimally) {
        // Optimal play
        return logits.argMax(-1).dataSync()[0];
      } else {
        // Sample a move according the probability distribution. This will
        // occasionally result in a sub-optimal or bad move, but does allow for
        // variety in play.
        const topLogits = tf.topk(logits, 5);
        const topLogitsArr = topLogits.values.dataSync();

        const sampleIdx =
            tf.multinomial(topLogits.values, 1, undefined, false).dataSync()[0];
        const sampleVal = topLogitsArr[sampleIdx];
        // Find this logit in the original result from the model
        const logitsArr = logits.dataSync();
        const trueSamplePos = logitsArr.indexOf(sampleVal);
        if (trueSamplePos !== -1) {
          return trueSamplePos;
        } else {
          // Safeguard in case there is some numerical instqbility taht makes
          // the indeoxof search fail.
          return tf.multinomial(logits, 1, undefined, false).dataSync()[0];
        }
      }
    });

    const decodedPositions = this.decodeMove(action);
    const isDoubleMove = decodedPositions.length === 2;
    if (isDoubleMove) {
      this.hasMadeDoubleMove = true;
    }

    const move = {
      symbol: this.symbol,
      positions: decodedPositions,
      isDoubleMove,
    };
    this.moveCountInGame += 1;
    return move;
  }
}
