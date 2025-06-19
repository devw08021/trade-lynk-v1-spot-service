// import package
import { Server } from 'socket.io';

let socketIO = '';

export const connectSocketIO = (server) => {
    socketIO = new Server(server, {
        pingTimeout: 600000,
        cors: {
            origin: "*"
        }
    })

    socketIO.on('connection', (socket) => {
        console.log(`✅ Socket successfully connected.`);

        socket.on("MT5_market_price", function (data) {
            socketEmitOne('marketPrice', data, "marketPrice")
        });

        socket.on('CREATEROOM', function (userId) {
            if (userId) {
                socket.join(userId.toString());
            }
        });

        socket.on('disconnecting', () => {
            console.log('DISCONNET', socket.rooms);
        });
    })

}

export const socketEmitAll = (type, data) => {
    try {
        socketIO.emit(type, data)
    } catch (err) {
    }
}

export const socketEmitOne = (type, data, userId) => {
    try {
        socketIO.sockets.in(userId.toString()).emit(type, data);
    } catch (err) {
    }
}
