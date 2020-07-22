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
import {SummaryFileWriter} from '@tensorflow/tfjs-node-gpu/dist/tensorboard';

import {ReplayMemory} from './replay_memory';

/**
 * Utility class to log training metrics to tensorboard.
 */
export class MetricLogger {
  rewardsBuffer: ReplayMemory;
  cumulativeRewardWindowSize: number;
  numRewardSamples: number;

  steps: {};
  writer: SummaryFileWriter;

  constructor({logDir, cumulativeRewardWindowSize, runId}) {
    const maxQueue = 10;
    const flushMillis = 1000 * 60;

    const logDirWithId = `${logDir}/${runId}`;
    this.writer =
        tf.node.summaryFileWriter(logDirWithId, maxQueue, flushMillis);

    // Number of rewards to average over when reporting metrics.
    this.cumulativeRewardWindowSize = cumulativeRewardWindowSize;

    // Total number of episode rewards collected
    this.numRewardSamples = 0;

    this.rewardsBuffer = new ReplayMemory(this.cumulativeRewardWindowSize);
    this.steps = {};
  }

  addEpisodeReward(reward) {
    this.rewardsBuffer.append(reward);
    if (this.rewardsBuffer.full()) {
      if (this.numRewardSamples % this.cumulativeRewardWindowSize === 0) {
        const rewards = this.rewardsBuffer.memory;
        const numWins = rewards.filter(r => r.episodeResult === 'WIN').length;
        const numLosses =
            rewards.filter(r => r.episodeResult === 'LOSS').length;
        const numDqs = rewards.filter(r => r.episodeResult === 'DQ').length;
        const numTies = rewards.filter(r => r.episodeResult == null).length;

        const metricName =
            `Mean Cumulative Reward (${this.cumulativeRewardWindowSize})`;
        const meanCumulativeReward =
            this.mean(this.rewardsBuffer.memory.map(r => r.episodeReward));
        this.logScalar(metricName, meanCumulativeReward);

        this.logScalar('skill/Wins (last 100 games)', numWins);
        this.logScalar('skill/Losses (last 100 games)', numLosses);
        this.logScalar('skill/Disqualifications (last 100 games)', numDqs);
        this.logScalar('skill/Ties (last 100 games)', numTies);
        this.logScalar(
            'skill/checksum (last 100 games)',
            numWins + numLosses + numDqs + numTies);
      }
    }
  }

  logScalar(metricName, value, step?) {
    if (step == null) {
      if (this.steps[metricName] == null) {
        this.steps[metricName] = 0;
      }
      this.writer.scalar(metricName, value, this.steps[metricName]);
      this.steps[metricName] += 1;
    } else {
      this.writer.scalar(metricName, value, step);
    }
  }

  private mean(vals: number[]) {
    const sum = vals.reduce((num, memo) => num + memo, 0);
    return sum / vals.length;
  }
}
