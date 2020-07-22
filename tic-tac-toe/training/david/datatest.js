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


var rawjsn = fs.readFileSync(gJsonFileName);
var jsn = JSON.parse(rawjsn);
console.log('Read ' + gJsonFileName + '. Found ' + jsn.length + ' records.');

processJson(jsn);

function processJson(moves) {
  // 000 = unowned    001 = O owns  010 = X owns
  // so you will have 9 of those triplets
  console.log('Processing json data...')

  // how many game records to go through?
  // if maxMovesToLoad = -1, then go through them all;
  maxMovesToLoad = 5;
  if (maxMovesToLoad == -1) {
    maxMovesToLoad = moves.length;
  }

  let loadedctr = 0;
  let moveCtr = 0;

  console.log('Going through ' + maxMovesToLoad + ' moves.');
  console.log('length of first entry: ' + moves[0].length);
  console.log(
      'first in array: ' + moves[0]['boardstr'] + ' <> ' + moves[0]['nextM']);

  // --- Go through each GAME
  for (let i = 0; i < maxMovesToLoad; i++) {
    let boardd = moves[i]['boardstr'];
    let boxToPlay = moves[i]['boxToPlay'];
    console.log(i + ': ' + boardd + ' ' + boxToPlay);

    moveCtr++;

    //--  build onhots for the move and next move (label)
    let onehotBoard = createOneHotBoard(boardd);
    let onehotLabel = createOneHotBoard(boxToPlay);

    // push the array of board + player onto the global list of moves
    gOnehotAllMoves.push(onehotBoard);
    gOnehotAllLabels.push(oh_moves[parseInt(boxToPlay)]);
  }

  console.log('Total moves in Json: ' + moveCtr);
  console.log('Number of moves in   gOnehotAllMoves:' + gOnehotAllMoves.length);
  console.log(
      'Number of labels in gOnehotAllLabels:' + gOnehotAllLabels.length);
}
