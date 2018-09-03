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

  generate(difficulty, unique = true) {
    if (typeof difficulty === "string" || typeof difficulty === "undefined") {
      difficulty = this.DIFFICULTY[difficulty] || this.DIFFICULTY.easy;
    }

    // Force difficulty between 17 and 81 inclusive
    difficulty = this._force_range(difficulty, this.NR_SQUARES + 1, this.MIN_GIVENS);

    // Default unique to true
    unique = unique || true;

    // Get a set of squares and all possible candidates for each square
    var blank_board = "";
    for (var i = 0; i < this.NR_SQUARES; ++i) {
      blank_board += ".";
    }
    var candidates = this._get_candidates_map(blank_board);

    // For each item in a shuffled list of squares
    var shuffled_squares = this._shuffle(SQUARES);
    for (var si in shuffled_squares) {
      var square = shuffled_squares[si];

      // If an assignment of a random chioce causes a contradictoin, give
      // up and try again
      var rand_candidate_idx = this._rand_range(candidates[square].length);
      var rand_candidate = candidates[square][rand_candidate_idx];
      if (!this._assign(candidates, square, rand_candidate)) {
        break;
      }

      // Make a list of all single candidates
      var single_candidates = [];
      for (var si in this.SQUARES) {
        var square = this.SQUARES[si];

        if (candidates[square].length == 1) {
          single_candidates.push(candidates[square]);
        }
      }

      // If we have at least difficulty, and the unique candidate count is
      // at least 8, return the puzzle!
      if (
        single_candidates.length >= difficulty &&
        this._strip_dups(single_candidates).length >= 8
      ) {
        var board = "";
        var givens_idxs = [];
        for (var i in this.SQUARES) {
          var square = this.SQUARES[i];
          if (candidates[square].length == 1) {
            board += candidates[square];
            givens_idxs.push(i);
          } else {
            board += this.sudoku.BLANK_CHAR;
          }
        }

        // If we have more than `difficulty` givens, remove some random
        // givens until we're down to exactly `difficulty`
        var nr_givens = givens_idxs.length;
        if (nr_givens > difficulty) {
          givens_idxs = this._shuffle(givens_idxs);
          for (var i = 0; i < nr_givens - difficulty; ++i) {
            var target = parseInt(givens_idxs[i]);
            board =
              board.substr(0, target) +
              this.sudoku.BLANK_CHAR +
              board.substr(target + 1);
          }
        }

        // Double check board is solvable
        // TODO: Make a standalone board checker. Solve is expensive.
        if (this.solve(board)) {
          return board;
        }
      }
    }

    // Give up and try a new puzzle
    return this.generate(difficulty);
  }

  solve(board, reverse) {
    var report = this.validate_board(board);
    if (report !== true) {
      throw report;
    }

    // Check number of givens is at least MIN_GIVENS
    var nr_givens = 0;
    for (var i in board) {
      if (board[i] !== this.sudoku.BLANK_CHAR && this.sudoku._in(board[i], sudoku.DIGITS)) {
        ++nr_givens;
      }
    }
    if (nr_givens < this.MIN_GIVEN) {
      throw "Too few givens. Minimum givens is " + this.MIN_GIVEN;
    }

    // Default reverse to false
    reverse = reverse || false;

    var candidates = this._get_candidates_map(board);
    var result = this._search(candidates, reverse);

    if (result) {
      var solution = "";
      for (var square in result) {
        solution += result[square];
      }
      return solution;
    }
    return false;
  }

  get_candidates(board) {
    var report = this.validate_board(board);
    if (report !== true) {
      throw report;
    }

    // Get a candidates map
    var candidates_map = this._get_candidates_map(board);

    // If there's an error, return false
    if (!candidates_map) {
      return false;
    }

    // Transform candidates map into grid
    var rows = [];
    var cur_row = [];
    var i = 0;
    for (var square in candidates_map) {
      var candidates = candidates_map[square];
      cur_row.push(candidates);
      if (i % 9 == 8) {
        rows.push(cur_row);
        cur_row = [];
      }
      ++i;
    }
    return rows;
  }

  _get_canddidates_map(board) {
    var report = this.validate_board(board);
    if (report !== true) {
      throw report;
    }

    var candidate_map = {};
    var squares_values_map = this._get_square_vals_map(board);

    // Start by assigning every digit as a candidate to every square
    for (var si in this.SQUARES) {
      candidate_map[this.SQUARES[si]] = this.sudoku.DIGITS;
    }

    // For each non-blank square, assign its value in the candidate map and
    // propigate.
    for (var square in squares_values_map) {
      var val = squares_values_map[square];

      if (this._in(val, this.sudoku.DIGITS)) {
        var new_candidates = this._assign(candidate_map, square, val);

        // Fail if we can't assign val to square
        if (!new_candidates) {
          return false;
        }
      }
    }

    return candidate_map;
  }

  _search(candidates, reverse = false) {
    // Return if error in previous iteration
    if (!candidates) {
      return false;
    }

    // Default reverse to false
    reverse = reverse || false;

    // If only one candidate for every square, we've a solved puzzle!
    // Return the candidates map.
    var max_nr_candidates = 0;
    var max_candidates_square = null;
    for (var si in this.SQUARES) {
      var square = this.SQUARES[si];

      var nr_candidates = candidates[square].length;

      if (nr_candidates > max_nr_candidates) {
        max_nr_candidates = nr_candidates;
        max_candidates_square = square;
      }
    }
    if (max_nr_candidates === 1) {
      return candidates;
    }

    // Choose the blank square with the fewest possibilities > 1
    var min_nr_candidates = 10;
    var min_candidates_square = null;
    for (si in this.SQUARES) {
      var square = this.SQUARES[si];

      var nr_candidates = candidates[square].length;

      if (nr_candidates < min_nr_candidates && nr_candidates > 1) {
        min_nr_candidates = nr_candidates;
        min_candidates_square = square;
      }
    }

    // Recursively search through each of the candidates of the square 
    // starting with the one with fewest candidates.

    // Rotate through the candidates forwards
    var min_candidates = candidates[min_candidates_square];
    if (!reverse) {
      for (var vi in min_candidates) {
        var val = min_candidates[vi];

        // TODO: Implement a non-rediculous deep copy function
        var candidates_copy = JSON.parse(JSON.stringify(candidates));
        var candidates_next = this._search(
          this._assign(candidates_copy, min_candidates_square, val)
        );

        if (candidates_next) {
          return candidates_next;
        }
      }

      // Rotate through the candidates backwards
    } else {
      for (var vi: number = min_candidates.length - 1; vi != 0; --vi) {
        var val = min_candidates[vi];

        // TODO: Implement a non-rediculous deep copy function
        var candidates_copy = JSON.parse(JSON.stringify(candidates));
        var candidates_next = this._search(
          this._assign(candidates_copy, min_candidates_square, val),
          reverse
        );

        if (candidates_next) {
          return candidates_next;
        }
      }
    }

    // If we get through all combinations of the square with the fewest
    // candidates without finding an answer, there isn't one. Return false.
    return false;
  }

  _assign = function (candidates, square, val) {
    /* Eliminate all values, *except* for `val`, from `candidates` at 
    `square` (candidates[square]), and propagate. Return the candidates map
    when finished. If a contradiciton is found, return false.
    
    WARNING: This will modify the contents of `candidates` directly.
    */

    // Grab a list of canidates without 'val'
    var other_vals = candidates[square].replace(val, "");

    // Loop through all other values and eliminate them from the candidates 
    // at the current square, and propigate. If at any point we get a 
    // contradiction, return false.
    for (var ovi in other_vals) {
      var other_val = other_vals[ovi];

      var candidates_next =
        this._eliminate(candidates, square, other_val);

      if (!candidates_next) {
        //console.log("Contradiction found by _eliminate.");
        return false;
      }
    }

    return candidates;
  }

  _eliminate = function (candidates, square, val) {
    /* Eliminate `val` from `candidates` at `square`, (candidates[square]),
    and propagate when values or places <= 2. Return updated candidates,
    unless a contradiction is detected, in which case, return false.
    
    WARNING: This will modify the contents of `candidates` directly.
    */

    // If `val` has already been eliminated from candidates[square], return
    // with candidates.
    if (!this._in(val, candidates[square])) {
      return candidates;
    }

    // Remove `val` from candidates[square]
    candidates[square] = candidates[square].replace(val, '');

    // If the square has only candidate left, eliminate that value from its 
    // peers
    var nr_candidates = candidates[square].length;
    if (nr_candidates === 1) {
      var target_val = candidates[square];

      for (var pi in this.SQUARE_PEERS_MAP[square]) {
        var peer = this.SQUARE_PEERS_MAP[square][pi];

        var candidates_new =
          this._eliminate(candidates, peer, target_val);

        if (!candidates_new) {
          return false;
        }
      }

      // Otherwise, if the square has no candidates, we have a contradiction.
      // Return false.
    } if (nr_candidates === 0) {
      return false;
    }

    // If a unit is reduced to only one place for a value, then assign it
    for (var ui in this.SQUARE_UNITS_MAP[square]) {
      var unit = this.SQUARE_UNITS_MAP[square][ui];

      var val_places = [];
      for (var si in unit) {
        var unit_square = unit[si];
        if (this._in(val, candidates[unit_square])) {
          val_places.push(unit_square);
        }
      }

      // If there's no place for this value, we have a contradition!
      // return false
      if (val_places.length === 0) {
        return false;

        // Otherwise the value can only be in one place. Assign it there.
      } else if (val_places.length === 1) {
        var candidates_new =
          this._assign(candidates, val_places[0], val);

        if (!candidates_new) {
          return false;
        }
      }
    }

    return candidates;
  }

}
