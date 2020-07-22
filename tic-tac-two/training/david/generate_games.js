

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

// --------------- CONSTANTS -------------

const fs = require('fs');

const LOOK_FOR_WINNING_MOVE = false;

const NUMBER_OF_GAMES_TO_TRY = 40000;  // upper limit on attempts
                                       // to get to gTargetNumberOfUniques
const NUMBER_OF_MOVES_TO_GET = -1;  // If -1, it will just get all legit moves
                                    // in the number of games played
const ODDS_OF_DOUBLE = 8;  // one in how many chances a player will play double?
const SHOW_STATUS = true;
const MARK_CHARS = ['-', 'O', 'X'];
const CURVE_OF_DOUBLES = 'INCREASING'

// filenames
const DATE = '2020-05-27';
let baseFileName = NUMBER_OF_GAMES_TO_TRY + '-';
if (LOOK_FOR_WINNING_MOVE) {
  baseFileName += 'LOOKFORWINNINGMOVE-';
}
baseFileName += DATE + '.json';

const GAMES_FILENAME = './json/GAMES-' + baseFileName;

// the eight unique rows in the square, so we can look for winners in each
const EIGHT_ROWS = new Array();
EIGHT_ROWS[0] = new Array(0, 1, 2);  // row 1
EIGHT_ROWS[1] = new Array(3, 4, 5);  // row 2
EIGHT_ROWS[2] = new Array(6, 7, 8);  // row 3
EIGHT_ROWS[3] = new Array(0, 4, 8);  // diag 1
EIGHT_ROWS[4] = new Array(2, 4, 6);  // diag 2
EIGHT_ROWS[5] = new Array(0, 3, 6);  // col 1
EIGHT_ROWS[6] = new Array(1, 4, 7);  // col 2
EIGHT_ROWS[7] = new Array(2, 5, 8);  // col 3

// --------------- GAME DATA STRUCTURES -------------
// BOX - each of the 9 squares
function boxstruct(
    owner, ownerDisplay,
    markString3,  // e.g."XO-""
    markArray,    // e.g."XO-""
    boxNumber, moveNumber, doublePlay) {
  this.owner = owner;
  this.ownerDisplay = ownerDisplay;
  this.markString3 = markString3;
  this.markArray = markArray;
  this.boxNumber = boxNumber;
  this.moveNumber = moveNumber;  // To capture doubleplays
  this.doublePlay = doublePlay;  // records which player doubled
}

// MOVE
function moveStruct(
    gameNumber, moveNumber, sequentialMoveNumber, player, playedDoubleThisTurn,
    boardStr27, nextBoardStr27, boardStr27display, nextBoardStr27display,
    boardStr9, nextBoardStr9, gameWinner, boxToPlay, markToPlay, boxesToPlay,
    whoHasDouble, firstMover) {
  this.gameNumber = gameNumber;
  this.moveNumber = moveNumber;                      // which move in a game
  this.sequentialMoveNumber = sequentialMoveNumber;  // in sequence of all games
  this.player = player;

  this.playedDoubleThisTurn = playedDoubleThisTurn;

  this.boardStr000027 = boardStr27;
  this.nextBoardStr27 = nextBoardStr27;
  this.boardStr000027display = boardStr27display;
  this.nextBoardStr27display = nextBoardStr27display;
  this.boardStr9 = boardStr9;
  this.nextBoardStr9 = nextBoardStr9;
  this.gameWinner = gameWinner;  // who won the overrall game
  this.boxToPlay = boxToPlay;
  this.markToPlay = markToPlay;    // the label 0 -26
  this.boxesToPlay = boxesToPlay;  // if recording double as one move
  this.whoHasDouble = whoHasDouble;
  this.firstMover = this.firstMover;
}

// Games have arrays of moves + some higher level info
function gameStruct(
    gameNumber, winner, firstMover, numberOfMoves, moves, tookWinningMove) {
  this.gameNumber = gameNumber;
  this.winner = winner;
  this.firstMover = firstMover;
  this.numberOfMoves = numberOfMoves;
  this.moves = moves;
  this.tookWinningMove = tookWinningMove;
}

// ******************************
//         EXECUTE IT
// ******************************

playGames();

