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


const fs = require('fs');
// files to save the json to:
const gMovesOutFilename = './15Kmoves.json';
const gGamesOutFilename = './100Kgames.json';

// Only records moves that led to a winning
// game. Depending on how many games you play,
// you may not get this many.
const gNumberOfDesiredMoves = 15000;

// upper limit on attempts to get to gNumberOfDesiredMoves
const gMaxNumberOfGamesToTry = 100000;
//  All moves in a game with a winner, as a flat list
//  of boardstrings and nextMoves
var gAllMovesArray = [];
//  All games with winners
var gAllLegitGames = [];
// Includes tied games (which are not saved)
var gAttemptedGamesCtr = 0;
// games recorded
var gLegitGamesCtr = 0;
var gFirstMover = 0;
var gShowStatus = false;
var gTotal1wins = 0;
var gTotal0wins = 0;
var gTotalTies = 0;
var gUniqueMovesCtr = 0;

// --------------- GAME DATA STRUCTURES -------------
// Each square of the TTT board
function boxstruct(winner, moveNumber, owner, nextMove) {
  this.winner = winner;
  this.moveNumber = moveNumber;
  this.owner = -1;
  this.nextMove = -1;
}
var boxes = new Array();

// Each move played
function moveStruct(
    player, box, boardStr, nextBoardStr, moveNumber, winner, firstMover,
    movesUntilEnd, boxToPlay) {
  this.player = player;
  this.box = box;  // unnecessary
  this.boardStr = boardStr;
  this.nextBoardStr = nextBoardStr;
  this.moveNumber = moveNumber;  // which square to play
  this.winner = winner;          // who won the overrall game
  this.firstMover = this.firstMover;
  this.movesUntilEnd = this.movesUntilEnd;
  this.boxToPlay = this.boxToPlay;
}

// Games have arrays of moves + some higher level info
function gameStruct(index, winner, firstMover, numberOfMoves, moves) {
  this.index = index;
  this.winner = winner;
  this.firstMover = firstMover;
  this.numberOfMoves = numberOfMoves;
  this.moves = moves;
}

// the eight unique rows in the square, so we can look for winners in each
const eightrows = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 4, 8], [2, 4, 6], [0, 3, 6], [1, 4, 7],
  [2, 5, 8]
];

// ------- EXECUTE IT ------------------------------------------
init();
playGames();

// ------------- INIT
function init() {
  console.log('In init');
  gUniqueMovesCtr = 0;

  let i, b;
  // global array of boxes
  for (i = 0; i < 9; i++) {
    b = new boxstruct();
    boxes.push(b);  // boxes is a global. So shoot me.
  }
  console.log('Init done');
}

