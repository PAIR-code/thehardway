
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

let JUST_FILE_NAME;
// get any parameters
if (process.argv.length > 2) {
  JUST_FILE_NAME = process.argv[2];
  console.log("got it" + JUST_FILE_NAME);
} else {
  JUST_FILE_NAME = "GAMES-40000-2020-05-27"; // no extension
console.log("FILENAME:" + JUST_FILE_NAME);
}

const JSON_FILE_TO_CHECK =
  "./json/" +
  JUST_FILE_NAME +
  ".json";
const WRITE_LOG = true;
const LOG_PATH =
  "./logs/LOG_" +
  JUST_FILE_NAME +
  ".txt";

// ***************** MENU *********************
const GET_STATS = true;
const CHECK_DOUBLES = true;
const PRINT_BOARDS = false;
const ONLY_PRINT_DOUBLES = false; // parameter for print_boards
const DUPES = false;
const ILLEGAL_MOVES = true;
const SHOW_STATUS = true; // if false, no output
// *********************************************

// MOVE
function moveStruct(
  player,
  boxToPlay,
  boxesToPlay,
  boardStr27,
  nextBoardStr27,
  boardStr9,
  nextBoardStr9,
  boardStr27display,
  nextBoardStr27display,
  moveNumber,
  gameWinner,
  whoHasDouble,
  playedDoubleThisTurn,
  firstMover
) {
  this.player = player;
  this.boxToPlay = boxToPlay; // the label
  this.boxesToPlay = boxesToPlay; // if recording double as one move
  this.boardStr000027 = boardStr27;
  this.nextBoardStr27 = nextBoardStr27;
  this.boardStr9 = boardStr9;
  this.boardStr000027display = boardStr27display;
  this.nextBoardStr27display = nextBoardStr27display;
  this.nextBoardStr9 = nextBoardStr9;
  this.moveNumber = moveNumber; // which move in a game
  this.gameWinner = gameWinner; // who won the overrall game
  this.whoHasDouble = whoHasDouble;
  this.playedDoubleThisTurn = playedDoubleThisTurn;
  this.firstMover = this.firstMover;
}

function boxstruct(
  owner,
  ownerDisplay,
  fullString,
  markArray,
  boxNumber,
  moveNumber,
  doublePlay
) {
  this.owner = owner;
  this.ownerDisplay = ownerDisplay;
  this.fullString = fullString;
  this.markArray = markArray;
  this.boxNumber = boxNumber;
  this.moveNumber = moveNumber; // To capture doubleplays
  this.doublePlay = doublePlay; // records which player doubled
}

if (WRITE_LOG) {
  var fslog = require("fs");
  if (fslog.existsSync(LOG_PATH)) {
    fslog.unlinkSync(LOG_PATH); // delete existing
  }
  var logger = fslog.createWriteStream(LOG_PATH, {
    flags: "a", // 'a' means appending (old data will be preserved)
  });
}

// Header of log file
status(".\n****** Results of checkGAMEJson-TT2.js ******");
status("\n\nRESULTS WRITTEN TO: " + LOG_PATH);
status("CHECKING FILE: " + JUST_FILE_NAME);
status("Full path to json file:\n" + JSON_FILE_TO_CHECK);
status("\nWill check:");
if (GET_STATS == true) {
  status("* Stats");
}
if (CHECK_DOUBLES == true) {
  status("* Doubles");
}
if (PRINT_BOARDS == true) {
  status("* Print boards");
}
if (DUPES == true) {
  status("* Duplicate boards");
}
if (ILLEGAL_MOVES == true) {
  status("* Illegal moves");
}

const THE_JSON = loadData();
const ALL_GAMES = THE_JSON[1].games;

status("\tJSON File date: " + THE_JSON[0].meta.DATE);
let today = new Date();
let date =
  today.getFullYear() + "-" + (today.getMonth() + 1) + "-" + today.getDate();
let time =
  today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
let dateTime = date + " " + time;
status("DATE check was run: " + dateTime);