// ******************************
//         PLAY ALL GAMES
// ******************************
function playGames() {
  // loop through as games as needed

  // ---- Variables that apply to the sum of all games
  status('Generating games');
  // var all_legit_GAMES = []; // save all games with winners as objects that
  // contain all their moves
  var all_legit_GAMES = [];

  all_legit_GAMES = [];

  let gAttemptedGamesCtr = 0;  // includes tied games (not recorded)
  let gLegitGamesCtr = 0;      // games recorded
  let gTotal1wins = 0;
  let totalGamesWithWinners = 0;
  let gTotal0wins = 0;
  let gTotalTies = 0;
  let gamesTriedCtr = 1;
  let doublesPlayedAllGames = 0;
  let gamePlayedReturn = [];
  let all_legit_MOVES = [];
  let tookWinningMove = 0;

  let gAllMovesCtr = 0;

  // initialize moves-per-square counter
  let numberOfMovesEach = [];
  for (let y = 0; y < 27; y++) {
    numberOfMovesEach[y] = 0;
  }

  // set 0 or 1 as first mover
  let player;
  let firstMover = 0;

  // ------------LET THE GAMES BEGIN!

  // loop until we have enough games or moves
  let loopingForGames = true;
  while (loopingForGames) {
    if (NUMBER_OF_MOVES_TO_GET == -1 &&
        gamesTriedCtr >= NUMBER_OF_GAMES_TO_TRY) {
      loopingForGames = false;
    }
    if ((NUMBER_OF_MOVES_TO_GET > -1 &&
         all_legit_MOVES.length >= NUMBER_OF_MOVES_TO_GET) ||
        gamesTriedCtr >= NUMBER_OF_GAMES_TO_TRY) {
      loopingForGames = false;
    }

    // -------------- PLAY A GAME -----------
    firstMover = firstMover == 1 ? 0 : 1;
    player = firstMover;

    gamePlayedReturn =
        play_ONE_game(player, firstMover, doublesPlayedAllGames, gamesTriedCtr);

    // --------------------- FINISHED A GAME
    game = gamePlayedReturn.game;
    doublesPlayedAllGames =
        doublesPlayedAllGames + gamePlayedReturn.doublesPlayedAllGames;
    if (game.moves.length < 5) {
      debugger;
    }
    if (gamePlayedReturn.tookWinningMove == true) {
      tookWinningMove++;
    }

    let winner = game.winner;

    // tally winners
    if (winner == 0) {
      gTotal0wins++;
      totalGamesWithWinners++;
    }
    if (winner == 1) {
      gTotal1wins++;
      totalGamesWithWinners++;
    }
    if (winner == -1) {
      gTotalTies++;
    }
    // Report on status every thousand games
    let reportingInterval = NUMBER_OF_GAMES_TO_TRY / 10;
    if (gamesTriedCtr % reportingInterval == 0) {
      status(
          'Finished Game #' + gamesTriedCtr + '. Winner: ' + winner +
          ' firstMover:' + firstMover +
          ' Total games with winner: ' + totalGamesWithWinners);
      status(
          'O wins: ' + gTotal0wins + '. X wins: ' + gTotal1wins +
          '. Ties: ' + gTotalTies);
    }

    // ----- Add moves to array
    // If either player won, then add the
    // winning player's moves to the array
    if (winner > -1) {
      // We got ourselves a keeper!

      // go through the moves and add late data:
      // e.g., who won the game
      for (let j = 0; j < game.moves.length; j++) {
        gAllMovesCtr++;  // increment moves counter
        // Go through a move
        let move = game['moves'][j];
        // get rid of currentboardarray - bigt and usefuless
        move.currentBoardArray.length = 0;
        move.sequentialMoveNumber = gAllMovesCtr;
        move.gameWinner = game.winner;
        move.gameNumber = gLegitGamesCtr;
        // In the GAMES json, save all moves, even by the losing player
        // so we can debug it better.
        // In the MOVES json , only save the moves that led
        // to a winning game, i.e. game.winner == player

        // add the late data,
        // and save move into the flat list of moves
        if (move.player == game.winner) {
          all_legit_MOVES.push(move);
        }  // if move player = winner
      }    // all moves in a game

      // record game in its entirety. (Game has a winner)
      game.gameNumber = gLegitGamesCtr;
      gLegitGamesCtr++;
      game.winner = winner;
      game.firstMover = firstMover;
      game.numberOfMoves = game['moves'].length;
      let gameDate = getDate();
      game.date = gameDate;
      if (game.moves.length < 5) {
        debugger;
      }

      // add it to the big array of games
      all_legit_GAMES.push(game);

      // count how many moves each game took
      numberOfMovesEach[game.numberOfMoves]++;
    }  // won a game

    // how games have we tried overall, including ties?
    gAttemptedGamesCtr++;
    gamesTriedCtr++;
  }  // playing all games

  // ---- FINISHED PLAYING ALL GAMES
  console.log(
      'GAMES WON: ' + gLegitGamesCtr + ' Attempts: ' + gAttemptedGamesCtr +
      '. TOTAL MOVES: ' + all_legit_MOVES.length + ' O won: ' + gTotal0wins +
      ' X won: ' + gTotal1wins + ' Doubles Played: ' + doublesPlayedAllGames);

  console.log('Number of Moves in a game: ');
  for (let x = 0; x < 27; x++) {
    // histogram += x +":" +  numberOfMovesEach[x] + " ";
    status(x + ': ' + numberOfMovesEach[x]);
  }

  // write the file
  writeJson(gAllMovesCtr, all_legit_GAMES);
}