// -------- PLAY ALL GAMES -----
function playGames() {
  // loop through playing games

  // -- Reset everything

  status('Resetting to play new round of games');
  gAllMovesArray = [];

  gTotal1wins = 0;
  gTotal0wins = 0;
  gTotalTies = 0;
  gFirstMover = 0;
  var gamesTriedCtr = 0;
  gAllMovesCtr = 0;

  // --------------------PLAY GAMES
  // loop until enough moves, or we've maxed out on games
  while (gamesTriedCtr < gMaxNumberOfGamesToTry &&
         gAllMovesArray.length < gNumberOfDesiredMoves) {
    // initialize the boxes after each game
    for (var i = 0; i < 9; i++) {
      boxes[i].owner = '-';
      boxes[i].moveNumber = 0;
      boxes[i].winner = -1;
      boxes[i].boardStr = '---------';
      boxes[i].nextBoardStr = '---------';
      boxes[i].nextMove = -1;
    }

    // -------------- PLAY A GAME

    gamesTriedCtr++;
    var game = playGame(gUniqueMovesCtr, gFirstMover);
    var winner = game.winner;

    // --------------------- FINISHED A GAME

    // tally winners
    if (winner == 0) {
      gTotal0wins++;
    }
    if (winner == 1) {
      gTotal1wins++;
    }
    if (winner == -1) {
      gTotalTies++;
    }
    // Report on status every thousand games
    if (gamesTriedCtr % 1000 == 0) {
      console.log(
          'Player O wins: ' + gTotal0wins + '. X wins: ' + gTotal1wins +
          '. Ties: ' + gTotalTies + '. Total lefgit games: ' + gLegitGamesCtr);
    }

    // ----- Add moves to array
    // If either player won, then add the
    // winning player's moves to the array
    if (winner > -1) {
      // We got ourselves a keeper!
      gLegitGamesCtr++;

      // go through the moves and add labels. Label = the move it played
      for (let j = 0; j < game['moves'].length; j++) {
        gAllMovesCtr++;  // increment moves counter
        // Go through a move
        let move = game['moves'][j];

        // Only save the moves that led to a winning game
        if (move.player == winner) {
          let board = move.boardStr;

          // if UNIQUE input, and if the move is by the game winner,
          // then  add it to array with the label
          // (Turned off this uniqueness test. Code commented out.)
          if (1 == 1) {
            //(gUsedInputsArray.includes(board) !== true) {
            // if we don't already have this input (= boardstate),
            // then add it to the gInput array, which is used
            // only for determining uniqueness
            // gUsedInputsArray.push(board);
            // gUniqueMovesCtr++;

            // Add to array of moves without games
            // if the move is by the game-winning player
            if (move.player == game.winner) {
              gAllMovesArray.push({
                player: move.player,
                firstMover: game['firstMover'],
                gameWinner: game.winner,
                boardstr: board,
                boxToPlay: move.boxToPlay
              });
            }
          }
        }
      }  // all moves in a game

      // record game in its entirety. (Game has a winner)
      game.index = gLegitGamesCtr;
      game.winner = winner;
      game.firstMover = gFirstMover;
      game.numberOfMoves = game['moves'].length;

      // add it to the big array of games
      gAllLegitGames.push(game);
    }  // won a game

    // how games have we tried overall, including ties?
    gAttemptedGamesCtr++;

    // switch the first move player
    if (gFirstMover == 0) {
      gFirstMover = 1;
    } else {
      gFirstMover = 0;
    }
  }

  console.log(
      'GAMES WON: ' + gAllLegitGames.length + ' Attempts: ' +
      gAttemptedGamesCtr + '. TOTAL MOVES: ' + gAllMovesArray.length);

  // ---- FINISHED PLAYING ALL GAMES
  status(
      ' Player O has won ' + (gUniqueMovesCtr + 1) + ' times, out of ' +
      gAttemptedGamesCtr + ' attempts.');

  // write the file
  writeJson();
}

// -------- PLAY ONE GAME -------

function playGame(gameCtr, firstMover) {
  // Each move has the board string the player faced. That's the input.
  // The label is the move the player made.

  var player = firstMover;
  var done = false;
  let stillPlaying = true;
  var moveCtr = 0;
  var game = new gameStruct();
  game.firstMover = firstMover;
  game.player = firstMover;  // to begin with
  game.moves = [];
  game.winner = -1;
  // add an initial blank board
  var move = new moveStruct();
  move.moveNumber = 0;
  move.boardStr = '---------';
  move.nextMove = -1;
  move.player = player;
  move.firstMover = firstMover;
  move.box = -1;
  move.winner = -1;
  // game.moves[0] = move;

  var boardStr = '---------';
  var newBoardStr = '';

  // play the game
  while (stillPlaying) {
    // set up for move

    //  --- Get a Move
    var boxToPlay = getAMove(player);

    // if got a move
    if (boxToPlay != -1) {
      // create new move
      var move = new moveStruct();
      // get the current boardstring as the input
      move.boardStr = boardStr;
      // now get boardstr after the player moves
      newBoardStr = updateBoardStr(boxToPlay, boardStr, player);
      move.nextBoardStr = newBoardStr;
      move.boxToPlay = boxToPlay;
      move.firstMover = gFirstMover;
      move.player = player;
      move.moveNumber = moveCtr;
      // setup for next move
      boardStr = newBoardStr;
      // update the boxes
      boxes[boxToPlay].owner = player;
    }
    // if there are no moves left
    else {
      stillPlaying = false;
    }
    // did someone just win?
    var winner = checkForWinner();
    if (winner > -1) {
      boxes[boxToPlay].winner = player;
      stillPlaying = false;
      game['winner'] = winner;
    }  // finished a move

    // add
    game.moves.push(move);

    // increment move counter
    moveCtr++;

    // switch player
    player = player === 0 ? 1 : 0;
  }

  // game is over

  return game;
}

function getAMove(player) {
  // get a random move
  // shuffles the order of squares,
  // and goes through them 0-8.

  var boxToPlay = -1;
  var squares = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  // randomize the squares to keep the ML honest
  squares = shuffle(squares);

  var stillLooking = true;

  // Look for an immediately winning move
  boxToPlay = checkForWinningMove(player);
  if (boxToPlay > -1) {
    // found a winning move
    return boxToPlay;
  }

  // Didn't find a winning move, so get a random one
  var i = 0, sqi;
  while (stillLooking) {
    sqi = squares[i];  // get next randomized box index
    if (boxes[sqi].owner == '-') {
      // found an empty
      boxToPlay = sqi;
      stillLooking = false;
    } else {
      i++;
      if (i >= 9) {
        // no open squares
        stillLooking = false;
      }
    }
  }
  return boxToPlay;
}

