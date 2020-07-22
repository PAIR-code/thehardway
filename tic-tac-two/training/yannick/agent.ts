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

import * as tf from '@tensorflow/tfjs-node-gpu';

import {AbstractAgent} from '../../shared/agent.js';
import {RandomAgent} from '../../shared/random_agent.js';

import {ReplayElement} from './environment';
import {AgentMove, BoardState, Cell} from './game';
import {clone} from './util';

// Cache one hot representations of boards and players to speed things up
const inputTensorCache = new Map<string, tf.Tensor>();

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

/**
 * Agent class that implemented the double DQN training algorithm.
 */
export class DenseDQNAgent extends AbstractAgent {
  symbol: string;
  epsilon: number;
  minEpsilon: number;
  epsilonDecay: number;
  numActions: number;
  hasMadeDoubleMove: boolean;

  updateTargetEvery: number;
  lastGameUpdate: number;

  onlineNetwork: tf.Sequential;
  targetNetwork: tf.Sequential;
  optimizer: tf.Optimizer;

  randomMover: RandomAgent;

  // From positions array to one-hot tensor;
  moveEncoderMap: Map<string, tf.Tensor1D>;
  // From one-hot tensor 'string' to positions array;
  moveDecoderMap: Map<string, number[]>;

  constructor(options) {
    super(options);
    this.symbol = options.symbol;
    this.epsilon = options.epsilonStart || 0.95;
    this.minEpsilon = options.minEpsilon || 0.05;
    this.epsilonDecay = options.epsilonDecay || 0.01;
    this.initEncoderDecoder();
    this.numActions = this.moveEncoderMap.size;
    this.hasMadeDoubleMove = false;

    this.onlineNetwork = this.createDenseModel();
    this.targetNetwork = this.createDenseModel();
    this.copyWeights(this.onlineNetwork, this.targetNetwork);

    this.optimizer = tf.train.adam(0.001);
    this.updateTargetEvery = options.updateEvery || 1500;

    this.lastGameUpdate = -1;

    // We use a random agent to make random moves 1 - epsilon rate.
    this.randomMover =
        new RandomAgent({symbol: this.symbol, doubleMoveProb: 0.25});
  }

  startGame() {
    this.hasMadeDoubleMove = false;
    this.randomMover.startGame();
    this.randomMover.symbol = this.symbol;
  }

  async init() {}

  initEncoderDecoder() {
    this.moveEncoderMap = new Map<string, tf.Tensor1D>();
    this.moveDecoderMap = new Map<string, number[]>();

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

    console.log('Constructing moveEncoder: inputstrings', allPositions);
    const oneHotDepth = allPositions.length;
    console.log('Constructing moveEncoder: oneHotDepth', oneHotDepth);
    allPositions.forEach((position, i) => {
      const positionString = JSON.stringify(position);
      const oneHot = tf.oneHot(i, oneHotDepth) as tf.Tensor1D;
      const indexStr = JSON.stringify(i);

      this.moveEncoderMap.set(positionString, oneHot);
      this.moveDecoderMap.set(indexStr, position);
    });
  }

  encodeMove(positions) {
    const positionString = JSON.stringify(positions);
    if (!this.moveEncoderMap.has(positionString)) {
      throw new Error(`No one hot encoding found for: ${positions}`);
    }
    return this.moveEncoderMap.get(positionString);
  }

  decodeMove(index) {
    const indexStr = JSON.stringify(index);
    if (!this.moveDecoderMap.has(indexStr)) {
      throw new Error(`No move encoding found for index: ${
          index}. Num actions is ${this.numActions}.`);
    }
    return this.moveDecoderMap.get(indexStr);
  }

  /**
   * Define the model architecture.
   */
  createDenseModel() {
    const BOARD_STATE_AND_PLAYER_UNITS =
        (3 * 3 * possibleCellStates.length) + 4;

    const model = tf.sequential();
    model.add(tf.layers.dense({
      inputShape: [BOARD_STATE_AND_PLAYER_UNITS],
      units: BOARD_STATE_AND_PLAYER_UNITS,
      name: `dense0_${Date.now()}`
    }));
    model.add(tf.layers.dense(
        {units: 512, activation: 'relu', name: `dense1_${Date.now()}`}));
    model.add(tf.layers.dense(
        {units: 512, activation: 'relu', name: `dense2_${Date.now()}`}));
    model.add(tf.layers.dense(
        {units: this.numActions, name: `dense3_${Date.now()}`}));
    model.summary();
    return model;
  }

  /**
   * Copy weights from online to target DQN.
   */
  copyWeights(source, target) {
    const sourceWeights = source.getWeights();
    target.setWeights(sourceWeights);
  }

  cellToString(cell: Cell): string {
    const sorted = clone(cell).sort();
    const asString = sorted.join('').replace(/-1/g, '-');
    return asString;
  }