// ******************************
// -------- PLAY ONE GAME -------
// ******************************

function play_ONE_game(player, firstMover, doublesPlayedAllGames, gameCtr) {
  // Each move has the board string the player faced. That's the input.
  // The label is the move the player made.
  // GetAMove may choose to play a double. It will count as one
  //  move with 2 new marks instead of just one new one.

  let i, b;
  // new array of boxes
  boxes9 = [];
  for (i = 0; i < 9; i++) {
    b = new boxstruct();
    b.owner = -1;
    b.Display = '-';
    b.markString3 = '---';
    b.markArray = ['-', '-', '-'];
    b.doublePlay = -1;
    b.moveNumber = -1;
    b.boxNumber = i;
    boxes9[i] = b;
  }

  var currentBoardArray = [
    ['-', '-', '-'],
    ['-', '-', '-'],
    ['-', '-', '-'],
    ['-', '-', '-'],
    ['-', '-', '-'],
    ['-', '-', '-'],
    ['-', '-', '-'],
    ['-', '-', '-'],
    ['-', '-', '-'],
  ];

  let dubsAvailable = [1, 1];
  let doublesPlayedThisGame = 0;
  // let move;

  var done = false;
  var stillPlayingAGame = true;

  var game = new gameStruct();
  game.firstMover = firstMover;
  game.player = firstMover;  // to begin with
  game.moves = [];
  game.winner = -1;
  var player = game.player;
  let moveCtr = 0;
  let tookWinningMove = false;  // looked for and took winning move

  //  PLAY THE GAME ----------------------------------------------
  // Even if player played a double, both markers
  // will be recorded in a single move.
  while (stillPlayingAGame) {
    let timesThrough = 0;
    let playingADouble = false;
    let gettingAMove = true;
    let boxToPlay = -1;
    let boxesToPlay =
        [-1, -1];  // if double counts as one move, need both boxes played
    let spotToPlay = -1;
    let spotsToPlay = [-1, -1];
    let move;
    // these are the inputs even if a doubleplay
    let inputStrings = {
      string9: '---------',
      // string27: "OXOXX-O--OX-X--XOXOXOOOXO--",
      string27: '---------------------------',
      display27: '---------------------------',
    };

    // GETTING A MOVE ------------------------------------
    while (gettingAMove) {
      // get a move
      // IF WE TOOKWINNING MOVES_FILENAME, STO P SEARCHING
      boxReturn =
          getAMove(player, boxes9, game.moves.length, dubsAvailable[player]);
      boxToPlay = boxReturn.box;
      spotToPlay = boxReturn.spot;

      if (LOOK_FOR_WINNING_MOVE && boxReturn.tookWinningMove == true) {
        tookWinningMove++;
        game.moves.push(move);
        return {
          game: game,
          doublesPlayedAllGames: doublesPlayedAllGames,
          tookWinningMove: tookWinningMove,
        };
      }
      if (boxToPlay == -1) {
        // no move available, so game is over
        gettingAMove = false;
        game.winner = -1;
        return {
          game: game,
          doublesPlayedAllGames: doublesPlayedAllGames,
          tookWinningMove: false,
        };
      }

      if (gettingAMove == true) {
        if (playingADouble) {
          boxesToPlay[1] = boxToPlay;
          spotsToPlay[1] = spotToPlay;
        } else {
          boxesToPlay[0] = boxToPlay;
          spotsToPlay[0] = spotToPlay;
        }

        // did that win the game?
      }
      let gamewinner = checkForGameWinner(boxes9);
      if (gamewinner > -1) {
        gettingAMove = false;
        stillPlayingAGame = false;
        game.winner = gamewinner;
      }
      // if no winner and all boxes are owned
      if (gamewinner == -2) {
        gettingAMove = false;
        stillPlayingAGame = false;
        game.winner = -1;
      }

      // If we're not playing a double
      if (playingADouble == false) {
        // create a new move
        mmove = new moveStruct();
        move = createNewMoveObject(
            mmove, player, moveCtr, boxToPlay, boxesToPlay, firstMover,
            currentBoardArray,  // array of -1's
            dubsAvailable.slice(), inputStrings);
        move.playedDoubleThisTurn = false;
        // if not double, update inputs
        inputStrings = constructBoardStr(boxes9);
        move.boardStr000027 = inputStrings.string27;
        move.boardStr9 = inputStrings.string9;
        move.display27 = inputStrings.display27;

        gettingAMove = false;
      }  // not playing a double

      // fill in the move data
      // Only difference from playing a double is whether it's a new move object
      move.boxToPlay = boxToPlay;

      // update the label strings
      if (boxToPlay < 0) {
        // game is over
        gamewinner = checkForGameWinner(boxes9);
        game.winner = gamewinner;
        game.moves.push(move);
        return [game, doublesPlayedAllGames, tookWinningMove];
      }
      // Update boxes9.marks so we can get NEXT board strings
      let updates = updateBoxAndCurrentBoardArrayMarkArray(
          boxes9, boxToPlay, player, currentBoardArray);
      currentBoardArray = updates.currentBoardArray;
      boxes9 = updates.boxes;
      nextStrings = constructBoardStr(boxes9);
      move['nextBoardString9'] = nextStrings['string9'];
      move['nextBoardStr27display'] = nextStrings['display27'];
      move['nextBoardStr27'] = nextStrings['string27'];

      if (playingADouble == true) {
        move.playedDoubleThisTurn = true;
        gettingAMove = false;
      }
      playingADouble = false;

      // --- MAY WE PLAY A DOUBLE?
      if (gamewinner == -1 && dubsAvailable[player] == 1) {
        let rando = Math.floor(Math.random() * ODDS_OF_DOUBLE) + 1;
        if (CURVE_OF_DOUBLES == 'INCREASING') {
          Math.floor(Math.random() * ODDS_OF_DOUBLE) + 1;
        }
        playingADouble = rando == 1;

        // --- Double Time! Game on!

        if (playingADouble == true) {
          gettingAMove = true;

          move.whoHasDouble[player] = 0;
          dubsAvailable[player] = 0;

          doublesPlayedAllGames++;
          doublesPlayedThisGame++;

        }  // Nope, not playing a double next round
      }    // not eligible for a double

      if (game.moves.length >= 27) {
        gettingAMove = false;
        playingADouble = false;
        stillPlayingAGame = false;
      }
    }  // --------- done with the move

    game.moves.push(move);
    moveCtr++;
    player = player == 1 ? 0 : 1;
  }  // stillplaying

  return {
    game: game,
    doublesPlayedAllGames: doublesPlayedAllGames,
    tookWinningMove: tookWinningMove,
  };
}