status("Odds of Double: " + THE_JSON[0].meta.ODDS_OF_DOUBLE);

// ------------------- EXECUTE
let divider = "";

if (PRINT_BOARDS == true) {
  divider = "*** PRINT some boards *****";
  //status(divider)
  const STARTING_GAME = 0;
  const SIMPLE = false;
  const numberOfGamesToPrint = 10;
  const NUMBER_OF_DOUBLES_TO_PRINT = 4;
  printSomeGames(
    ALL_GAMES,
    numberOfGamesToPrint,
    STARTING_GAME,
    SIMPLE,
    NUMBER_OF_DOUBLES_TO_PRINT
  );
}
if (GET_STATS) {
  divider = "********* STATS *******";
  status(divider);
  getStats(ALL_GAMES);
}
if (CHECK_DOUBLES) {
  divider = "********* CHECK DOUBLES *******";
  status(divider);
  checkDoubles(THE_JSON);
}
if (DUPES) {
  divider = "***** DUPES *******";
  status(divider);
  checkForDupes(ALL_GAMES);
}
if (ILLEGAL_MOVES) {
  divider = "***** ILLEGAL MOVES ******";
  status(divider);
  checkForIllegalMoves(THE_JSON);
}

console.log("Checking " + JUST_FILE_NAME);
console.log("Results logged in: LOG_" + JUST_FILE_NAME);

// ------------------- FUNCTIONS

function loadData() {
  let fs = require("fs");

  let rawjsn = fs.readFileSync(JSON_FILE_TO_CHECK);
  let jsn = JSON.parse(rawjsn);
  status("Found " + jsn[1].games.length + " games.");

  let date_ob = new Date();

  // current date
  // adjust 0 before single digit date
  let date = ("0" + date_ob.getDate()).slice(-2);

  // current month
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

  // current year
  let year = date_ob.getFullYear();

  // current hours
  let hours = date_ob.getHours();

  // current minutes
  let minutes = date_ob.getMinutes();

  // current seconds
  let seconds = date_ob.getSeconds();

  // prints date & time in YYYY-MM-DD HH:MM:SS format
  status(
    "TIME this check was run: " +
      year +
      "-" +
      month +
      "-" +
      date +
      " " +
      hours +
      ":" +
      minutes +
      ":" +
      seconds +
      "\n\n"
  );

  return jsn;
}

// --------- STATS
function getStats(ALL_GAMES) {
  status("\n\n========== STATS ===========\n");
  let boxcounters = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let gameLengths = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ];
  let oFirstMoverCtr = 0;
  let xFirstMoverCtr = 0;
  let oMoves = 0;
  let xMoves = 0;
  let move;
  let doublesPlayed = 0;
  let whoPlayedDoubles = [0, 0];
  let moves;
  let gamesWithWinners = 0;
  let Owon = 0;
  let Xwon = 0;
  let firstMoverWon = 0;
  let glength;
  const games = ALL_GAMES;

  // ---- go through the GAMES
  for (let i = 0; i < ALL_GAMES.length; i++) {
    // go through a game
    let game = ALL_GAMES[i];
    // go through one game's moves
    moves = game.moves;
    // uopdate counter of gamelengths
    glength = moves.length;
    gameLengths[glength] = gameLengths[glength] + 1;
    if (game.winner > -1) {
      gamesWithWinners++;
      if (game.winner == 0) {
        Owon++;
      }
      if (game.winner == 1) {
        Xwon++;
      }
      if (game.winner == game.firstMover) {
        firstMoverWon++;
      }
    }
    // --- Go through all MOVES
    for (let j = 0; j < moves.length; j++) {
      move = moves[j];
      let player = move.player;
      // distribution of predictions
      boxcounters[move.boxToPlay]++;

      if (move.playedDoubleThisTurn == true) {
        doublesPlayed++;
        whoPlayedDoubles[player]++;
      }

      if (move.firstMover == 0) {
        oFirstMoverCtr++;
      } else {
        xFirstMoverCtr++;
      }

      // which player contributed moves?
      if (move.player == 0) {
        oMoves++;
      } else {
        xMoves++;
      }
    }
  }
  status("Number of games: " + ALL_GAMES.length);
  status("Number of games with a winner: " + gamesWithWinners);
  status("Owon " + Owon + " games. X won " + Xwon + ".");
  let fmwonpercent = (100 / gamesWithWinners) * firstMoverWon;
  status(
    "Firstmover won " + firstMoverWon + " games, or " + fmwonpercent + "%."
  );
  status("### PLAYER CONTRIBUTION OF MOVES");
  status("O contributed " + oMoves + " moves.");
  status("X contributed " + xMoves + " moves.");
  status("### MOVES FROM WINNING GAMES");

  status("In recorded moves:");
  status("### FIRST MOVER");
  status("In recorded moves:");
  status("0 moved first: " + oFirstMoverCtr);
  status("X moved first: " + xFirstMoverCtr);
  status("");

  status("Doubles played: " + doublesPlayed);
  status(
    "Doubles played by O and X: " +
      whoPlayedDoubles[0] +
      " " +
      whoPlayedDoubles[1]
  );
  status("### PREDICTION DISTRIBUTION");
  for (let x = 0; x < 9; x++) {
    status(x + ": " + boxcounters[x]);
  }
  status("#### GAME LENGTHS");
  for (x = 0; x < 27; x++) {
    status(x + ": " + gameLengths[x]);
  }
}

