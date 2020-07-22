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
import {YannickAgent} from '../../viewer/yannick_agent.js';

import {DenseDQNAgent} from './agent';
// import {AgentMove, BoardState, ErrorState, Game, isErrorState, isMoveState,
// isWinState, StepResult, WinState} from './game';
import {AgentMove, BoardState, Game, isErrorState, isWinState, printBoard, StepResult} from './game';
import {MetricLogger} from './metrics';
import {ReplayMemory} from './replay_memory';
import {clone} from './util';

declare global {
  module NodeJS {
    interface Global {
      debug: boolean;
    }
  }
}

global.debug = false;

export const CONFIG = {
  rewards: {
    largePositive: 20,
    largeNegative: -10,
    veryLargeNegative: -30,
    smallPositive: 0.2,
    smallNegative: -0.05,
  },
  replayMemoryCapacity: 8000,
  batchSize: 256,
  numGames: 20000,
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

// An object in replay memory from which we can train
export interface ReplayElement {
  agentSymbol: string;
  hasAgentMadeDoubleMoveBefore: boolean;
  hasAgentMadeDoubleMoveAfter: boolean;
  inputState: BoardState;
  actionTaken: AgentMove;
  reward: number;
  nextState: BoardState;
  done: boolean;
  episodeResult?: EpisideResult;
}
type EpisideResult = 'WIN'|'LOSS'|'DQ'|'OPPONENT_DQ'|'TIE';

export class Environment {
  replayMemory: ReplayMemory;
  agent: DenseDQNAgent;
  opponent: RandomAgent|YannickAgent;
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

    // Train against a random agent
    this.opponent = new RandomAgent({
      symbol: 'x',
      doubleMoveProb: 0.25,
    });

    // Train against a previously trained agent
    // this.opponent = new YannickAgent({
    //   symbol: 'x',
    //   playOptimally: false,
    //   useRelativePath: false,
    //   modelName:
    //       '2020-3-25/DQN-RANDOPP-0.25-Sat-Apr-25-2020-12:20:19-AM-es0.95-me0.01-ed0.014-ue200-rmc8000-b256-n20000'
    // });

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
  step(): ReplayElement {
    const inputState = clone(this.game.boardState);
    let gameStep: StepResult;

    //@ts-ignore
    if (this.game.currentPlayer !== this.agent) {
      throw new Error('Agent must be currentPlayer before calling step.');
    }

    // When it is the agent playing we either calculate the reward on game
    // end OR we allow the oppoenent to respond before calculating rewards
    let prevBoard = clone(this.game.boardState);
    const hasAgentMadeDoubleMoveBefore = this.agent.hasMadeDoubleMove;
    gameStep = this.game.step();  // agent move
    const hasAgentMadeDoubleMoveAfter = this.agent.hasMadeDoubleMove;

    if (global.debug) {
      printBoard(this.game.boardState, prevBoard);
    }

    const actionTaken: AgentMove = gameStep.action;
    if (!gameStep.done) {
      prevBoard = this.game.boardState;
      gameStep = this.game.step();  // opponent move
    }

    if (global.debug) {
      // console.log('opponent move');
      printBoard(this.game.boardState, prevBoard);
    }

    // Calculate reward.

    let reward = 0;  // default reward for step
    let episodeResult: EpisideResult;

    if (isWinState(gameStep)) {
      // @ts-ignore
      if (gameStep.winningPlayer === this.agent) {
        reward = CONFIG.rewards.largePositive;
        episodeResult = 'WIN';
      } else {
        reward = CONFIG.rewards.largeNegative;
        episodeResult = 'LOSS';
      }
    }

    if (isErrorState(gameStep)) {
      //@ts-ignore
      if (gameStep.disqualifiedPlayer === this.agent) {
        reward = CONFIG.rewards.veryLargeNegative;
        episodeResult = 'DQ';
      } else {
        reward = 0;
        episodeResult = 'OPPONENT_DQ';
      }
    }

    // Return a replay memory element.
    const nextState = clone(this.game.boardState);
    const replayElement: ReplayElement = {
      agentSymbol: this.agent.symbol,
      hasAgentMadeDoubleMoveBefore,
      hasAgentMadeDoubleMoveAfter,
      inputState,
      actionTaken,
      reward,
      nextState,
      done: gameStep.done,
      episodeResult
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

      // @ts-ignore
      // We only want to collect rewards if the agent has made a move.
      // If the oppoenent starts the game we just directly advance the
      // game state.
      if (this.game.currentPlayer !== this.agent) {
        this.game.step();
      }

      // Inner loop runs a game through all its steps accumulating rewards
      // into episodeReward.
      let stepResult: ReplayElement;
      do {
        stepResult = this.step();

        episodeReward += stepResult.reward;
        replayMemory.append(stepResult);

        // Speed up training by only updating the model at the end of an
        // episode.
        if (replayMemory.full() && stepResult.done) {
          const trainingBatch = replayMemory.sample(CONFIG.batchSize);
          const info = this.agent.train(trainingBatch, index);

          if (info != null) {
            this.logger.logScalar('loss', info.loss);
            this.logger.logScalar('trainStepTime', info.trainStepTime);
            this.logger.logScalar('agent.epsilon', this.agent.epsilon);
          }
        }
      } while (stepResult.done !== true);

      // // Episode complete
      this.logger.addEpisodeReward(
          {episodeReward, episodeResult: stepResult.episodeResult});

      // // Occasionally save the model
      if (index % CONFIG.saveModelEvery === 0 && index > CONFIG.numGames / 4) {
        console.log(`Done with game ${index}. Saving model to disk`);
        await this.agent.onlineNetwork.save(this.savePath);
      }
    }

    await this.agent.onlineNetwork.save(this.savePath);
    console.log('\n *** Done with training *** \n');
  }
}
