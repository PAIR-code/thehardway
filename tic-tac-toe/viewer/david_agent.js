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

import {AbstractAgent} from '../shared/agent.js';

export class DavidAgent extends AbstractAgent {
  constructor(options) {
    super(options);
  }

  /**
   * An initialization function that can be used to load state that may
   * take a while to complete.
   */
  async init() {
    // load the model
    let gModel =
        '../training/david/models/15KmovesNonUniqueoNoCheckForWinnerJan16/model.json';
    this.themodel = await tf.loadLayersModel(gModel);
    console.log('DavidAgent model loaded');
    return;
  }

  move(boardState) {
    let newmove = this.getMLmove(boardState);
    return {
      symbol: this.symbol,
      position: newmove,
    };
  }

  /*
   * Other methods go below
   */

  getMLmove(boardState) {
    return tf.tidy(() => {
      // get a tensor suitable for DW's model
      let dwtensor = this.constructTensorDW(boardState);
      // use tensor to get a prediction
      let newmove = this.predictMoveDW(dwtensor);
      return newmove;
    });
  }

  constructTensorDW(board) {
    let moveOneHots = [];
    // let  blankBoard = true;
    const oh_un = [0, 0, 1];
    const oh_o = [0, 1, 0];
    const oh_x = [1, 0, 0];

    let i = 0;
    for (i = 0; i < 9; i++) {
      // get text from square
      let boxwinner = board[i];
      switch (boxwinner) {
        case 'x':
          moveOneHots.push(oh_x);
          // blankBoard = false;
          break;
        case 'o':
          moveOneHots.push(oh_o);
          // blankBoard = false;
          break;
        case -1:
          moveOneHots.push(oh_un);
          break;
      }
    }

    let flat = flatten(moveOneHots);
    let newTensor = tf.tensor(flat, [1, 27]);
    return newTensor;
  }

  predictMoveDW(gTensor) {
    let newmove = this.themodel.predict([gTensor]);
    let answerArray = newmove.dataSync();
    let highest = Math.max(...answerArray);
    let bestSquare = answerArray.indexOf(highest);
    return bestSquare;
  }
}

// -- flatten arrays
function flatten(items) {
  // https://stackoverflow.com/questions/30048388/javascript-recursive-array-flattening
  const flat = [];

  items.forEach(item => {
    if (Array.isArray(item)) {
      flat.push(...flatten(item));
    } else {
      flat.push(item);
    }
  });

  return flat;
}