//--------- CHECK DOUBLEPLAYS
function checkDoubles(THE_JSON) {
  // How many doubles? Legit? Count as same move number?
  let doublePlayCtr = 0;
  let move;
  let meta = THE_JSON[0];
  let all_the_games = THE_JSON[1].games;
  let doubledDidntChangeAvailability = 0;
  let imbalancedDoublePlay = 0;

  for (let i = 0; i < all_the_games.length; i++) {
    let game = all_the_games[i];

    for (let j = 0; j < game.moves.length; j++) {
      move = game.moves[j];
      let player = move.player;
      if (move.playedDoubleThisTurn) {
        doublePlayCtr++;
        // check hasDouble array for prior and next turn
        //  -- prevent checking if move is first or last
        if (j > 1 && j < game.moves.length - 1) {
          let priorMove = game.moves[j - 1];
          // let nextMove = game.moves[j + 1];

          let priorWhoHasDubs = priorMove.whoHasDouble;
          // let nextWhoHasDubs = nextMove.whoHasDouble;
          let thisWhoHasDubs = move.whoHasDouble;

          if (priorWhoHasDubs.join("") == thisWhoHasDubs.join("")) {
            status(
              "Played double but didn't note change in availability. Game #" +
                i +
                " Move: " +
                move.sequentialMoveNumber
            );

            doubledDidntChangeAvailability++;
          }
        }
        let marks = countMarksInBoardStr(move.nextBoardStr27);
        let Os = marks[0];
        let Xs = marks[1];
        let diff = Math.abs(Os - Xs);
        let firstMover = move.firstMover;
        let other = player == 0 ? 1 : 0;
        let balanced = true;

        if (firstMover == player) {
          // legitDiff = 2;
          if (move.whoHasDouble[other] == 0) {
            if (diff !== 1) {
              balanced = false;
            }
          } else {
            if (diff !== 2) {
              balanced = false;
            }
          }
        }

        if (firstMover !== player) {
          // legitDiff = 1;
          if (move.whoHasDouble[other] == 0) {
            if (diff !== 0) {
              balanced = false;
            }
          } else {
            if (diff !== 1) {
              balanced = false;
            }
          }
        }

        if (balanced == false) {
          imbalancedDoublePlay++;
          status(
            "\nImbalance when playing double in Game #" + i + " move: " + j
          );
          status("> " + move.boardStr000027);
          status("> " + move.nextBoardStr27);
          status("> Player: " + move.player);
          status("> Os: " + Os + " Xs: " + Xs);
          status("> Firstmover: " + firstMover);
          status("> whoHasDouble:  " + move.whoHasDouble);
        } // balanced == false
      } // double played on this turn
    } // gone through all moves
  } // Gone through all games

  status("DoublePlays: " + doublePlayCtr);

  status(
    "Doubled but didn't change player's permission to play double: " +
      doubledDidntChangeAvailability
  );
  status(
    "Balancfe of marks wrong after playing double: " + imbalancedDoublePlay
  );
}

