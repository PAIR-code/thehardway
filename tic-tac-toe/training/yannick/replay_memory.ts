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

/**
 * A replay memory/buffer to store game step experiences.
 */
export class ReplayMemory {
  capacity: number;
  // tslint:disable-next-line: no-any
  memory: any[];
  indices: number[];
  head: number;

  constructor(capacity) {
    this.capacity = capacity;
    this.memory = [];
    this.indices = new Array(capacity).fill(1).map((_, i) => i);
    this.head = 0;
  }

  // Appends an item to the cicular buffer
  append(item) {
    this.memory[this.head] = item;
    this.head += 1;
    if (this.head === this.capacity) {
      this.head = 0;
    }
  }

  // Randomly sample numSamples from the buffer.
  sample(numSamples) {
    if (this.size() < this.capacity) {
      return [];
    }
    tf.util.shuffle(this.indices);

    const sampleIndices = this.indices.slice(0, numSamples);
    const items = [];
    sampleIndices.forEach((sampleIndex, itemIndex) => {
      items[itemIndex] = this.memory[sampleIndex];
    });
    return items;
  }

  size() {
    return this.memory.length;
  }

  full() {
    return this.memory.length === this.capacity;
  }
}