function checkForWinningMove(player) {
  // player is 0 or 1.
  // typical board is "-1-0---1--"
  let boardstr = getboardString();
  let winningMove = -1;
  // find all winning moves and then randomly choose
  let winningsMoves = [];
  var i = 0, row;
  var ox, j, boxstring = '', b;
  var doneWithRows = false;

  // go through the eight rows
  while (doneWithRows == false) {
    row = eightrows[i];
    // go through each of the 3 boxes
    let playerOwned = 0;
    let emptySlots = 0;
    // let emptyboxes= [];
    let emptybox = -1;
    // go through each box in this row
    for (j = 0; j < 3; j++) {
      b = boxes[j];
      if (b.owner == player) {
        playerOwned++;
      }
      if (b.owner == '-') {
        emptySlots++;
        // record empty boxes
        emptybox = b;
      }
    }
    // can the player win in this row?
    if (playerOwned == 2 && emptySlots == 1) {
      winningMove = i;
      return winningMove;
    }
    // Gone through a row. Is there room for a win in it?
    if (winningMove > -1) {
      doneWithRows = true;
    }
    // increment row ctr
    i++;
    if (i > 7) {
      doneWithRows = true;
    }
  }  // finished going through rows

  return winningMove;
}

function checkForWinner() {
  // go through the 8 winning rows looking for a winner
  var winner = -1;
  var done = false;
  var rowctr = 0;
  var thisrow;
  while (done == false) {
    // look at each row of eight and count Xes and Oes
    thisrow = eightrows[rowctr];  // get a new row  of 8
    var ones = 0, zeros = 0, owner = -1;
    for (var j = 0; j < 3; j++) {
      owner = boxes[thisrow[j]].owner;
      if (owner == '0') {
        zeros++;
      }
      if (owner == '1') {
        ones++;
      }
    }
    // gone through one of the 8 rows
    if (zeros == 3) {
      winner = 0;
      done = true;
    }
    if (ones == 3) {
      winner = 1;
      done = true;
    }
    rowctr++;
    if (rowctr == 8) {
      done = true;
    }
  }

  return winner;
}

function writeJson() {
  // writes out 2 json files:
  // 1. All games with a winner, including all moves.
  // 2. Flat list of moves in games with a winner,
  //     where the move was made by the game winner
  //      and "move" means a board string

  // --- Save flat list of move objects
  var jsn = JSON.stringify(gAllMovesArray, null, 2);
  fs.writeFile(gMovesOutFilename, jsn, err => {
    if (err) throw err;
    console.log('Data written to file: ' + gMovesOutFilename);
  });

  // --- Save nested set of all games with a winner, with all moves

  var gamesjsn = JSON.stringify(gAllLegitGames, null, 2);
  fs.writeFile(gGamesOutFilename, gamesjsn, err => {
    if (err) throw err;
    console.log('Games written to ' + gGamesOutFilename);
  });
}

// ---------------------- UTILITIES -------------

function updateBoardStr(index, str, replacement) {
  let c = -1;
  if (replacement == 0) {
    c = 'O';
  }
  if (replacement == 1) {
    c = 'X';
  }
  if (replacement == 0) {
    c = '-';
  }
  let news = str.substr(0, index) + replacement + str.substr(index + 1);
  return news;
}

function printAs3x3(str) {
  // print the string as a board
  var brd = str[0] + str[1] + str[2] + '\n';
  brd = brd + str[3] + str[4] + str[5] + '\n';
  brd = brd + str[6] + str[7] + str[8] + '\n';
  return brd;
}

// ------- SHUFFLE
function shuffle(a) {
  var currentIndex = a.length, tempVal, randomi;
  while (0 !== currentIndex) {
    randomi = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    tempVal = a[currentIndex];
    a[currentIndex] = a[randomi];
    a[randomi] = tempVal;
  }
  return a;
}

function getboardString() {
  // go through the boxes constructing a string,
  // one char for each box
  var str = '', ownerchar;
  for (var i = 0; i < 9; i++) {
    ownerchar = '-';  // default
    if (boxes[i].owner == 0) {
      ownerchar = 'O';
    }
    if (boxes[i].owner == 1) {
      ownerchar = 'X';
    }
    str = str + ownerchar;
  }

  return str;
}

// --------- STATUS
function status(txt) {
  if (gShowStatus == true) {
    console.log(txt);
  }
}