// --- Print game boards
function printSomeGames(
  jsn,
  numberOfGamesToPrint,
  STARTING_GAME,
  SIMPLE,
  NUMBER_OF_DOUBLES_TO_PRINT
) {
  let games = jsn;
  status("Preparing to print " + numberOfGamesToPrint + " games");
  status("Starting game: " + STARTING_GAME);
  let i, j, game, move;
  if (ONLY_PRINT_DOUBLES) {
    status("======= DOUBLES =========");
    for (i = 0; i <= NUMBER_OF_DOUBLES_TO_PRINT; i++) {
      game = games[i];
      for (j = 0; j < game.moves.length; j++) {
        move = game.moves[j];
        if (move.playedDoubleThisTurn === true) {
          status(
            "Sequential #" +
            move.sequentialMoveNumber +
            " Game #" +
            move.gameNumber +
            " Move:" + move.moveNumber + " Player: " + move.player
          );
          status(move.boardStr000027);
          status(game.moves[j + 1].boardStr000027);
        }
      }
    }
    return;
  }
  for (i = 0; i <= numberOfGamesToPrint; i++) {
    let game = jsn[i + STARTING_GAME];
    status("=========================");
    status("Game number: " + game.gameNumber + " Winner: " + game["winner"]);
    status("Number of moves: " + game["numberOfMoves"]);
    for (j = 0; j < game["numberOfMoves"]; j++) {
      // 			status(game['moves'][j]['boardStr']);
      if (SIMPLE == true) {
        let boardlines = convertStringToArray(game["moves"][j]["boardStr9"]);
        status(" ");
        status(boardlines[0].join());
        status(boardlines[1].join());
        status(boardlines[2].join());
      }
      if (SIMPLE == false) {
        status(game.moves[j].boardStr000027);
      }
    }
    status(game.moves[j - 1].boardStr9);

    status("GAME #" + i + "  ***************");
  }
}
//----------- ILLEGAL MOVES?
function checkForIllegalMoves(THE_JSON) {
  // Any labels that aren't just one move ahead?
  // Right number of Xs and 0s?
  // If same number, did X overwrite O or vice versa?

  status("\n\n========== CHECK FOR ILLEGAL MOVES ===========\n");

  let all_the_games = THE_JSON[1].games;
  let meta = THE_JSON[0];
  let moveOutOfScope = 0;
  let tooManyMovesCtr = 0;
  let maxMoves = 0;
  let moveOverwritesPlayer = 0;
  let moveOverwritesAnyMark = 0;
  let hasNoWinner = 0;
  let movePlaysOwnedBox = 0;
  let imbalanceCtr = 0;
  let moveByGameLoser = 0;
  let move, j;
  let threeOfAMark;
  let boxToPlay;
  let boxes = [];
  let xctr = 0;
  let octr = 0;
  let totalOctr = 0;
  let totalXctr = 0;
  let otherPlayer;
  let _ctr = 0;
  // -------------- go through all games
  for (let i = 0; i < all_the_games.length; i++) {
    let game = all_the_games[i];
    if (game.moves.length > maxMoves) {
      maxMoves = game.moves.length;
    }
    if (game.moves.length > 28) {
      status("Game # " + i + "has too many moves: " + game.moves.length);
      tooManyMovesCtr++;
    }

    // does it have a winner
    //status(game.length);
    if (game.winner < 0) {
      hasNoWinner++;
      status(">> Game #" + i + " has no winner: " + game.winner);
    }

    // go through moves for one game
    for (j = 0; j < game.moves.length; j++) {

      move = game.moves[j];
      boxToPlay = move.boxToPlay;
      let openingBoard = move.boardStr000027;
      let nextBoard = move.nextBoardStr27;
      let playingDouble = move.playedDoubleThisTurn;
      let whoHasDouble = move.whoHasDouble;

      let boxresults = constructBoxes(openingBoard);
      boxes = boxresults.boxes;
      threeOfAMark = boxresults.threeOfAMark;
      let player = move.player;

      // move by person who won the game?
      if (game.winner !== move.player) {
        moveByGameLoser++;
      }

      // is the move out of scope?
      if (boxToPlay > 8 || boxToPlay < 0) {
        moveOutOfScope++;
        status("Move #" + i + " is out of scope: " + boxToPlay);
      }

      // trying to play an owned box?
      if (boxes[boxToPlay].owner > -1) {
        movePlaysOwnedBox++;
      }

      // count total plays of x and o
      octr = move.boardStr000027.split("O").length - 1;
      xctr = move.boardStr000027.split("X").length - 1;
      totalOctr += octr;
      totalXctr += xctr;
      // difference of 2 is ok if the larger player has played a double
      // and the other player has not
      // Is there an imbalance
      if (octr - xctr > 1 || xctr - octr > 1) {
        otherPlayer = move.player === 0 ? 1 : 0;
      }
      if (
        (octr - xctr == 2 && move.whoHasDouble[0] > 0) ||
        (xctr - octr == 2 && move.whoHasDouble[1] > 0)
      ) {
        imbalanceCtr++;
        status(
          ">> Move#: " +
            (move.sequentialMoveNumber - 1) +
            " Imbalance:  \n" +
            "input: " +
            move.boardStr000027 +
            " O: " +
            octr +
            " X: " +
            xctr
        );
      }
      // more than two mark differential?
      if (octr - xctr > 2 || xctr - octr > 2) {
        imbalanceCtr++;
        status(
          ">>>> More than 2 more marks on field. " +
            "Move #" +
            move.sequentialMoveNumber -
            1
        );
      }
    } // looked at one move
  } // games

  // report
  status("\n\n SUMMARY of Checking for legality of moves...\n");
  status("Total games with no winner: " + hasNoWinner);
  status(
    "Total games with too many moves: " +
      tooManyMovesCtr +
      ". Most moves: " +
      maxMoves
  );
  status("Moves by game loser: " + moveByGameLoser);
  status("Moves that overwrite other moves: " + moveOverwritesPlayer);
  status("Moves play on already owned squares: " + movePlaysOwnedBox);
  status("Total Os: " + totalOctr + " Xs: " + totalXctr);
  status("Imbalanced moves: " + imbalanceCtr);
  status("Number of Os: " + octr + " Xes: " + xctr);
  status("Move < 0 or  >8: " + moveOutOfScope);
  status("Moves played into owned box: " + movePlaysOwnedBox);
  status("Squares with three of one mark: " + threeOfAMark);
  status("Number of imbalanced moves: " + imbalanceCtr);
}

