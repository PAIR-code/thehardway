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

const oh_un = [1, 0, 0];
const oh_o = [0, 1, 0];
const oh_x = [0, 0, 1];

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
    let model =
        '../training/david/models/GAMES-40000-2020-05-27-1590594723/model.json';
    this.model = await tf.loadLayersModel(model);
    return;
  }

  /**
   * Will be called before the start of a game, useful for resetting agent
   * internal state.
   */
  startGame() {
    this.hasMadeDoubleMove = false;  // if agent has played a double already
  }

  move(boardState, hasOtherPlayerPlayedDouble) {
    // board state comes from the viewer
    // E.g., [ ["o",-1-1] [][][][][]]
    let newmove = this.getMLmove(boardState, hasOtherPlayerPlayedDouble);
    let isDouble;
    if (newmove.length == 1) {
      isDouble = false;
    }
    if (newmove.length > 1) {
      isDouble = true;
      this.hasMadeDoubleMove = true;
    }
    return {
      symbol: this.symbol,
      positions: newmove,  // an array of 1 or 2
      isDoubleMove: isDouble,
    };
  }

  getMLmove(boardState) {
    return tf.tidy(() => {
      // get a tensor suitable for DW's model
      let pretensor = [];
      // let onehot = [];
      let mark;
      let markoh = [];
      // let onehot = [];
      let flatBoard = flatten(boardState);
      // convert to onehots
      for (let i = 0; i < 27; i++) {
        mark = flatBoard[i];
        if (mark == 'o') {
          markoh = oh_o;
        }
        if (mark == 'x') {
          markoh = oh_x;
        }
        if (mark == -1) {
          markoh = oh_un;
        }
        pretensor.push(markoh);
      }

      // get player onehot
      // first get the player
      let onehotPlayer = [];
      let player = -1;
      // 0 is O and 1 is X
      if (this.symbol == 'o') {
        player = 0;
        onehotPlayer = [0, 1];
      } else {
        player = 1;
        onehotPlayer = [1, 0];
      }
      pretensor.push(onehotPlayer);

      let dwHasDouble;
      if (this.hasMadeDoubleMove === false) {
        dwHasDouble = [0, 1];  // true
      } else {
        dwHasDouble = [1, 0];  // false
      }
      pretensor.push(dwHasDouble);
      let flatPretensor = flatten(pretensor)

      // Construct the tensor
      let dwtensor = tf.tensor(flatPretensor);

      // use tensor to get a prediction
      let newmove = this.predictMoveDW(dwtensor);
      return newmove;
    });
  }


  predictMoveDW(gTensor) {
    let newmove = this.model.predict(gTensor.expandDims());
    const {values, indices} = tf.topk(newmove, 2);
    const topKValues = values.dataSync();
    const topKIndices = indices.dataSync();
    const squares = [];

    // if you comment this for loop out all the disqualifications
    // will go away. which suggests either the encoding of doubles
    // for the input doesn't match or the training data for double
    // plays isn't great/sufficient (it may be extremely rare)
    for (let i = 0; i < topKValues.length; i++) {
      if (topKValues[i] >= 0.5) {
        squares.push(topKIndices[i]);
      }
    }

    if (squares.length === 0) {
      squares.push(topKIndices[0]);
    }
    return squares;
  }
}
// -- flatten arrays
function flatten(items) {
  // https://stackoverflow.com/questions/30048388/javascript-recursive-array-flattening
  const flat = [];

  items.forEach((item) => {
    if (Array.isArray(item)) {
      flat.push(...flatten(item));
    } else {
      flat.push(item);
    }
  });

  return flat;
}