function getAMove(player, boxes, moveCtr, dubsAvailableToPlayer) {
  // get a random move - only one
  // If it's a double, playAGame will come here twice
  // but keep moveCtr the same

  let boxToPlay = -1;
  let spotToPlay = -1;
  let tookWinningMove = false;
  let sqi, thisSqWorks;

  // randomize the squares to keep the ML honest
  var squares = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  squares = shuffle(squares);

  // --- look for a legit move
  var stillLooking = true;
  var i = 0, sq;

  while (stillLooking) {
    // Look for an immediately winning move
    // if the parameter is set and there have been
    // at least 8 moves
    if (LOOK_FOR_WINNING_MOVE && moveCtr >= 7) {
      spotToPlay = checkForWinningMove(player, boxes, dubsAvailableToPlayer);
      // found a winning move
      if (spotToPlay > -1) {
        // convert spot to box:
        boxToPlay = Math.floor(spotToPlay / 3);
        tookWinningMove = true;
        return {box: boxToPlay, spot: spotToPlay, tookWinningMove};
      }
    }

    // try a square (squares have been randomized)
    sqi = squares[i];

    // Does this square work? (sends it the box object)
    thisSqWorks = isBoxPlayable(boxes[sqi]);
    // returns -1 if not playable
    if (thisSqWorks == true) {
      boxToPlay = sqi;
      stillLooking = false;
    } else {
      // square doesn't work
      // not a playable box
      i++;
      if (i >= 9) {
        stillLooking = false;
      }
    }
  }  // stilllooking

  // update the box
  if (boxToPlay > -1) {
    let offset = boxes[boxToPlay].markString3.indexOf('-');
    spotToPlay = boxToPlay * 3 + offset;
  } else {
    boxToPlay = -1;
    spotToPlay = -1;
    stillLooking = false;
  }

  return {
    box: boxToPlay,
    spot: spotToPlay,
    tookWinningMove: tookWinningMove,
  };
}

