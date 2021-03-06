// Functions defined here are to allow for safe socket operations within code that will sometimes
// run with empty sockets (e.g. during unit tests).

// Attempts to emit a message from the given socket.
function emit(socket, message, data) {
  if (socket && socket.emit) {
    socket.emit(message, data);
  }
}

// Attempts to join a socket to the given room code.
function join(socket, roomCode, callback) {
  if (socket && socket.join) {
    socket.join(roomCode, callback);
  }
}

// Attempts to set a listener for all sockets for a given socket.io instance.
//
// Typically used to set the 'connection' message.
function socketsOn(socketIoInstance, message, callback) {
  if (socketIoInstance && socketIoInstance.sockets) {
    socketIoInstance.sockets.on(message, callback);
  }
}

module.exports.emit = emit;
module.exports.join = join;
module.exports.socketsOn = socketsOn;
