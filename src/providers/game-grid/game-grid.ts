import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

/*
  Generated class for the GameGridProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class GameGridProvider {
  sudoku: any = {};
  ROWS: string = "ABCDEFGHI";
  COLS: string = "123456789";
  SQUARES: any = null;

  UNITS: any = null;
  SQUARE_UNITS_MAP: any = null;
  SQUARE_PEERS_MAP: any = null;

  MIN_GIVEN: number = 17;
  NR_SQUARES: number = 81;

  DIFFICULTY: any = {
    easy: 62,
    medium: 50,
    hard: 44,
    very_hard: 35,
    inhuman: 21
  };

  constructor(public http: HttpClient) {
    this.sudoku["digits"] = "123456789";
    this.sudoku.blankChar = "0";
    this.sudoku.blankBoard =
      "000000000000000000000000000000000000000000000000000000000000000000000000000000000";
  }

  generate(difficulty, unique) {
    if (typeof difficulty === "string" || typeof difficulty === "undefined") {
      difficulty = this.DIFFICULTY[difficulty] || this.DIFFICULTY.easy;
    }

    // Force difficulty between 17 and 81 inclusive
    difficulty = sudoku._force_range(difficulty, NR_SQUARES + 1, MIN_GIVENS);

    // Default unique to true
    unique = unique || true;

    // Get a set of squares and all possible candidates for each square
    var blank_board = "";
    for (var i = 0; i < this.NR_SQUARES; ++i) {
      blank_board += ".";
    }
    var candidates = sudoku._get_candidates_map(blank_board);

    // For each item in a shuffled list of squares
    var shuffled_squares = sudoku._shuffle(SQUARES);
    for (var si in shuffled_squares) {
      var square = shuffled_squares[si];

      // If an assignment of a random chioce causes a contradictoin, give
      // up and try again
      var rand_candidate_idx = sudoku._rand_range(candidates[square].length);
      var rand_candidate = candidates[square][rand_candidate_idx];
      if (!sudoku._assign(candidates, square, rand_candidate)) {
        break;
      }

      // Make a list of all single candidates
      var single_candidates = [];
      for (var si in SQUARES) {
        var square = SQUARES[si];

        if (candidates[square].length == 1) {
          single_candidates.push(candidates[square]);
        }
      }

      // If we have at least difficulty, and the unique candidate count is
      // at least 8, return the puzzle!
      if (
        single_candidates.length >= difficulty &&
        sudoku._strip_dups(single_candidates).length >= 8
      ) {
        var board = "";
        var givens_idxs = [];
        for (var i in SQUARES) {
          var square = SQUARES[i];
          if (candidates[square].length == 1) {
            board += candidates[square];
            givens_idxs.push(i);
          } else {
            board += sudoku.BLANK_CHAR;
          }
        }

        // If we have more than `difficulty` givens, remove some random
        // givens until we're down to exactly `difficulty`
        var nr_givens = givens_idxs.length;
        if (nr_givens > difficulty) {
          givens_idxs = sudoku._shuffle(givens_idxs);
          for (var i = 0; i < nr_givens - difficulty; ++i) {
            var target = parseInt(givens_idxs[i]);
            board =
              board.substr(0, target) +
              sudoku.BLANK_CHAR +
              board.substr(target + 1);
          }
        }

        // Double check board is solvable
        // TODO: Make a standalone board checker. Solve is expensive.
        if (sudoku.solve(board)) {
          return board;
        }
      }
    }

    // Give up and try a new puzzle
    return sudoku.generate(difficulty);
  }
}