function isBoxPlayable(bx) {
  // if it's owned, not playable
  if (bx.owner !== -1) {
    return false;
  }

  // get the text contents of the box
  let boxCount = getMarkCount(bx);
  let dashes = boxCount[2];

  let playbox;
  // does it have 2-3 dashes? Then it's playable
  if (dashes > 0) {
    playbox = bx.markArray.indexOf('-');
    return true;
  } else {
    return false;
  }
}

function getMarkCount(bx) {
  let marks = bx.markArray;
  let xs = 0, os = 0, dashes = 0;
  for (let i = 0; i < 3; i++) {
    switch (marks[i]) {
      case 'X':
        xs++;
        break;
      case 'O':
        os++;
        break;
      case '-':
        dashes++;
        break;
    }
  }

  return [os, xs, dashes];
}

function checkForWinningMove(player, bxs, dubsAvailableToPlayer) {
  // TODO implement this functionality
  return -1;
}


function checkForGameWinner(boxes) {
  // go through the 8 winning rows looking for a winner
  let winner = -1;
  let done = false;
  let rowctr = 0;
  let ownedBoxes = 0;
  let thisrow;

  while (done == false) {
    // look at each row of eight and count Xes and Oes
    thisrow = EIGHT_ROWS[rowctr];  // get a new row  of 8
    let Xowns = 0, Oowns = 0, owner = -1;
    for (let j = 0; j < 3; j++) {
      owner = boxes[thisrow[j]].owner;
      if (owner > -1) {
      }
      if (owner == '0') {
        Oowns++;
      }
      if (owner == '1') {
        Xowns++;
      }
    }
    // gone through one of the 8 rows
    if (Oowns == 3) {
      winner = 0;
      done = true;
    }
    if (Xowns == 3) {
      winner = 1;
      done = true;
    }
    rowctr++;
    if (rowctr == 8) {
      done = true;
    }
  }
  // if all boxes are owned and no winner
  let b;
  for (b = 0; b < 9; b++) {
    if (boxes[b].owner > -1) {
      ownedBoxes++;
    }
  }
  if (winner == -1 && ownedBoxes == 9) {
    winner = -2;
  }

  return winner;
}



function writeJson(totalMoves, all_legit_GAMES) {
  // writes out 2 json files:
  // 1. All games with a winner, including all moves.
  // 2. Flat list of moves in games with a winner,
  //     where the move was made by the game winner
  //      and "move" means a board string

  // --- Save nested set of all games with a winner, with all moves

  let all_games = [];
  let meta = {
    FILE: GAMES_FILENAME,
    DATE: DATE,
    NUMBER_OF_GAMES_TO_TRY: NUMBER_OF_GAMES_TO_TRY,
    NUMBER_OF_MOVES_TO_GET: NUMBER_OF_MOVES_TO_GET,
    NUMBER_OF_GAMES_PLAYED: all_legit_GAMES.length,
    NUMBER_OF_MOVES: totalMoves,
    LOOK_FOR_WINNING_MOVE: LOOK_FOR_WINNING_MOVE,
    ODDS_OF_DOUBLE: ODDS_OF_DOUBLE,
    CURVE_OF_DOUBLES: CURVE_OF_DOUBLES,
  };
  all_games.push({meta: meta});

  all_games.push({games: all_legit_GAMES});
  let gamesjsn = JSON.stringify(all_games, null, 2);
  fs.writeFile(GAMES_FILENAME, gamesjsn, (err) => {
    if (err) throw err;
    status('Games written to ' + GAMES_FILENAME);
  });
}

