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

const tf = require('@tensorflow/tfjs-node')
const fs = require('fs');
const FILE_NAME = 'GAMES-40000-2020-05-27';

// path to the json file of games
const JSON_FILE = './json/' + FILE_NAME + '.json';
// path to the model file this will create and save
const MODEL_PATH = 'file://./models/';

// hyperparameters we can set
const NUMBER_OF_EPOCHS = 50;
const VALIDATION_SPLIT = 0.1;
const BATCH_SIZE = 512;

const MAX_NUMBER_OF_GAMES = -1;  // -1 means load all games
const MAX_MOVES_TO_LOAD = -1;    // -1 = train on all games in the JSON file

var gAllMovesTensor;
var gAllLabelsTensor;

// ------------- EXECUTION -----------

const onehots = loadData(MAX_MOVES_TO_LOAD);
const bothTensors = createTensors(onehots.boardsOnehots, onehots.labelOnehots);
main(bothTensors);

// --------------- FUNCTIONS ------------

async function main(bothTensors) {
  const model = await createModel(bothTensors);
  const d = new Date();
  console.log(
      'Training model started: ' + d.getHours() + ':' + (d.getMinutes() + 1) +
      ':' + d.getSeconds());

  await train(model, bothTensors);
  saveModel(model);
}

function loadData() {
  console.log('Loading data from file: ' + JSON_FILE);
  let all_labels_onehots = [];
  let all_boards_onehots = [];

  var rawjsn = fs.readFileSync(JSON_FILE);
  var jsn = JSON.parse(rawjsn);
  let games = jsn[1].games;
  console.log('Read ' + JSON_FILE + '. Found ' + games.length + ' games.');

  if (MAX_NUMBER_OF_GAMES > -1) {
    if (games.length > MAX_NUMBER_OF_GAMES) {
      games = games.slice(0, MAX_NUMBER_OF_GAMES);
    }
  }

  let i, j, game, moves, move, gameWinner, player;
  // --- Go through each GAME
  for (i = 0; i < games.length; i++) {
    game = games[i];
    gameWinner = game.winner;
    moves = game.moves;
    for (j = 0; j < moves.length; j++) {
      move = moves[j];
      if (gameWinner == move.player) {
        let boardd = move.boardStr000027;
        let boxesToPlay = move.boxesToPlay;
        let whoHasDouble = move.whoHasDouble;

        // --  build input for tensor
        // Turn the board into onehots
        let inputPreTensor = [];
        inputPreTensor.push(createOneHotBoardStr(boardd));
        if (player == 0) {
          inputPreTensor.push([0, 1]);
        } else {
          inputPreTensor.push([1, 0]);
        }

        if (whoHasDouble[player] == 0) {
          inputPreTensor.push([0, 1]);  // [o,1] == true
        } else {
          inputPreTensor.push([1, 0]);
        }
        // -- build label for tensor
        // The label can encode 2 squares in case of double
        let labelPretensor = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        // string of marks into onehot of squares to play
        let k;
        for (k = 0; k < 2; k++) {
          let squareToPlay = boxesToPlay[k];
          if (squareToPlay > -1) {
            if (k == 1) {
              // debugger
            }
            labelPretensor[squareToPlay] = 1;
          }
        }

        all_labels_onehots.push(labelPretensor);
        all_boards_onehots.push(inputPreTensor);
      }
    }
  }

  console.log('Loaded data');
  return {
    labelOnehots: all_labels_onehots,
    boardsOnehots: all_boards_onehots,
  };
}
function createOneHotMark(ch) {
  let oneHotMark = [];
  if (ch == '-') {
    oneHotMark = [1, 0, 0];
  }
  if (ch == 'O') {
    oneHotMark = [0, 1, 0];
  }
  if (ch == 'X') {
    oneHotMark = [0, 0, 1];
  }
  return oneHotMark;
}

function createOneHotBoardStr(boardstr) {
  // for each mark, create a onehot
  let oneHotMark;
  let onehotBoard = [];
  for (let k = 0; k < boardstr.length; k++) {
    oneHotMark = createOneHotMark(boardstr[k]);
    onehotBoard.push(oneHotMark);
  }
  return onehotBoard;
}

function createTensors(all_boards_onehots, all_labels_onehots) {
  // create the arrays and tensors we need

  let gamesTensor = [], game, moves, owner, boardflat, playerflat, winnerflat,
      allflat, allflatlabel;
  let allMovesPreTensor = [];
  let allLabelsPreTensor = [];

  // Flatten these arrays, including the onehot arrays within them
  for (i = 0; i < all_boards_onehots.length; i++) {
    allflat = flatten(all_boards_onehots[i]);
    allMovesPreTensor.push(allflat);

    // now do labels

    allflatlabel = flatten(all_labels_onehots[i]);
    // console.log("label: ", i, allflatlabel);
    allLabelsPreTensor.push(allflatlabel);
  }

  // Create moves tensor

  gAllMovesTensor = tf.tensor(allMovesPreTensor);
  // Create labels tensor using array build in processJson
  gAllLabelsTensor = tf.tensor(allLabelsPreTensor);

  console.log('done tensoring moves' + gAllMovesTensor);
  console.log('done tensoring labels' + gAllLabelsTensor);
  console.log('Total number of moves: ' + allMovesPreTensor.length);

  // update status
  console.log(
      'Created move tensors. Shape: ' + gAllMovesTensor.shape[0] + ',' +
      gAllMovesTensor.shape[1]);
  console.log(
      'Created label tensors. Shape: ' + gAllLabelsTensor.shape[0] + ',' +
      gAllLabelsTensor.shape[1]);

  return [gAllMovesTensor, gAllLabelsTensor];
}

async function saveModel(theModel) {
  // Saves the model, appending the seconds when it was created
  // since the model is saved after every epoch in case you
  // want to interrupt the training but save the model.

  var secondsString = Math.floor(Date.now() / 1000);
  var filename = MODEL_PATH + FILE_NAME + '-' + secondsString;
  // console.log("Saving model " + filename);
  await theModel.save(filename);
  console.log('Saved model: ' + filename);
}



async function createModel() {
  // Create a sequential neural network model. tf.sequential provides an API
  // for creating "stacked" models where the output from one layer is used as
  // the input to the next layer.
  const model = tf.sequential();

  const numberOfBoxes = 9;

  model.add(tf.layers.dense({inputShape: [85], units: 128}));
  model.add(tf.layers.dense({units: 512, activation: 'relu'}));
  model.add(tf.layers.dense({units: 128, activation: 'relu'}));
  model.add(tf.layers.dense({units: numberOfBoxes, activation: 'sigmoid'}));

  // compile model
  const optimizer = 'adam';
  model.compile({
    optimizer,
    loss: 'binaryCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}

async function train(model, bothTensors) {
  console.log('Model Summary');
  model.summary();

  console.log('Training model');
  const inputs = bothTensors[0];
  const labels = bothTensors[1];
  await model.fit(inputs, labels, {
    batchSize: BATCH_SIZE,
    epochs: NUMBER_OF_EPOCHS,
    validationSplit: VALIDATION_SPLIT,
    shuffle: true,
  });
  console.log('Done Training');
}

// -- flatten arrays
function flatten(items) {
  // Source (thanks!):
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
