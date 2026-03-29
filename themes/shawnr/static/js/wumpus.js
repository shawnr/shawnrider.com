/*
+---------------------------------------------------------------------------
|
|   wumpus.js
|
|   by Benjam Welker
|   http://iohelix.net
|
+---------------------------------------------------------------------------
|
|	JavaScript port of the classic BASIC game "Hunt the Wumpus"
|		- Including (most) maps from Wumpus 2
|	(BASIC source for both games at end of file)
|
|	http://en.wikipedia.org/wiki/Hunt_the_Wumpus
|
|	This is not a direct translation of the game
|	I have tried to keep the gameplay the same,
|	but the back-end is very different
|
|	Date Started: 2009-06-07
|	Last Updated: 2009-09-27 (v0.9.0)
|
+---------------------------------------------------------------------------
|
|	Change Log
| -----------------------------------------
|	v0.9.0 - Added (most) maps from Wumpus 2
		as well as the Wumpus 2 source code
|	v0.8.1 - Fixed issue when resetting game
|	v0.8.0 - Initial Creation and Release
|
*/


/** The Wumpus Game object
 *		Controller for Hunt the Wumpus game
 */
function Wumpus( ) {

	/**
	 *		PROPERTIES
	 * * * * * * * * * * * * * * * * * * * * * * * * * * */

	/** property caves
	 *		Holds the room map selection array
	 *
	 * @var array of map arrays
	 */
	this.caves = [
		// 0 = Dodecahedron
		[[0,0,0], // this fixes the 0-index issue
			[2,5,8],    [1,3,10],   [2,4,12],   [3,5,14],   [1,4,6],
			[5,7,15],   [6,8,17],   [1,7,9],    [8,10,18],  [2,9,11],
			[10,12,19], [3,11,13],  [12,14,20], [4,13,15],  [6,14,16],
			[15,17,20], [7,16,18],  [9,17,19],  [11,18,20], [13,16,19]
		],

		// 1 = Mobius Strip
		[[0,0,0], // this fixes the 0-index issue
			[2,3,20],   [1,4,19],   [1,4,5],    [2,3,6],    [3,6,7],
			[4,5,8],    [5,8,9],    [6,7,10],   [7,10,11],  [8,9,12],
			[9,12,13],  [10,11,14], [11,14,15], [12,13,16], [13,16,17],
			[14,15,18], [15,18,19], [16,17,20], [2,17,20],  [1,18,19]
		],

		// 2 = String of Beads
		[[0,0,0], // this fixes the 0-index issue
			[2,3,20],   [1,3,4],    [1,2,4],    [2,3,5],    [4,6,7],
			[5,7,8],    [5,6,8],    [6,7,9],    [8,10,11],  [9,11,12],
			[9,10,12],  [10,11,13], [12,14,15], [13,15,16], [13,14,16],
			[14,15,17], [16,18,19], [17,19,20], [17,18,20], [1,18,19]
		],

		// 3 = Toroidal Hexagon Network
		[[0,0,0], // this fixes the 0-index issue
			[6,10,17], [6,7,18],  [7,8,19],  [8,9,20],   [9,10,16],
			[1,2,15],  [2,3,11],  [3,4,12],  [4,5,13],   [1,5,14],
			[7,16,20], [8,16,17], [9,17,18], [10,18,19], [6,19,20],
			[5,11,12], [1,12,13], [2,13,14], [3,14,15],  [4,11,15]
		],

		// 4 = Dendrite w/ Degeneracies
		[[0,0,0], // this fixes the 0-index issue
			[1,1,5],    [2,2,5],    [3,3,6],    [4,4,6],    [1,2,7],
			[3,4,7],    [5,6,10],   [8,9,9],    [8,8,10],   [7,9,11],
			[10,13,14], [11,13,13], [12,12,13], [11,15,16], [14,17,18],
			[14,19,20], [15,17,17], [15,18,18], [16,19,19], [16,20,20]
		],

		// 5 = One-way Lattice
		[[0,0,0], // this fixes the 0-index issue
			[4,8,5],    [1,5,6],    [2,6,7],    [3,7,8],    [8,9,12],
			[5,9,10],   [6,10,11],  [7,11,12],  [12,13,16], [9,13,14],
			[10,14,15], [11,15,16], [16,17,20], [13,17,18], [14,18,19],
			[15,19,20], [1,4,20],   [1,2,17],   [2,3,18],   [3,4,19]
		]
	];

	/** property cave
	 *		Holds the key for the selected cave
	 *
	 * @var int cave index
	 */
	this.cave = 0;


	/** property hunter
	 *		Holds the hunter's location
	 *
	 * @var int room id
	 */
	this.hunter = 0;


	/** property wumpus
	 *		Holds the wumpus location
	 *
	 * @var int room id
	 */
	this.wumpus = 0;


	/** property pits
	 *		Holds the pit locations
	 *
	 * @var array of int room ids
	 */
	this.pits = [0, 0];


	/** property bats
	 *		Holds the bat locations
	 *
	 * @var array of int room ids
	 */
	this.bats = [0, 0];


	/** property start
	 *		An array of all the above locations
	 *
	 * @var array of room ids
	 */
	this.start = [];


	/** property arrows
	 *		The player's arrow count
	 *
	 * @var int arrows remaining
	 */
	this.arrows = 5;


	/** property instruct
	 *		Holds the instruct flag
	 *			-1 = no value
	 *			 0 = no instructions
	 *			>0 = instruction step
	 *
	 * @var int instruct step
	 */
	this.instruct = -1;


	/** property choosing
	 *		Lets the game know if the player is choosing a map
	 *
	 * @var bool choosing
	 */
	this.choosing = false;


	/** property resetting
	 *		Lets the game know if the player is resetting
	 *
	 * @var bool resetting
	 */
	this.resetting = false;


	/** property moving
	 *		Lets the game know if the hunter is moving
	 *
	 * @var bool moving
	 */
	this.moving = false;


	/** property shooting
	 *		Lets the game know if the hunter is shooting
	 *
	 * @var bool shooting
	 */
	this.shooting = false;


	/** property num_rooms
	 *		How many rooms is the hunter shooting
	 *
	 * @var int num rooms shooting (false if none)
	 */
	this.num_rooms = false;


	/** property rooms_shot
	 *		Which rooms is the hunter shooting
	 *
	 * @var array of int rooms id
	 */
	this.rooms_shot = [];



	/**
	 *		METHODS
	 * * * * * * * * * * * * * * * * * * * * * * * * * * */

	/** function setup_cave
	 *		Sets the various locations
	 *		uses the start values if any
	 *
	 * @param bool reset the game (discard start values)
	 * @action initializes cave
	 * @return void
	 */
	this.setup_cave = function(reset) {
		var i;

		// reset game variables
		this.instruct = -1;
		this.choosing = false;
		this.moving = false;
		this.shooting = false;
		this.resetting = false;

		if (undefined === reset) {
			reset = true;
		}

		if (reset || (4 != this.start.length)) {
			this.start = [];

			// place the player
			this.hunter = rand(1, 20);

			// place the wumpus
			do {
				this.wumpus = rand(1, 20);
			}
			while (this.hunter == this.wumpus);

			// place the pits
			for (i = 0; i < 2; ++i) {
				do {
					this.pits[i] = rand(1, 20);
				}
				while ((this.hunter == this.pits[i])
					|| (this.wumpus == this.pits[i])
					|| (this.pits[i - 1] == this.pits[i]));
			}

			// place the bats
			for (i = 0; i < 2; ++i) {
				do {
					this.bats[i] = rand(1, 20);
				}
				while ((this.hunter == this.bats[i])
					|| (this.wumpus == this.bats[i])
					|| (this.pits[0] == this.bats[i])
					|| (this.pits[1] == this.bats[i])
					|| (this.bats[i - 1] == this.bats[i]));
			}

			this.start = clone([this.hunter, this.wumpus, this.pits, this.bats]);
		}
		else { // use the saved startup
			// disable the instructions
			this.instruct = 0;

			// grab the player
			this.hunter = clone(this.start[0]);

			// grab the wumpus
			this.wumpus = clone(this.start[1]);

			// grab the pits
			this.pits = clone(this.start[2]);

			// grab the bats
			this.bats = clone(this.start[3]);
		}
	}


	/** function input
	 *		Parses the user imput
	 *
	 * @param string input
	 * @action parses input and performs appropriate action
	 * @return null
	 */
	 this.input = function(input) {
		this._log( );

		input = input.toLowerCase( ).trim( );
		// Coerce numeric strings to integers for room number comparisons
		if (/^\d+$/.test(input)) input = parseInt(input, 10);
		if ('' !== input) {
			// deal with instructions
			if (0 > this.instruct) {
				if ('n' == input) {
					this.instruct = 0;
					this.choose_map( );
					return;
				}
				else {
					this.instruct = 1;
					this.instructions( );
					return;
				}
			} // end run instructions

			// deal with choosing map
			if (this.choosing) {
				if (input != parseInt(input)) {
					input = 0;
				}
				input = parseInt(input);

				if ((0 > input) || (5 < input)) {
					this.print('ERROR');
					this.choose_map( );
					return;
				}

				this.cave = input;
				this.choosing = false;
				this.show_position( );
				return;
			} // end run map choosing

			// deal with resets
			if (this.resetting) {
				this.resetting = false;

				if ('y' == input) {
					this.setup_cave(false);
					this.show_position( );
				}
				else {
					this.startup( );
				}

				return;
			} // end resetting

			// deal with movements
			if (this.moving) {
				if (input !== parseInt(input) || 1 > input || 20 < input || ! this._adj(this.hunter, input)) {
					this.print('NOT POSSIBLE -');
					input = 'm'; // just redo it
				}
				else { // valid room
					// move into the room
					this.hunter = input;

					// test for deadly things
					if (this.test_dead( )) {
						return;
					}

					// test for bats
					if ((this.hunter == this.bats[0]) || (this.hunter == this.bats[1])) {
						this.print('ZAP--SUPER BAT SNATCH! ELSEWHEREVILLE FOR YOU!');
						this.hunter = rand(1, 20);

						// test again for deadly things
						if (this.test_dead( )) {
							return;
						}
					}

					this.moving = false;
					this.show_position( );
					return;
				} // end do move
			} // end moving

			// deal with shooting
			if (this.shooting) {
				if ( ! this.num_rooms) {
					if ((1 <= input) && (5 >= input)) {
						this.num_rooms = input;
						input = 0;
					}
					else {
						this.print("NO. OF ROOMS (1-5)\n");
						return;
					}
				} // end if no room count

				if (this.num_rooms && (this.rooms_shot.length < this.num_rooms)) {
					if ((1 <= input) && (20 >= input)) {
						var in_array = false;

						// make sure the arrow isn't backtracking
						for (var key in this.rooms_shot) {
							if (this.rooms_shot[key] == input) {
								this.print("ARROWS AREN'T THAT CROOKED - TRY ANOTHER ROOM\n");
								in_array = true;
							}
						}

						if ( ! in_array) {
							this.rooms_shot.push(input);
						}
					} // end if valid room num

					// if the shot quota hasn't been filled yet...
					if (this.rooms_shot.length < this.num_rooms) {
						this.print("ROOM #");
						return;
					}
					else { // done collecting rooms, do the shots
						var off_course = false;
						var prev = this.hunter;
						var cur = prev;
						for (var i = 0; i <= this.rooms_shot.length; ++i) {
							if ( ! off_course) {
								// check the next room and see if it's connected to this one
								if ( ! this._adj(prev, this.rooms_shot[i])) {
									off_course = true;
								}
							}

							// separate if statement because off_course may have changed above
							if (off_course) {
								cur = this.caves[this.cave][prev][rand(0, 2)];
							}
							else {
								cur = this.rooms_shot[i];
							}

							// test if we killed ourselves
							if (this.hunter == cur) {
								this.print('OUCH! ARROW GOT YOU!');
								this.dead( );
								return;
							}

							// test if we got the wumpus
							if (this.wumpus == cur) {
								this.print('AHA! YOU GOT THE WUMPUS!');
								this.win( );
								return;
							}

							prev = cur;
						}

						this.print('MISSED');
						this.move_wumpus( );

						if (this.hunter == this.wumpus) {
							this.print('TSK TSK TSK - WUMPUS GOT YOU!');
							this.dead( );
							return;
						}

						// remove an arrow
						if (1 == this.arrows) {
							this.dead( );
							return;
						}
						else {
							--this.arrows;
						}

						this.shooting = false;
						this.show_position( );
						return;
					} // end doing the shots
				} // end if collecting rooms
			} // end shooting

			switch (input) {
				case 'q' : // quit
					this.print('CHICKEN');
					window.location.reload( );
					break;

				case 'm' : // move
					this.moving = true;
					this.print('WHERE TO');
					break;

				case 's' : // shoot
					this.shooting = true;
					this.print('NO. OF ROOMS (1-5)');
					break;

				default : // anything else
					this.show_prompt( );
					break;
			} // end input switch
		}
		else { // '' == input
			if (0 < this.instruct) {
				this.instructions( );
			}
			else {
				this.moving = false;
				this.shooting = false;
				this.show_position( );
			}
		}

		return;
	} // end input


	/** function show_position
	 *		Displays the hunter's current position
	 *		along with any hazard warnings
	 *
	 * @param void
	 * @action prints current status and position
	 * @return void
	 */
	this.show_position = function( ) {
		// grab the hunter's location
		var output = "\n"+this.get_hazards( );
		output += 'YOU ARE IN ROOM '+this.hunter+"\n";
		output += 'TUNNELS LEAD TO'+this._connections( );

		this.print(output);
		this.show_prompt( )
	}


	/** function show_prompt
	 *		Displays the action prompt
	 *
	 * @param void
	 * @action prints prompt
	 * @return void
	 */
	this.show_prompt = function( ) {
		this.print('SHOOT OR MOVE (S-M)');
	}


	/** function get_hazards
	 *		Grabs the current hazards from the cave
	 *		and returns a textual representation
	 *
	 * @param void
	 * @return string hazard text
	 */
	this.get_hazards = function( ) {
		var output = '';

		if (this.near_wumpus( )) {
			output += "I SMELL A WUMPUS\n";
		}

		if (this.near_pit( )) {
			output += "I FEEL A DRAFT\n";
		}

		if (this.near_bat( )) {
			output += "BATS NEARBY\n";
		}

		return output;
	}


	/** function print
	 *		Prints the given string to "stdout"
	 *		via Terminal object
	 *
	 * @param string output
	 * @action prints string
	 * @return void
	 */
	this.print = function(line) {
		if (window.wumpusPrint) window.wumpusPrint(line);
	}


	/** function startup
	 *		Initializes the game
	 *
	 * @param void
	 * @action initializes the game
	 * @return void
	 */
	this.startup = function( ) {
		this.setup_cave( );
		this.print('INSTRUCTIONS (Y-N)');
	}


	/** function test_dead
	 *		Test if anything deadly got the hunter
	 *
	 * @param void
	 * @action runs dead stuff if needed
	 * @return bool hunter is dead
	 */
	this.test_dead = function( ) {
		// test for the wumpus
		if (this.hunter == this.wumpus) {
			this.print('... OOPS! BUMPED A WUMPUS!');
			if ( ! this.move_wumpus( )) {
				this.print('TSK TSK TSK - WUMPUS GOT YOU!');
				this.dead( );
				return true;
			}
		}

		// test for pits
		if ((this.hunter == this.pits[0]) || (this.hunter == this.pits[1])) {
			this.print('YYYYIIIIEEEE . . . FELL IN PIT');
			this.dead( );
			return true;
		}

		return false;
	}


	/** function move_wumpus
	 *		Moves the wumpus
	 *
	 * @param void
	 * @return bool wumpus moved
	 */
	this.move_wumpus = function( ) {
		// there's a 1:4 chance the wumpus will move
		if (1 != rand(1, 4)) {
			this.wumpus = this.caves[this.cave][this.wumpus][rand(0, 2)];
			return true;
		}

		return false;
	}


	/** function near_wumpus
	 *		Tests if the hunter is near the wumpus
	 *
	 * @param void
	 * @return bool near the wumpus
	 */
	this.near_wumpus = function( ) {
		var near = false;

		// test the hunter's neighbor locations for hazards
		for (var key in this.caves[this.cave][this.hunter]) {
			near = (near || (this.wumpus == this.caves[this.cave][this.hunter][key]));
		}

		return near;
	}


	/** function near_pit
	 *		Tests if the hunter is near a pit
	 *
	 * @param void
	 * @return bool near a pit
	 */
	this.near_pit = function( ) {
		var near = false;

		// test the hunter's neighbor locations for hazards
		for (var key in this.caves[this.cave][this.hunter]) {
			for (var pit = 0; pit <= 1; ++pit) {
				near = (near || (this.pits[pit] == this.caves[this.cave][this.hunter][key]));
			}
		}

		return near;
	}


	/** function near_bat
	 *		Tests if the hunter is near a bat
	 *
	 * @param void
	 * @return bool near a bat
	 */
	this.near_bat = function( ) {
		var near = false;

		// test the hunter's neighbor locations for hazards
		for (var key in this.caves[this.cave][this.hunter]) {
			for (var bat = 0; bat <= 1; ++bat) {
				near = (near || (this.bats[bat] == this.caves[this.cave][this.hunter][key]));
			}
		}

		return near;
	}


	/** function instructions
	 *		Displays instructions based on the instruct flag
	 *
	 * @param void
	 * @action prints instructions
	 * @return void
	 */
	this.instructions = function( ) {
		switch (this.instruct) {
			case 1 :
				this.print("WELCOME TO 'HUNT THE WUMPUS'\n"
						+ "  THE WUMPUS LIVES IN A CAVE OF 20 ROOMS. EACH ROOM\n"
						+ "HAS 3 TUNNELS LEADING TO OTHER ROOMS. (LOOK AT A\n"
						+ "DODECAHEDRON TO SEE HOW THIS WORKS-IF YOU DON'T KNOW\n"
						+ "WHAT A DODECAHEDRON IS, ASK SOMEONE)\n\n"

						+ "     HAZARDS:\n"
						+ " BOTTOMLESS PITS - TWO ROOMS HAVE BOTTOMLESS PITS IN THEM\n"
						+ "     IF YOU GO THERE, YOU FALL INTO THE PIT (& LOSE!)\n"
						+ " SUPER BATS - TWO OTHER ROOMS HAVE SUPER BATS. IF YOU\n"
						+ "     GO THERE, A BAT GRABS YOU AND TAKES YOU TO SOME OTHER\n"
						+ "     ROOM AT RANDOM. (WHICH MAY BE TROUBLESOME)\n");
				this.print('HIT RETURN TO CONTINUE');
				this.instruct = 2;
				break;

			case 2 :
				this.print("     WUMPUS:\n"
						+ " THE WUMPUS IS NOT BOTHERED BY HAZARDS (HE HAS SUCKER\n"
						+ " FEET AND IS TOO BIG FOR A BAT TO LIFT).  USUALLY\n"
						+ " HE IS ASLEEP.  TWO THINGS WAKE HIM UP: YOU SHOOTING AN\n"
						+ "ARROW OR YOU ENTERING HIS ROOM.\n"
						+ "     IF THE WUMPUS WAKES HE MOVES (P=.75) ONE ROOM\n"
						+ " OR STAYS STILL (P=.25).  AFTER THAT, IF HE IS WHERE YOU\n"
						+ " ARE, HE EATS YOU UP AND YOU LOSE!\n\n"

						+ "     YOU:\n"
						+ " EACH TURN YOU MAY MOVE OR SHOOT A CROOKED ARROW\n"
						+ "   MOVING:  YOU CAN MOVE ONE ROOM (THRU ONE TUNNEL)\n"
						+ "   ARROWS:  YOU HAVE 5 ARROWS.  YOU LOSE WHEN YOU RUN OUT\n"
						+ "   EACH ARROW CAN GO FROM 1 TO 5 ROOMS. YOU AIM BY TELLING\n"
						+ "   THE COMPUTER THE ROOM'S YOU WANT THE ARROW TO GO TO.\n"
						+ "   IF THE ARROW CAN'T GO THAT WAY (IF NO TUNNEL) IT MOVES\n"
						+ "   AT RANDOM TO THE NEXT ROOM.\n"
						+ "     IF THE ARROW HITS THE WUMPUS, YOU WIN.\n"
						+ "     IF THE ARROW HITS YOU, YOU LOSE.\n");
				this.print('HIT RETURN TO CONTINUE');
				this.instruct = 3;
				break;

			case 3 :
				this.print("    WARNINGS:\n"
						+ "     WHEN YOU ARE ONE ROOM AWAY FROM A WUMPUS OR HAZARD,\n"
						+ "     THE COMPUTER SAYS:\n"
						+ " WUMPUS:  'I SMELL A WUMPUS'\n"
						+ " BAT   :  'BATS NEARBY'\n"
						+ " PIT   :  'I FEEL A DRAFT'\n\n");
				this.print('HIT RETURN TO CONTINUE');
				this.instruct = 4;
				break;

			case 4 :
				this.print("WELCOME TO WUMPUS II\n"
						+ "THIS VERSION HAS THE SAME RULES AS 'HUNT THE WUMPUS'.\n"
						+ "HOWEVER, YOU NOW HAVE A CHOICE OF CAVES TO PLAY IN.\n"
						+ "SOME CAVE ARE EASIER THAN OTHERS. ALL CAVES HAVE 20\n"
						+ "ROOMS AND 3 TUNNELS LEADING FROM ONE ROOM TO OTHER ROOMS.\n"
						+ "  0  -  DODECAHEDRON   THE ROOMS OF THIS CAVE ARE ON A\n"
						+ "        12-SIDED OBJECT, EACH FORMS A PENTAGON.\n"
						+ "        THE ROOMS ARE AT THE CORNERS OF THE PENTAGONS.\n"
						+ "        EACH ROOM HAVING TUNNELS THAT LEAD TO 3 OTHER ROOMS.\n\n"
						+ "  1  -  MOBIUS STRIP   THIS CAVE IS TWO ROOMS\n"
						+ "        WIDE AND 10 ROOMS AROUND (LIKE A BELT)\n"
						+ "        YOU WILL NOTICE THERE IS A HALF TWIST\n"
						+ "        SOMEWHERE.\n\n"
						+ "  2  -  STRING OF BEADS   FIVE BEADS IN A CIRCLE.\n"
						+ "        EACH BEAD IS A DIAMOND WITH A VERTICAL\n"
						+ "        CROSS-BAR. THE RIGHT & LEFT CORNERS LEAD\n"
						+ "        TO NEIGHBORING BEADS. (THIS ONE IS DIFFICULT\n"
						+ "        TO PLAY)\n\n"
						+ "  3  -  HEX NETWORK   IMAGINE A HEX TILE FLOOR. TAKE\n"
						+ "        A RECTANGLE WITH 20 POINTS (INTERSECTIONS)\n"
						+ "        INSIDE (4X4). JOIN RIGHT & LEFT SIDES TO MAKE A\n"
						+ "        CYLINDER. THEN JOIN TOP & BOTTOM TO FORM A\n"
						+ "        TORUS (DOUGHNUT).\n"
						+ "        HAVE FUN IMAGINING THIS ONE!!\n\n");
				this.print('HIT RETURN TO CONTINUE');
				this.instruct = 5;
				break;

			case 5 :
				this.print("  CAVES 1-3 ARE REGULAR IN A SENSE THAT EACH ROOM\n"
						+ "GOES TO THREE OTHER ROOMS & TUNNELS ALLOW TWO-\n"
						+ "WAY TRAFFIC. HERE ARE SOME 'IRREGULAR' CAVES:\n\n"
						+ "  4  -  DENDRITE WITH DEGENRACIES   PULL A PLANT FROM\n"
						+ "        THE GROUND. THE ROOTS & BRANCHES FORM A\n"
						+ "        DENDRITE - IE., THERE ARE NO LOOPING PATHS\n"
						+ "        DEGENERACY MEANS A) SOME ROOMS CONNECT TO\n"
						+ "        THEMSELVES AND B) SOME ROOMS HAVE MORE THAN ONE\n"
						+ "        TUNNEL TO THE SAME OTHER ROOM IE., 12 HAS\n"
						+ "        TWO TUNNELS TO 13.\n\n"
						+ "  5  -  ONE WAY LATTICE   HERE ALL TUNNELS GO ONE\n"
						+ "        WAY ONLY. TO RETURN, YOU MUST GO AROUND THE CAVE\n"
						+ "        (ABOUT 5 MOVES).\n\n"
//						+ "  6  -  ENTER YOUR OWN CAVE   THE COMPUTER WILL ASK YOU\n"
//						+ "        THE ROOMS NEXT TO EACH ROOM IN THE CAVE.\n"
//						+ "          FOR EXAMPLE:\n"
//						+ "            ROOM #1     ? 2,3,4       - YOUR REPLY OF 2,3,4\n"
//						+ "             MEANS ROOM 1 HAS TUNNELS GOING TO ROOMS:\n"
//						+ "             2, 3, & 4.\n"
						+ "  HAPPY HUNTING!\n\n");
				this.choose_map( );
				this.instruct = 0;
				break;

			default :
				// do nothing
				break;
		} // end instruct switch
	} // end instructions


	this.choose_map = function( ) {
		this.choosing = true;
		this.print("CAVE #(0-5)");
	} // end choose_map


	/** function win
	 *		Does all the things we need to do
	 *		when the hunter wins
	 *
	 * @param void
	 * @return void
	 */
	this.win = function( ) {
		this.print('HEE HEE HEE - THE WUMPUS\'LL GET YOU NEXT TIME!!');
		this.resetting = true;
		this.print('SAME SETUP (Y-N)');
	}


	/** function dead
	 *		Does all the things we need to do
	 *		when the hunter dies
	 *
	 * @param void
	 * @return void
	 */
	this.dead = function( ) {
		this.print('HA HA HA - YOU LOSE!');
		this.resetting = true;
		this.print('SAME SETUP (Y-N)');
	}


	/** function _connections
	 *		Returns a string of the rooms that are
	 *		connected to the one the hunter is in
	 *
	 * @param void
	 * @return string concatenated room ids
	 */
	this._connections = function( ) {
		var output = '';

		for (var key in this.caves[this.cave][this.hunter]) {
			output += ' '+this.caves[this.cave][this.hunter][key];
		}

		return output;
	}


	/** function _adj
	 *		Test if two rooms are adjacent
	 *
	 * @param int room id
	 * @param int room id
	 * @return bool rooms are connected
	 */
	this._adj = function(room1, room2) {
		var key;
		for (key in this.caves[this.cave][room1]) {
			if (room2 == this.caves[this.cave][room1][key]) {
				return true;
			}
		}

		return false;
	}


	/** function _log
	 *		Outputs data to the console
	 *
	 * @param void
	 * @action outputs to console
	 * @return void
	 */
	this._log = function( ) {
		return false;

		if (console.log) {
			console.log(this.start);
		}
	}

}


