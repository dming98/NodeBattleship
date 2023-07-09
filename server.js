var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

var BattleshipGame = require('./app/game.js');
var GameStatus = require('./app/gameStatus.js');
var Settings = require('./app/settings.js');

var port = 8900;

var users = {};
var players = {};
var gameIdCounter = 1;

app.use(express.static(__dirname + '/public'));

http.listen(port, function () {
    console.log('listening on *:' + port);
});

io.on('connection', function (socket) {
    console.log((new Date().toISOString()) + ' ID ' + socket.id + ' connected.');

    // create user object for additional data
    users[socket.id] = {
        inGame: null,
        player: null
    };

    // join waiting room until there are enough players to start a new game
    socket.join('waiting room');

    // start the single player game.
    socket.on('startSinglePlayerGame', function () {
        console.log('Single player game started');
        console.log('Received startSinglePlayerGame event from ' + socket.id);
        // var cpuPlayerId = 'cpu'; // Or generate a unique ID for the CPU player
        // var gameId = UUID.v4();
        var game = new BattleshipGame(gameIdCounter++, socket.id, socket.id+'_CPU', true);
        // games[gameId] = game;
        players[socket.id] = game.id;

        // Move player out of waiting room and into game room
        socket.leave('waiting room');
        socket.join('game' + game.id);
        users[socket.id].inGame = game;
        users[socket.id].player = 0;

        // Inform player that they've joined a game
        io.to(socket.id).emit('join', game.id);

        // Send initial ship placements
        io.to(socket.id).emit('update', game.getGameState(0, 0));

        // game.shoot(generateRandomShot()); // Implement the AI's random shot function
        io.to(socket.id).emit('update', game.getGameState(0, 0));
    });

    /**
     * Handle chat messages
     */
    socket.on('chat', function (msg) {
        if (users[socket.id].inGame !== null && msg) {
            console.log((new Date().toISOString()) + ' Chat message from ' + socket.id + ': ' + msg);

            // Send message to opponent
            socket.broadcast.to('game' + users[socket.id].inGame.id).emit('chat', {
                name: 'Opponent',
                message: entities.encode(msg),
            });

            // Send message to self
            io.to(socket.id).emit('chat', {
                name: 'Me',
                message: entities.encode(msg),
            });
        }
    });

    /**
     * Handle ships from client
     */
    socket.on('ships', function (ships) {
        var game = users[socket.id].inGame, opponent;

        if (game !== null) {
            if (game.gameStatus === GameStatus.preGame || game.gameStatus === GameStatus.onePlaced) {
                game.players[users[socket.id].player].ships = ships;

                var gridCols = Settings.gridCols;
                for (var shipIndex = 0; shipIndex < ships.length; shipIndex++) {
                    ship = ships[shipIndex];

                    // place ship array-index in shipGrid
                    var gridIndex = ship.y * gridCols + ship.x;
                    for (var i = 0; i < ship.size; i++) {
                        game.players[users[socket.id].player].shipGrid[gridIndex] = shipIndex;
                        gridIndex += ship.horizontal ? 1 : gridCols;
                    }
                }

                opponent = users[socket.id].player === 0 ? 1 : 0;

                if (game.gameStatus === GameStatus.preGame) {
                    // send initial ship placements
                    game.gameStatus = GameStatus.onePlaced;

                    io.to(socket.id).emit('oneplaced', game.getGameState(users[socket.id].player, users[socket.id].player));
                    io.to(game.getPlayerId(opponent)).emit('oneplaced', game.getGameState(users[socket.id].player, opponent));
                } else if (game.gameStatus === GameStatus.onePlaced) {
                    game.gameStatus = GameStatus.inProgress;

                    io.to(socket.id).emit('startgame', game.getGameState(users[socket.id].player, users[socket.id].player));
                    io.to(game.getPlayerId(opponent)).emit('startgame', game.getGameState(users[socket.id].player, opponent));
                    io.to(socket.id).emit('update', game.getGameState(users[socket.id].player, opponent));
                    io.to(game.getPlayerId(opponent)).emit('update', game.getGameState(opponent, opponent));

                }
            }
        }
    });

    /**
     * Handle shot from client
     */
    socket.on('shot', function (position) {
        var game = users[socket.id].inGame, opponent;

        if (game !== null) {
            // Is it this users turn?
            if (game.currentPlayer === users[socket.id].player) {
                opponent = game.currentPlayer === 0 ? 1 : 0;

                if (game.shoot(position)) {
                    // Valid shot
                    checkGameOver(game);

                    // Update game state on both clients.
                    io.to(socket.id).emit('update', game.getGameState(users[socket.id].player, opponent));
                    io.to(game.getPlayerId(opponent)).emit('update', game.getGameState(opponent, opponent));
                    if (game.singlePlayer){
                        io.to(socket.id).emit('update', game.getGameState(users[socket.id].player, game.currentPlayer));
                    }

                }
            }
        }
    });

    /**
     * Handle leave game request
     */
    socket.on('leave', function () {
        if (users[socket.id].inGame !== null) {
            leaveGame(socket);

            socket.join('waiting room');
            joinWaitingPlayers();
        }
    });

    /**
     * Handle client disconnect
     */
    socket.on('disconnect', function () {
        console.log((new Date().toISOString()) + ' ID ' + socket.id + ' disconnected.');

        leaveGame(socket);

        delete users[socket.id];
    });

    joinWaitingPlayers();
});