// ---------------------- UTILITIES -------------

function createNewMoveObject(
    move, player, movenumber, boxToPlay, boxesToPlay, firstMover,
    currentBoardArray, whoHasDouble, inputStrings) {
  // let move = new moveStruct();
  move.moveNumber = 0;
  move.boardStr000027 = '';
  move.nextBoardArray = [];
  move.boxToPlay = boxToPlay;
  move.boxesToPlay = boxesToPlay;
  move.player = player;
  move.gameWinner = -1;
  move.moveNumber = movenumber;
  move.currentBoardArray = currentBoardArray;
  move.whoHasDouble = whoHasDouble;
  move.firstMover = firstMover;
  move.playedDoubleThisTurn = false;
  move.boardStr000027 = inputStrings['string27'];
  move.boardStr9 = inputStrings['string9'];
  move.boardStr000027 = inputStrings['display27'];
  return move;
}

function constructBoardStr(boxes) {
  // builds strings FROM gBox info:
  // simpleStr: "XX-OX-XO-"
  //  boardStr27display: "x-o_xxo_---|x-o_xxo_---|x-o_xxo_---";
  // boardStr27: "XO-XX0XX0-XX-OO-OO-XO-X--XO-OO-X0"

  let i;
  let underscores = [2, 5, 11, 14, 20, 23];
  let uprights = [8, 17];
  let simpleStr = ''
  let flatstr = '';
  let fullDisplayStr = '';
  // simple string - only show owners of the 9 boxes
  for (i = 0; i < 9; i++) {
    let owner = boxes[i].owner;
    switch (owner) {
      case -1:
        simpleStr += '-';
        break;
      case 0:
        simpleStr += 'O';
        break;
      case 1:
        simpleStr += 'X';
        break;
    }
    // now build a flat string of all 27 marks
    flatstr += boxes[i].markArray.join('');
  }

  // go through flat string of 27, adding separators
  for (i = 0; i < 27; i++) {
    fullDisplayStr += flatstr[i];
    if (underscores.includes(i)) {
      fullDisplayStr += ' ';
    }
    if (uprights.includes(i)) {
      fullDisplayStr += ' | ';
    }
  }

  return {
    string9: simpleStr,
    string27: flatstr,
    display27: fullDisplayStr,
  };
}

function updateBoxAndCurrentBoardArrayMarkArray(
    boxes, boxNumber, player, currentBoardArray) {
  let mark = MARK_CHARS[player + 1];

  let box = boxes[boxNumber];
  if (box == undefined) {
    debugger;
  }
  let markArray = box.markArray;
  let c = -1;
  // if there's not blank, it's over
  // If there is a blank, change the first
  // one to this player's mark
  c = markArray.indexOf('-');
  if (c !== -1) {
    markArray[c] = mark;
  }
  box.markString3 = markArray.join('');

  // did player just own a box?
  let marks = getMarkCount(boxes[boxNumber]);
  if (marks[player] > 1) {
    boxes[boxNumber].owner = player;
  }
  // update currentBoardArray
  currentBoardArray[boxNumber] = markArray;
  return {currentBoardArray: currentBoardArray, boxes: boxes};
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

// --------- STATUS
function status(txt) {
  if (SHOW_STATUS == true) {
    console.log(txt);
  }
}

function getDate() {
  // current date
  let date_ob = new Date();
  // adjust 0 before single digit date
  let date = ('0' + date_ob.getDate()).slice(-2);
  let month = ('0' + (date_ob.getMonth() + 1)).slice(-2);
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();

  // prints date & time in YYYY-MM-DD HH:MM:SS format
  return (
      year + '-' + month + '-' + date + ' ' + hours + ':' + minutes + ':' +
      seconds + '\n\n');
}