// MISC FUNCTIONS

/** function rand
 *		Generates a random integer between
 *		two given values, inclusive
 *
 * @param int lower value
 * @param int upper value
 * @return int random number
 */
function rand(min, max) {
	if (min == max) { return min; }

	// 'seed' the random number (cuz js random numbers kinda suck)
	var date = new Date( );
	var count = date.getMilliseconds( ) % 10;

	for (var i = 0; i <= count; ++i) 	{
		Math.random( );
	}

	if (min > max) 	{
		// XOR variable switching
		min ^= max;
		max ^= min;
		min ^= max;
	}

	return Math.floor((Math.random( ) * (max - min + 1)) + min);
}


/** function is_int
 *		Tests if the given value is an integer
 *
 * @param mixed value to test
 * @return bool value is an integer
 */
function is_int(input) {
	return (('number' == typeof(input)) && (parseInt(input) == input));
}


/** function clone
 *		Clones a given object or array
 *
 * @param mixed original
 * @return mixed clone
 */
function clone(obj){
	if ((null == obj) || ('object' != typeof(obj))) {
		return obj;
	}

	if (Array == obj.constructor) {
		var temp = [];

		for (var i = 0; i < obj.length; i++) {

			if ('object' == typeof(obj[i])) {
				temp.push(clone(obj[i]));
			}
			else {
				temp.push(obj[i]);
			}
		}

		return temp;
	}

	var temp = new obj.constructor( );
	for (var key in obj) {
		if (obj !== obj[key]) {
			temp[key] = clone(obj[key]);
		}
		else {
			temp[key] = temp;
		}
	}

	return temp;
}



// Expose Wumpus constructor globally
window.WumpusGame = Wumpus;