/**
 * Create games for players in waiting room
 */
function joinWaitingPlayers() {
    var players = getClientsInRoom('waiting room');

    if (players.length >= 2) {
        // 2 player waiting. Create new game!
        var game = new BattleshipGame(gameIdCounter++, players[0].id, players[1].id, false);

        // create new room for this game
        players[0].leave('waiting room');
        players[1].leave('waiting room');
        players[0].join('game' + game.id);
        players[1].join('game' + game.id);

        users[players[0].id].player = 0;
        users[players[1].id].player = 1;
        users[players[0].id].inGame = game;
        users[players[1].id].inGame = game;

        io.to('game' + game.id).emit('join', game.id);

        // send initial ship placements
        io.to(players[0].id).emit('update', game.getGameState(0, 0));
        io.to(players[1].id).emit('update', game.getGameState(1, 1));

        console.log((new Date().toISOString()) + " " + players[0].id + " and " + players[1].id + " have joined game ID " + game.id);
    }
}

/**
 * Leave user's game
 * @param {type} socket
 */
function leaveGame(socket) {
    if (users[socket.id].inGame !== null) {
        console.log((new Date().toISOString()) + ' ID ' + socket.id + ' left game ID ' + users[socket.id].inGame.id);

        // Notifty opponent
        socket.broadcast.to('game' + users[socket.id].inGame.id).emit('notification', {
            message: 'Opponent has left the game'
        });

        if (users[socket.id].inGame.gameStatus !== GameStatus.gameOver) {
            // Game is unfinished, abort it.
            users[socket.id].inGame.abortGame(users[socket.id].player);
            checkGameOver(users[socket.id].inGame);
        }

        socket.leave('game' + users[socket.id].inGame.id);

        users[socket.id].inGame = null;
        users[socket.id].player = null;

        io.to(socket.id).emit('leave');
    }
}

/**
 * Notify players if game over.
 * @param {type} game
 */
function checkGameOver(game) {
    if (game.gameStatus === GameStatus.gameOver) {
        console.log((new Date().toISOString()) + ' Game ID ' + game.id + ' ended.');
        io.to(game.getWinnerId()).emit('gameover', true);
        io.to(game.getLoserId()).emit('gameover', false);
    }
}

/**
 * Find all sockets in a room
 * @param {type} room
 * @returns {Array}
 */
function getClientsInRoom(room) {
    var clients = [];
    for (var id in io.sockets.adapter.rooms[room]) {
        clients.push(io.sockets.adapter.nsp.connected[id]);
    }
    return clients;
}