function constructBoxes(b27) {
  // fills in 9 boxes' details
  let i, j, s;
  let box,
    boxes = [];
  let threeOfAMark = 0; // counts if XXX or OOO in the box
  for (i = 0; i < 9; i++) {
    // create a new box
    let box = new boxstruct();
    boxes.push(box);

    // go through 27 char string building boxowners
    // by looking at it 3 chars at a time
    for (j = 0; j < 9; j++) {
      s = b27.substring(j, j + 3);
      // does this string own this box
      // count marks
      let xes = 0,
        os = 0,
        dashes = 0;
      for (let x = 0; x < 3; x++) {
        let c = s[x];
        if (c == "O") {
          os++;
        }
        if (c == "X") {
          xes++;
        }
        if (c == "-") {
          dashes++;
        }
      }
      if (xes == 2) {
        boxes[i].owner = "X";
      }
      if (os == 2) {
        boxes[i].owner = "XO";
      }
      if (dashes == 2) {
        boxes[i].owner = "-";
      }
      if (xes > 2) {
        threeOfAMark++;
      }
      if (os > 2) {
        threeOfAMark++;
      }
    } // gone through 1 box
    boxes.push(box);
  } // gone through all 9 boxes

  return { boxes: boxes, threeOfAMark: threeOfAMark };
}

