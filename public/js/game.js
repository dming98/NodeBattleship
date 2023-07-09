var GameStatus = {
    preGame: -1,
    onePlaced: 0,
    inProgress: 1,
    gameOver: 2
}
var Settings = {
    gridRows: 10,
    gridCols: 10,
    ships: [ 5, 4, 3, 3, 2 ]
};

var Game = (function () {
    var canvas = [], context = [], grid = [], shipGrid,
        gridHeight = 361, gridWidth = 361, gridBorder = 1,
        gridRows = Settings.gridRows, gridCols = Settings.gridCols, markPadding = 10, shipPadding = 3,
        squareHeight = (gridHeight - gridBorder * gridRows - gridBorder) / gridRows,
        squareWidth = (gridWidth - gridBorder * gridCols - gridBorder) / gridCols,
        turn = false, gameStatus, squareHover = {x: -1, y: -1},
        hoverShip, shipIndex, currentShipButton, carrier, battleship, destroyer, submarine, patrolboat;

    carrier = document.getElementById('carrier')
    battleship = document.getElementById('battleship')
    destroyer = document.getElementById('destroyer')
    submarine = document.getElementById('submarine')
    patrolboat = document.getElementById('patrolboat')
    hoverShip = null;
    currentShipButton = null;

    canvas[0] = document.getElementById('canvas-grid1');    // This player
    canvas[1] = document.getElementById('canvas-grid2');    // Opponent
    context[0] = canvas[0].getContext('2d');
    context[1] = canvas[1].getContext('2d');

    carrier.addEventListener('click', function (e) {
        hoverShip = grid[0].ships[0];
        currentShipButton = carrier;
        shipIndex = 0;
    });

    battleship.addEventListener('click', function (e) {
        hoverShip = grid[0].ships[1];
        currentShipButton = battleship;
        shipIndex = 1;
    });

    destroyer.addEventListener('click', function (e) {
        hoverShip = grid[0].ships[2];
        currentShipButton = destroyer;
        shipIndex = 2;
    });

    submarine.addEventListener('click', function (e) {
        hoverShip = grid[0].ships[3];
        currentShipButton = submarine;
        shipIndex = 3;
    });

    patrolboat.addEventListener('click', function (e) {
        hoverShip = grid[0].ships[4];
        currentShipButton = patrolboat;
        shipIndex = 4;
    });

    /**
     * Highlight opponent square on hover
     */
    canvas[1].addEventListener('mousemove', function (e) {
        var pos = getCanvasCoordinates(e, canvas[1]);
        squareHover = getSquare(pos.x, pos.y);
        drawGrid(1);
    });

    /**
     * Mouse moved out of opponent grid. Unhighlight.
     */
    canvas[1].addEventListener('mouseout', function (e) {
        squareHover = {x: -1, y: -1};
        drawGrid(1);
    });

    /**
     * Highlight own square on hover
     */
    canvas[0].addEventListener('mousemove', function (e) {
        var pos = getCanvasCoordinates(e, canvas[0]);
        squareHover = getSquare(pos.x, pos.y);
        drawGrid(0);
    });

    /**
     * Mouse moved out of own grid. Unhighlight.
     */
    canvas[0].addEventListener('mouseout', function (e) {
        squareHover = {x: -1, y: -1};
        drawGrid(0);
    });

    /**
     * Place ship on mouse click event (if it's pregame/onePlaced).
     */
    canvas[0].addEventListener('click', function (e) {
        if ((gameStatus === GameStatus.preGame || gameStatus === GameStatus.onePlaced) && hoverShip !== null) {
            var pos = getCanvasCoordinates(e, canvas[0]);
            var square = getSquare(pos.x, pos.y);
            if (!checkShipOverlap(hoverShip, square)) {
                hoverShip.x = square.x;
                hoverShip.y = square.y;
                var gridIndex = hoverShip.y * gridCols + hoverShip.x;
                for (var j = 0; j < hoverShip.size; j++) {
                    shipGrid[gridIndex] = shipIndex;
                    gridIndex += hoverShip.horizontal ? 1 : gridCols;
                }

                drawGrid(0);
                currentShipButton.disabled = true;
                hoverShip = null;
                currentShipButton = null;
                if(checkAllPlaced()){
                    sendShips(grid[0].ships);
                }
            }
        }
    });
    /**
     * Rotate ship on right click event (if it's pregame/onePlaced).
     */
    canvas[0].addEventListener('contextmenu', function (e) {
        e.preventDefault();
        hoverShip.horizontal = !hoverShip.horizontal;
        drawGrid(0);
    });

    /**
     * Fire shot on mouse click event (if it's user's turn).
     */
    canvas[1].addEventListener('click', function (e) {
        if (gameStatus === GameStatus.inProgress && turn) {
            var pos = getCanvasCoordinates(e, canvas[1]);
            var square = getSquare(pos.x, pos.y);
            sendShot(square);
        }
    });

    /**
     * Get square from mouse coordinates
     * @param {type} x Mouse x
     * @param {type} y Mouse y
     * @returns {Object}
     */
    function getSquare(x, y) {
        return {
            x: Math.floor(x / (gridWidth / gridCols)),
            y: Math.floor(y / (gridHeight / gridRows))
        };
    };

    function checkShipOverlap(hoverShip, square) {
        var i, gridIndex = square.y * gridCols + square.x;

        if(hoverShip.horizontal ? square.x + hoverShip.size > gridCols : square.y + hoverShip.size > gridRows){
            return true;
        }
        for (i = 0; i < hoverShip.size; i++) {
            if (shipGrid[gridIndex] >= 0) {
                return true;
            }
            gridIndex += hoverShip.horizontal ? 1 : gridCols;
        }
        return false;
    }

    function checkAllPlaced() {
        var i, ship, allPlaced = true;
        for (i = 0; i < grid[0].ships.length; i++) {
            ship = grid[0].ships[i];
            if (ship.x < 0 || ship.y < 0) {
                allPlaced = false;
            }
        }
        return allPlaced;
    }

    /**
     * Get mouse position on canvas relative to canvas top,left corner
     * @param {type} event
     * @param {type} canvas
     * @returns {Object} Position
     */
    function getCanvasCoordinates(event, canvas) {
        rect = canvas.getBoundingClientRect();
        return {
            x: Math.round((event.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
            y: Math.round((event.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
        };
    };

    /**
     * Init new game
     */
    function initGame() {
        var i;

        gameStatus = GameStatus.preGame;

        // Create empty grids for player and opponent
        grid[0] = {shots: Array(gridRows * gridCols), ships: []};
        shipGrid = Array(gridRows * gridCols);
        grid[1] = {shots: Array(gridRows * gridCols), ships: []};

        for (i = 0; i < gridRows * gridCols; i++) {
            grid[0].shots[i] = 0;
            grid[1].shots[i] = 0;
            shipGrid[i] = -1;
        }

        // Reset turn status classes
        $('#turn-status').removeClass('alert-your-turn').removeClass('alert-opponent-turn')
            .removeClass('alert-winner').removeClass('alert-loser');

        carrier = document.getElementById('carrier')
        carrier.disabled = false;

        battleship = document.getElementById('battleship')
        battleship.disabled = false;

        destroyer = document.getElementById('destroyer')
        destroyer.disabled = false;

        submarine = document.getElementById('submarine')
        submarine.disabled = false;

        patrolboat = document.getElementById('patrolboat')
        patrolboat.disabled = false;

        drawGrid(0);
        drawGrid(1);
    };

    /**
     * Update player's or opponent's grid.
     * @param {type} player
     * @param {type} gridState
     * @returns {undefined}
     */
    function updateGrid(player, gridState) {
        grid[player] = gridState;
        drawGrid(player);
    };

    /**
     * Set if it's this client's turn
     * @param {type} turnState
     * @returns {undefined}
     */
    function setTurn(turnState) {
        if (gameStatus !== GameStatus.gameOver) {
            turn = turnState;

            if ((gameStatus === GameStatus.preGame || gameStatus === GameStatus.onePlaced)) {
                $('#turn-status').removeClass('alert-opponent-turn').removeClass('alert-your-turn').addClass('alert-waiting').html('Waiting for ship placement...');
            } else if (turn) {
                $('#turn-status').removeClass('alert-waiting').removeClass('alert-opponent-turn').addClass('alert-your-turn').html('It\'s your turn!');
            } else {
                $('#turn-status').removeClass('alert-waiting').removeClass('alert-your-turn').addClass('alert-opponent-turn').html('Waiting for opponent.');
            }
        }
    };

    /**
     * Set
     */
    function setOnePlaced() {
        gameStatus = GameStatus.onePlaced;

        $('#turn-status').removeClass('alert-opponent-turn').removeClass('alert-your-turn')
                .addClass('alert-winner').html('Waiting for ship placement...');
    }

    /**
     * Set game over and show winning/losing message
     */
    function setInProgress() {
        gameStatus = GameStatus.inProgress;
    }

    /**
     * Set game over and show winning/losing message
     * @param {Boolean} isWinner
     */
    function setGameOver(isWinner) {
        gameStatus = GameStatus.gameOver;
        turn = false;

        if (isWinner) {
            $('#turn-status').removeClass('alert-opponent-turn').removeClass('alert-your-turn')
                .addClass('alert-winner').html('You won! <a href="#" class="btn-leave-game">Play again</a>.');
        } else {
            $('#turn-status').removeClass('alert-opponent-turn').removeClass('alert-your-turn')
                .addClass('alert-loser').html('You lost. <a href="#" class="btn-leave-game">Play again</a>.');
        }
        $('.btn-leave-game').click(sendLeaveRequest);
    }

    /*
     * Draw a grid with squares, ships and shot marks
     */
    function drawGrid(gridIndex) {
        drawSquares(gridIndex);
        drawShips(gridIndex);
        drawMarks(gridIndex);
    };

    /**
     * Draw grid squares/background
     * @param {Number} gridIndex
     */
    function drawSquares(gridIndex) {
        var i, j, squareX, squareY;

        context[gridIndex].fillStyle = '#222222'
        context[gridIndex].fillRect(0, 0, gridWidth, gridHeight);

        for (i = 0; i < gridRows; i++) {
            for (j = 0; j < gridCols; j++) {
                squareX = j * (squareWidth + gridBorder) + gridBorder;
                squareY = i * (squareHeight + gridBorder) + gridBorder;

                context[gridIndex].fillStyle = '#7799FF'

                // Highlight square if it's user's turn and user hovers over an unfired on, opponent square.
                if (j === squareHover.x && i === squareHover.y &&
                    gridIndex === 1 && grid[gridIndex].shots[i * gridCols + j] === 0 && turn) {
                    context[gridIndex].fillStyle = '#4477FF';
                }

                // Highlight square if it's user's turn and user hovers over an unfired on, opponent square.
                if (j === squareHover.x && i === squareHover.y &&
                    gridIndex === 0 && (gameStatus === GameStatus.preGame || gameStatus === GameStatus.onePlaced)) {
                    context[gridIndex].fillStyle = '#4477FF';
                }

                context[gridIndex].fillRect(squareX, squareY, squareWidth, squareHeight);
            }
        }
    };

    /**
     * Draw visible ships on grid
     * @param {Number} gridIndex
     */
    function drawShips(gridIndex) {
        var ship, i, j, x, y,
            shipWidth, shipLength;

        context[gridIndex].fillStyle = '#444444';
        if (gridIndex === 0 && (gameStatus === GameStatus.preGame || gameStatus === GameStatus.onePlaced) && hoverShip !== null) {
            for (i = 0; i < gridRows; i++) {
                for (j = 0; j < gridCols; j++) {
                    if (j === squareHover.x && i === squareHover.y) {
                        x = j * (squareWidth + gridBorder) + gridBorder + shipPadding;
                        y = i * (squareHeight + gridBorder) + gridBorder + shipPadding;
                        shipWidth = squareWidth - shipPadding * 2;
                        shipLength = squareWidth * hoverShip.size + (gridBorder * (hoverShip.size - 1)) - shipPadding * 2;

                        if (hoverShip.horizontal) {
                            context[gridIndex].fillRect(x, y, shipLength, shipWidth);
                        } else {
                            context[gridIndex].fillRect(x, y, shipWidth, shipLength);
                        }
                    }

                }
            }
        }

        for (i = 0; i < grid[gridIndex].ships.length; i++) {
            ship = grid[gridIndex].ships[i];

            x = ship.x * (squareWidth + gridBorder) + gridBorder + shipPadding;
            y = ship.y * (squareHeight + gridBorder) + gridBorder + shipPadding;
            shipWidth = squareWidth - shipPadding * 2;
            shipLength = squareWidth * ship.size + (gridBorder * (ship.size - 1)) - shipPadding * 2;

            if (ship.horizontal) {
                context[gridIndex].fillRect(x, y, shipLength, shipWidth);
            } else {
                context[gridIndex].fillRect(x, y, shipWidth, shipLength);
            }
        }
    };

    /**
     * Draw shot marks on grid (black crosses for missed and red circles for hits)
     * @param {Number} gridIndex
     */
    function drawMarks(gridIndex) {
        var i, j, squareX, squareY;

        for (i = 0; i < gridRows; i++) {
            for (j = 0; j < gridCols; j++) {
                squareX = j * (squareWidth + gridBorder) + gridBorder;
                squareY = i * (squareHeight + gridBorder) + gridBorder;

                // draw black cross if there is a missed shot on square
                if (grid[gridIndex].shots[i * gridCols + j] === 1) {
                    context[gridIndex].beginPath();
                    context[gridIndex].moveTo(squareX + markPadding, squareY + markPadding);
                    context[gridIndex].lineTo(squareX + squareWidth - markPadding, squareY + squareHeight - markPadding);
                    context[gridIndex].moveTo(squareX + squareWidth - markPadding, squareY + markPadding);
                    context[gridIndex].lineTo(squareX + markPadding, squareY + squareHeight - markPadding);
                    context[gridIndex].strokeStyle = '#000000';
                    context[gridIndex].stroke();
                }
                // draw red circle if hit on square
                else if (grid[gridIndex].shots[i * gridCols + j] === 2) {
                    context[gridIndex].beginPath();
                    context[gridIndex].arc(squareX + squareWidth / 2, squareY + squareWidth / 2,
                        squareWidth / 2 - markPadding, 0, 2 * Math.PI, false);
                    context[gridIndex].fillStyle = '#E62E2E';
                    context[gridIndex].fill();
                }
            }
        }
    };

    return {
        'initGame': initGame,
        'updateGrid': updateGrid,
        'setTurn': setTurn,
        'setOnePlaced': setOnePlaced,
        'setInProgress': setInProgress,
        'setGameOver': setGameOver
    };
})();
