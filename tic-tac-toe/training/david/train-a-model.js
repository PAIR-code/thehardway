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


const tf = require('@tensorflow/tfjs-node');

//-------- Globals ---------
// Yes, globals, dammit. And vars! Stop laughing!

// path to your json file of games
var gJsonFileName = './15Kmoves.json';  // WORKS with this one

// path to the model file this will create and save
var gSaveModelName = 'file://./models/15kmoves';
console.log('starting up...');

// hyperparameters we can set
var gEpochsNumber = 100;

var gBatchSize = 64;
var gValidationSplit = 0.1;

var maxMovesToLoad = -1;  // -1 = train on all games in the JSON file

// one hots to describe box ownership
const oh_un = [0, 0, 1];  // unowned
const oh_o = [0, 1, 0];   // O
const oh_x = [1, 0, 0];   // X
const oh_moves = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1]
];
// use a blank onehot board as a template
const oh_blankboard = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0, 0]
];

var gOnehotAllMoves = new Array();  // all the games and their moves
var gOnehotAllLabels = [];

var gAllMovesTensor = [];
var gAllLabelsTensor = [];

/*
 * Run main, which controls the whole thing
 */
main();

function main() {
  loadData();
  console.log('Loaded data');
  console.log('Starting createTensors');
  createTensors();
  console.log('Building model');
  buildModel();
}

function loadData() {
  console.log('Loading data from file: ' + gJsonFileName);
  let fs = require('fs');
  var rawjsn = fs.readFileSync(gJsonFileName);
  var jsn = JSON.parse(rawjsn);
  console.log('Read ' + gJsonFileName + '. Found ' + jsn.length + ' records.');
  processJson(jsn);
}

function processJson(moves) {
  // 000 = unowned    001 = O owns  010 = X owns
  // so you will have 9 of those triplets
  console.log('Processing json data...');

  // how many game records to go through?
  // if maxMovesToLoad = -1, then go through them all;
  maxMovesToLoad = -1;
  if (maxMovesToLoad == -1) {
    maxMovesToLoad = moves.length;
  }

  let moveCtr = 0;

  console.log('Going through ' + maxMovesToLoad + ' moves.');
  console.log(
      'first in array: ' + moves[0]['boardstr'] + ' <> ' +
      moves[0]['boxToPlay']);

  // --- Go through each move
  for (let i = 0; i < maxMovesToLoad; i++) {
    let boardd = moves[i]['boardstr'];
    let boxToPlay = moves[i]['boxToPlay'];

    moveCtr++;

    //--  build onehots for the move and next move (label)

    let n, c, oh;
    // clone the global blankboard const
    let onehotBoard = [...oh_blankboard];

    // replace blankboard with the values in the boardstring
    for (n = 0; n < 9; n++) {
      c = boardd[n];
      switch (c) {
        case '-':
          oh = oh_un;
          break;
        case '0':
          oh = oh_o;
          break;
        case '1':
          oh = oh_x;
          break;
      }
      onehotBoard[n] = oh;
    }
    // createOneHot label -- a single integer
    let onehotLabel = oh_moves[boxToPlay];

    // push the array of board + player onto the global list of moves
    gOnehotAllMoves.push(onehotBoard);
    gOnehotAllLabels.push(onehotLabel);
  }

  console.log('Total moves loaded: ' + moveCtr);
  console.log('Number of moves in  gOnehotAllMoves:' + gOnehotAllMoves.length);
  console.log(
      'Number of labels in gOnehotAllLabels:' + gOnehotAllLabels.length);
}

async function createTensors() {
  // create the arrays and tensors we need

  // for each board:
  // Create array of 9 onehots to describe  board state
  //    - flatten all of those moves
  //
  // This will be a 27-element, 1D array
  //
  // The move info (not flattened) is in gOnehotAllMoves. It's an array whose
  // length
  //  equals all the moves in all the games. The moves are just listed as sets
  //  of 9 onehots (one per square). There is no grouping into games. Just a
  //  long list of boardstates+player
  //
  // So, for 100 games with 800 moves/boards, there will 800 members, each (9 x
  // 3) chars
  //    long.

  console.log('in Create Tensors');

  let allflat;
  let allflatlabel;
  let allMovesPreTensor = [];
  let allLabelsPreTensor = [];

  // Flatten these arrays, including the onehot arrays within them
  for (i = 0; i < gOnehotAllMoves.length; i++) {
    allflat = flatten(gOnehotAllMoves[i]);
    allMovesPreTensor.push(allflat);

    // now do labels
    allflatlabel = flatten(gOnehotAllLabels[i]);
    allLabelsPreTensor.push(allflatlabel);
  }

  // Create moves tensor
  gAllMovesTensor = tf.tensor(allMovesPreTensor);
  // Create labels tensor using array build in processJson
  gAllLabelsTensor = tf.tensor(allLabelsPreTensor);

  // update status
  console.log(
      'Created move tensors. Shape: ' + gAllMovesTensor.shape[0] + ',' +
      gAllMovesTensor.shape[1]);
  console.log(
      'Created label tensors. Shape: ' + gAllLabelsTensor.shape[0] + ',' +
      gAllLabelsTensor.shape[1]);
}

async function saveModel(theModel) {
  // Saves the model, appending the seconds when it was created
  // since the model is saved after every epoch in case you
  // want to interrupt the training but save the model.

  var secondsString = Math.floor(Date.now() / 1000);
  var filename = gSaveModelName + '-' + secondsString;
  await theModel.save(filename);
  console.log('Saved model: ' + filename);
}

async function buildModel() {
  console.log('Building model...');

  const gTheModel = await createModel();
  console.log('Back in buildModel, after awaiting createModel.');
  gTheModel.summary();
  var d = new Date();
  console.log(
      'Training model started: ' + d.getHours() + ':' + (d.getMinutes() + 1) +
      ':' + d.getSeconds());
  await train(gTheModel);
  saveModel(gTheModel);
}

// Note: The big explanatory comment blocks come from the file from
//  TensorFlow.js that I pasted in as a template

async function createModel() {
  // Create a sequential neural network model. tf.sequential provides an API
  // for creating "stacked" models where the output from one layer is used as
  // the input to the next layer.
  console.log('In createModel');
  const model = tf.sequential();

  // Create the layers
  model.add(tf.layers.dense({inputShape: [27], units: 64}));
  model.add(tf.layers.dense({units: 256, activation: 'relu'}));
  model.add(tf.layers.dense({units: 256, activation: 'relu'}));
  model.add(tf.layers.dense({units: 256, activation: 'relu'}));
  model.add(tf.layers.dense({units: 9, activation: 'softmax'}));
  return model;
}

async function train(model) {
  // some alternative optimizers: 'sgd', 'adam'; 'rmsprop'
  const optimizer = 'adam';
  model.compile(
      {optimizer, loss: 'categoricalCrossentropy', metrics: ['accuracy']});

  // In this instance, I used no validation info since we'll test it
  // against a random game generator

  console.log('Model Summary before model.fit');
  model.summary();

  await model
      .fit(gAllMovesTensor, gAllLabelsTensor, {
        batchSize: gBatchSize,
        epochs: gEpochsNumber,
        validationSplit: gValidationSplit
      })
      .catch(error => console.log('++ERROR:' + error.message));
}

// -- flatten arrays
function flatten(items) {
  // Source (thanks!):
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
