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
import {Move} from './game';

// Cache one hot representations of boards and players to speed things up
const inputTensorCache = new Map<any, tf.Tensor>();

/**
 * Agent class that implemented the double DQN training algorithm.
 */
export class DenseDQNAgent extends AbstractAgent {
  symbol: string;
  epsilon: number;
  minEpsilon: number;
  epsilonDecay: number;
  numActions: number;

  updateTargetEvery: number;
  lastGameUpdate: number;

  onlineNetwork: tf.Sequential;
  targetNetwork: tf.Sequential;
  optimizer: tf.Optimizer;

  constructor(options) {
    super(options);
    this.symbol = options.symbol;
    this.epsilon = options.epsilonStart || 0.95;
    this.minEpsilon = options.minEpsilon || 0.05;
    this.epsilonDecay = options.epsilonDecay || 0.01;
    this.numActions = 9;

    this.onlineNetwork = this.createDenseModel();
    this.targetNetwork = this.createDenseModel();
    this.copyWeights(this.onlineNetwork, this.targetNetwork);

    this.optimizer = tf.train.adam(0.001);
    this.updateTargetEvery = options.updateEvery || 1500;

    this.lastGameUpdate = -1;
  }

  async init() {}

  /**
   * Define the model architecture.
   */
  createDenseModel() {
    const BOARD_STATE_AND_PLAYER_UNITS = 29;

    const model = tf.sequential();
    model.add(tf.layers.dense({
      inputShape: [BOARD_STATE_AND_PLAYER_UNITS],
      units: BOARD_STATE_AND_PLAYER_UNITS
    }));
    model.add(tf.layers.dense({units: 128, activation: 'relu'}));
    model.add(tf.layers.dense({units: 64, activation: 'relu'}));
    model.add(tf.layers.dense({units: this.numActions}));
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

  /**
   * Convert board state symbols to numeric values that can be turned into
   * a tensor.
   */
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
  move(boardState) {
    if (Math.random() < this.epsilon) {
      const position = this.getRandomAction(boardState);
      return {symbol: this.symbol, position} as Move;
    } else {
      const position = this.getPredictedAction(boardState, this.symbol);
      return {symbol: this.symbol, position} as Move;
    }
  }

  getRandomAction(boardState) {
    const freeIndices = boardState.reduce((memo, val, idx) => {
      // Allow the random agent to make legal moves
      if (val === -1) {
        memo.push(idx);
      }
      return memo;
    }, []);

    if (freeIndices.length === 0) {
      throw new Error('No legal moves for DQNAgent');
    }

    // Select an index to play.
    const nextIndex = Math.floor(Math.random() * freeIndices.length);
    const nextPosition = freeIndices[nextIndex];
    return nextPosition;
  }

  getPredictedAction(boardState, playerSymbol) {
    const nextPosition = tf.tidy(() => {
      const stateTensor = this.convertToTensor(boardState, playerSymbol);
      const logits =
          this.onlineNetwork.predict(stateTensor.expandDims()) as tf.Tensor2D;
      const action = logits.argMax(-1).dataSync()[0];
      return action;
    });
    return nextPosition;
  }

  /**
   * Create the tensor fed into the model.
   */
  convertToTensor(boardState, playerSymbol: string) {
    // Much faster to cache the one hots than generate them on the fly
    const boardStateKey: string = boardState.join('');
    const inputTensorKey = boardStateKey + playerSymbol;

    if (!inputTensorCache.has(inputTensorKey)) {
      const boardStateNumeric = boardState.map(this.symbolToNumber);
      const boardStateOH = tf.oneHot(boardStateNumeric, 3).flatten();

      const playerStateNumeric = this.symbolToNumber(playerSymbol);
      const playerStateOH = tf.oneHot(playerStateNumeric, 2).flatten();

      const combinedOH = tf.concat([boardStateOH, playerStateOH]);
      tf.keep(combinedOH);
      inputTensorCache.set(inputTensorKey, combinedOH);
    }
    const combined = inputTensorCache.get(inputTensorKey);
    return combined;
  }

  /**
   * Run a single train step of the DQN algorithm.
   * @param replayBatch
   */
  trainStep(replayBatch) {
    return tf.tidy(() => {
      const inputStates = [];
      const actions = [];
      const rewards = [];
      const nextStates = [];
      const done = [];

      //
      // Unzip the replayBatch properties into arrays.
      //
      for (let i = 0; i < replayBatch.length; i++) {
        const r = replayBatch[i];
        // agentSymbol needs to come from replay memory as the agent may have
        // played as a different symbol previously.
        const agentSymbol = r.agentSymbol;

        inputStates.push(this.convertToTensor(r.inputState, agentSymbol));
        actions.push(r.actionTaken);
        rewards.push(r.reward);
        nextStates.push(this.convertToTensor(r.nextState, agentSymbol));

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
      const actionsTensor = tf.tensor1d(actions, 'int32');
      const allQs = this.onlineNetwork.predict(inputsTensor) as tf.Tensor2D;
      const qs = allQs.mul(tf.oneHot(actionsTensor, this.numActions)).sum(-1);

      /////
      // Compute targetQs for the action. This is calculated using the Bellman
      // equation
      // targetQ = reward + gamma * max(nextQ)  -- if game is not done
      // targetQ = reward                       -- if game is done
      /////
      const rewardsTensor = tf.tensor1d(rewards);
      const nextStatesTensor = tf.stack(nextStates);

      // Make prediction of q values for the __next__ state through the target
      // network.
      const nextQsAll =
          this.targetNetwork.predict(nextStatesTensor) as tf.Tensor2D;
      const maxNextQs = nextQsAll.max(-1);

      const doneMask = tf.tensor1d(done, 'bool').asType('float32');
      const gamma = 0.90;
      const targetQs = rewardsTensor.add(maxNextQs.mul(doneMask).mul(gamma));

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