  boardStateToOneHot(boardState: BoardState) {
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

  /**
   * Use epsilon greedy strategy to make either a random move or a move using
   * the network.
   */
  //@ts-ignore
  move(boardState): AgentMove {
    const onlyRandom = false;
    if (onlyRandom || Math.random() < this.epsilon) {
      return this.randomMover.move(boardState) as AgentMove;
    } else {
      return this.getPredictedAction(
          boardState, this.symbol, this.hasMadeDoubleMove);
    }
  }

  getPredictedAction(boardState, playerSymbol, doubleMoveState): AgentMove {
    const action = tf.tidy(() => {
      const stateTensor =
          this.convertToTensor(boardState, playerSymbol, doubleMoveState);
      const logits =
          this.onlineNetwork.predict(stateTensor.expandDims()) as tf.Tensor2D;

      const argMax = logits.argMax(-1);
      return argMax.dataSync()[0];
    });

    const decodedPositions =
        this.decodeMove(action) as [number] | [number, number];
    const isDoubleMove = decodedPositions.length === 2;
    if (isDoubleMove) {
      this.hasMadeDoubleMove = true;
    }

    const move = {
      symbol: playerSymbol,
      positions: decodedPositions,
      isDoubleMove,
    };
    // console.log('getPredictedAction', move);
    return move;
  }

  /**
   * Create the tensor fed into the model.
   */
  convertToTensor(
      boardState: BoardState, playerSymbol: string, doubleMoveState: boolean) {
    // Much faster to cache the one hots than generate them on the fly
    const boardStateKey: string = JSON.stringify(boardState);
    const inputTensorKey =
        boardStateKey + playerSymbol + String(doubleMoveState);

    if (!inputTensorCache.has(inputTensorKey)) {
      const boardStateOH = this.boardStateToOneHot(boardState);
      const playerStateOH =
          this.agentStateToOneHot(playerSymbol, doubleMoveState);

      const combinedOH = tf.concat([boardStateOH, playerStateOH]);
      tf.keep(combinedOH);
      inputTensorCache.set(inputTensorKey, combinedOH);

      if (global.debug) {
        console.log(
            'convertToTensor', boardState, playerSymbol, doubleMoveState);
        console.log('convertToTensor: result', combinedOH.dataSync());
      }
    }
    const combined = inputTensorCache.get(inputTensorKey);

    return combined;
  }

  /**
   * Run a single train step of the DQN algorithm.
   * @param replayBatch
   */
  trainStep(replayBatch: ReplayElement[]) {
    return tf.tidy(() => {
      const inputStates: tf.Tensor[] = [];
      const actions: tf.Tensor[] = [];
      const rewards: number[] = [];
      const nextStates: tf.Tensor[] = [];
      const done: boolean[] = [];

      //
      // Unzip the replayBatch properties into arrays.
      //
      for (let i = 0; i < replayBatch.length; i++) {
        const r = replayBatch[i];

        inputStates.push(this.convertToTensor(
            r.inputState, r.agentSymbol, r.hasAgentMadeDoubleMoveBefore));
        actions.push(this.encodeMove(r.actionTaken.positions));
        rewards.push(r.reward);
        nextStates.push(this.convertToTensor(
            r.nextState, r.agentSymbol, r.hasAgentMadeDoubleMoveAfter));

        // Note: because this is a mask we want to flip the boolean values
        // so that 'true' (aka done) values become 0 and are removed.
        // They are removed as they have no nextQ value
        done.push(!r.done);
      }

      /////
      // Compute online network q predictions
      // Note: This won't use the reward because we want it to learn to
      // predict rewards by mimicking the target network which does have
      // access to the reward signals.
      /////

      const inputsTensor = tf.stack(inputStates);
      const allQs = this.onlineNetwork.predict(inputsTensor) as tf.Tensor2D;

      const actionsOneHot = tf.stack(actions);
      const qs = allQs.mul(actionsOneHot).sum(-1);
      // console.log('allQs', allQs);
      // allQs.print();
      // console.log('actionsOneHot', actionsOneHot);
      // actionsOneHot.print();
      // console.log('qs', qs);
      // qs.print();

      /////
      // Compute targetQs for the action. This is calculated using the Bellman
      // equation
      // targetQ = reward + gamma * max(nextQ)  -- if game is not done
      // targetQ = reward                       -- if game is done
      /////
      const rewardsTensor = tf.tensor1d(rewards);
      const nextStatesTensor = tf.stack(nextStates);
      // console.log('rewardsTensor', rewardsTensor);
      // rewardsTensor.print();

      // Make prediction of q values for the __next__ state through the target
      // network.
      const nextQsAll =
          this.targetNetwork.predict(nextStatesTensor) as tf.Tensor2D;
      const maxNextQs = nextQsAll.max(-1);

      const doneMask = tf.tensor1d(done, 'bool').asType('float32');
      const gamma = 0.90;
      const targetQs = rewardsTensor.add(maxNextQs.mul(doneMask).mul(gamma));

      // console.log('maxNextQs', maxNextQs);
      // maxNextQs.print();
      // console.log('targetQs', targetQs);
      // targetQs.print();

      /////
      // Compute loss between targetQs and predicted qs from online network.
      /////
      const loss: tf.Scalar = tf.losses.meanSquaredError(targetQs, qs);
      return loss;
    });
  }

  /**
   * The full training loop for the DQN
   */
  train(replayBatch, gameIndex) {
    return tf.tidy(() => {
      let retVal;

      // We use an optimizer directly as we only want to make updates to the
      // online network during minimization.
      const startTime = Date.now();
      const variables = this.onlineNetwork.getWeights(true) as tf.Variable[];
      const lossFn = () => this.trainStep(replayBatch);
      const loss = this.optimizer.minimize(lossFn, true, variables);

      // Periodically update the target network, we also return some stats
      // for logging.
      if (gameIndex > 0 && gameIndex % this.updateTargetEvery === 0 &&
          gameIndex !== this.lastGameUpdate) {
        this.lastGameUpdate = gameIndex;

        const lossVal = loss.dataSync()[0];
        const endTime = Date.now();
        const time = endTime - startTime;

        retVal = {
          loss: lossVal,
          trainStepTime: time,
        };

        console.log('Updating target network');
        this.copyWeights(this.onlineNetwork, this.targetNetwork);

        if (this.epsilon > this.minEpsilon) {
          this.epsilon -= this.epsilonDecay;
          this.epsilon = Math.max(this.minEpsilon, this.epsilon);
          console.log('New epsilon', this.epsilon);
        }
      }
      return retVal;
    });
  }
}