// ------ DUPES?

function checkForDupes(jsn) {
  // check for duplicate inputs

  let dupeCtr = 0;
  let totalUniqueInputs = 0;
  let uniqueBoardstrs = [];

  for (let i = 0; i < jsn.length; i++) {
    let move = jsn[i];
    let input = move.boardstr;
    // status(input)
    // did we find a dupe?
    if (uniqueBoardstrs.includes(input)) {
      dupeCtr++;
    } else {
      totalUniqueInputs++;
      uniqueBoardstrs.push(input);
    }
  }

  status(
    "Checked " +
      jsn.length +
      " moves and found " +
      totalUniqueInputs +
      " unique boardstrings."
  );
  status("Found " + dupeCtr + " duplicates");
}

function checkMoves(jsn) {
  // board: [ [0,0,0] [0,1,0], [0,0,1]... 9 times ]
  // 000 = unowned    001 = O owns  010 = X owns
  // no relationship to player onehot. so you first triplet is fine
  // so you will have 9 of those triplets
  // followed by 1 player onehot (which is a length 2 array)

  status("Checking some moves...");

  // how many game records to go through?
  let maxGamesToLoad = jsn.length;

  let loadedGames = 0;
  let allBoards = [];
  let firstMoverWon = 0;
  let noWinner = 0;

  status();
  status();
  status();
  status(
    ">>>>>>>>>>> NEW ROUND games " +
      STARTING_GAME +
      " - " +
      STARTING_GAME +
      gamesToCheck +
      "<<<<<<<<<<<<<<<<"
  );

  // --- Go through each GAME
  for (let i = 0; i < maxGamesToLoad; i++) {
    let game = jsn[i];
    let moves = game["moves"];

    let oh_game = [];

    let winner = moves[winner];
    let firstmover = moves[firstMover];
    if (firstmover == winner) {
      firstMoverWon++;
    }

    if (winner == 0) {
      noWinner++;
      //status(noWinner);
    }

    // -- Go through all the MOVES in a game
    for (let j = 0; j < moves.length; j++) {
      let thismove = moves[j];
      let movenumber = thismove.moveNumber;
      let owner = thismove.player;
      let boardstr = thismove.boardStr;
      //status(boardstr);
      allBoards.push(boardstr);
    }
  }
  status("Read " + maxGamesToLoad);
  status("Total boards: " + allBoards.length);

  // get array only of unique boards
  let unique = allBoards.filter(onlyUnique);
  status("Unique boards: " + unique.length);
  status("First mover won " + firstMoverWon + " games.");
  status("Number of games with no winner:" + noWinner);
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
  //https://stackoverflow.com/questions/1960473/get-all-unique-values-in-a-javascript-array-remove-duplicates
}

function convertStringToArray(s) {
  let ss = [];
  ss.push([s[0] + s[1] + s[2]]);
  ss.push([s[3] + s[4] + s[5]]);
  ss.push([s[6] + s[7] + s[8]]);

  return ss;
}

function countMarksInBoardStr(str) {
  let o = str.split("O").length - 1;
  let x = str.split("X").length - 1;
  return [o, x];
}
// --------- STATUS
function status(txt) {
  // $("#status").append(txt + "<br>");
  //var curtext = $("#status").text();
  if (SHOW_STATUS == true) {
    console.log(txt);
  }
  if (WRITE_LOG) {
    logger.write("\n" + txt); // append string to your file
  }
}
