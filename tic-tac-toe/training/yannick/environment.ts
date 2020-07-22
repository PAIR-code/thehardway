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

// import tf here so that the correct saveHandler is registered.
// @ts-ignore
import * as tf from '@tensorflow/tfjs-node-gpu';
import * as mkdirp from 'mkdirp';
import * as path from 'path';

import {RandomAgent} from '../../shared/random_agent.js';

import {DenseDQNAgent} from './agent';
import {Game} from './game';
import {MetricLogger} from './metrics';
import {ReplayMemory} from './replay_memory';

export const CONFIG = {
  rewards: {
    largePositive: 20,
    largeNegative: -10,
    veryLargeNegative: -30,
    smallPositive: 0.2,
    smallNegative: -0.05,
  },
  replayMemoryCapacity: 8000,
  batchSize: 512,
  numGames: 30000,
  epsilonStart: 0.95,
  minEpsilon: 0.01,
  updateEvery: 200,
  saveModelEvery: 1000,
  epsilonDecay: 0.025,  // default value. Will be updated below
  randomizeOrder: true,
  randomizeSymbol: true,
};

//
// Calculate a linear epsilon decay rate.
//

// Epochs in this context are the number of games played at a given epsilon.
const EPOCHS_TOTAL = Math.floor(CONFIG.numGames / CONFIG.updateEvery);
const EPOCHS_AT_MIN_EPSILON = Math.ceil(0.33 * EPOCHS_TOTAL);
const EPSILON_UPDATES = EPOCHS_TOTAL - EPOCHS_AT_MIN_EPSILON;
CONFIG.epsilonDecay =
    (CONFIG.epsilonStart - CONFIG.minEpsilon) / EPSILON_UPDATES;

console.log('Training Agent with config:', CONFIG);

export class Environment {
  replayMemory: ReplayMemory;
  agent: DenseDQNAgent;
  opponent: RandomAgent;
  game: Game;

  savePath: string;
  logDir: string;
  logger: MetricLogger;

  constructor(savePath, logDir) {
    this.replayMemory = new ReplayMemory(CONFIG.replayMemoryCapacity);

    // The agent we are training.
    this.agent = new DenseDQNAgent({
      symbol: 'o',
      epiilonStart: CONFIG.epsilonStart,
      epsilonDecay: CONFIG.epsilonDecay,
      minEpsilon: CONFIG.minEpsilon,
      updateEvery: CONFIG.updateEvery,
    });

    // The opponent it is training against.
    this.opponent = new RandomAgent({symbol: 'x'});

    // The game instance that will be used in the train loop
    this.game = new Game(
        this.opponent,
        this.agent,
        CONFIG.randomizeOrder,
        CONFIG.randomizeSymbol,
    );

    // Set up save paths and names
    const timeStamp = new Date();
    const timeStampStr =
        `${timeStamp.toDateString()} ${timeStamp.toLocaleTimeString()}`
            .split(' ')
            .join('-');

    const runId = `DQN-${timeStampStr}-es${CONFIG.epsilonStart}-me${
        CONFIG.minEpsilon}-ed${CONFIG.epsilonDecay.toFixed(3)}-ue${
        CONFIG.updateEvery}-rmc${CONFIG.replayMemoryCapacity}-b${
        CONFIG.batchSize}-n${CONFIG.numGames}`;
    const saveFolder = path.resolve(__dirname, savePath, runId);
    mkdirp.sync(saveFolder);

    this.savePath = `file://${saveFolder}`;
    this.logDir = `file://${path.resolve(__dirname, logDir)}`;

    this.logger = new MetricLogger({
      logDir: this.logDir,
      runId,
      cumulativeRewardWindowSize: 100,
    });

    console.log('Save path = ', this.savePath);
    console.log('Log dir = ', this.logDir);
  }

  async init() {
    await this.game.init();
  }

  /**
   * A single step of the training loop.
   *
   * Will run the game for one step, calculate rewards, update replay memory
   * and run the agents train function.
   */
  step() {
    const inputState = this.game.boardState.slice();
    let gameStep;
    let actionTaken;
    //@ts-ignore
    if (this.game.currentPlayer === this.agent) {
      // When it is the agent playing we either calculate the reward on game
      // end OR we allow the oppoenent to respond before calculating rewards
      gameStep = this.game.step();  // agent move
      actionTaken = gameStep.action.position;
      if (!gameStep.done) {
        gameStep = this.game.step();  // opponent move
      }
    } else {
      // If we start on the opponents turn, just advance simulation forward one
      // tick.
      gameStep = this.game.step();
      return {
        opponentMove: true,
        done: gameStep.done,
        doneState: {},
      };
    }

    // Calculate reward.
    let reward = 0;
    let doneState;  // we don't need to keep this but could be useful for
                    // debugging.
    if (gameStep.winState) {
      doneState = {
        winner: true,
        player: gameStep.winState.winningPlayer.symbol
      };
      if (gameStep.winState.winningPlayer === this.agent) {
        reward = CONFIG.rewards.largePositive;
        doneState.episodeResult = 'WIN';
      } else {
        reward = CONFIG.rewards.largeNegative;
        doneState.episodeResult = 'LOSS';
      }
    } else if (gameStep.errorState) {
      doneState = {
        disqualified: true,
        player: gameStep.errorState.disqualifiedPlayer.symbol
      };
      // Agent was disqualified.
      if (gameStep.errorState.disqualifiedPlayer === this.agent) {
        reward = CONFIG.rewards.veryLargeNegative;
        doneState.episodeResult = 'DQ';
      } else {
        doneState.episodeResult = 'OP_DQ';
      }
    } else {
      // game still going
      doneState = {};
      reward = CONFIG.rewards.smallNegative;
    }

    // Return a replay memory tuple. It should look like the following
    //{ inputState, actionTaken, nextState, reward, done, doneState}
    const nextState = this.game.boardState.slice();
    const replayElement = {
      agentSymbol: this.agent.symbol,
      inputState,
      actionTaken,
      reward,
      nextState,
      done: gameStep.done,
      doneState,
    };
    return replayElement;
  }

  async run() {
    await this.init();

    const replayMemory = this.replayMemory;
    const NUM_GAMES = CONFIG.numGames;
    for (let index = 0; index < NUM_GAMES; index++) {
      let episodeReward = 0;
      this.game.reset();

      // Inner loop runs a game through all its steps accumulating rewards
      // into episodeReward.
      let stepResult;
      do {
        stepResult = this.step();

        if (stepResult.reward != null) {
          episodeReward += stepResult.reward;
        }

        if (!stepResult.opponentMove) {
          replayMemory.append(stepResult);

          if (replayMemory.full() && stepResult.done) {
            // Sample from replay memory and train model.
            const trainingBatch = replayMemory.sample(CONFIG.batchSize);
            const info = this.agent.train(trainingBatch, index);

            // The agent doesn't return metrics every step.
            if (info != null) {
              this.logger.logScalar('loss', info.loss);
              this.logger.logScalar('trainStepTime', info.trainStepTime);
              this.logger.logScalar('agent.epsilon', this.agent.epsilon);
            }
          }
        }
      } while (stepResult.done !== true);

      // Episode complete
      this.logger.addEpisodeReward(
          {episodeReward, episodeResult: stepResult.doneState.episodeResult});

      // Occasionally save the model
      if (index % CONFIG.saveModelEvery === 0 && index > 0) {
        console.log(`Done with game ${index}. Saving model to disk`);
        await this.agent.onlineNetwork.save(this.savePath);
      }
    }

    await this.agent.onlineNetwork.save(this.savePath);
    console.log('\n *** Done with training *** \n');
  }
}
