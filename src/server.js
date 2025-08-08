import { serve } from '@hono/node-server';
import app from './index.js';
import { connectSocketIO } from './config/socketIO.js';
import GrpcServer from './grpc/server.js';
import { env } from './config/env.js';

const [major, minor] = process.versions.node.split('.').map(Number);

if (major < 18 || (major === 18 && minor < 11)) {
    console.error(
        `Node.js v18.11.0 or higher is required'. You are using v${process.versions.node}`
    );
    process.exit(1);
}

const grpcServer = new GrpcServer();
const grpcPort = process.env.GRPC_PORT || 50051;
const port = env.PORT || 3000;
let server = serve({
    fetch: app.fetch,
    port,
});

const shutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    try {
        if (grpcServer) {
            console.log('🛑 Stopping gRPC server...');
            await grpcServer.stop();
        }
        
        if (server) {
            console.log('🛑 Stopping HTTP server...');
            server.close();
        }
        
        console.log('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const startServers = async () => {
    try {
        console.log('Initializing gRPC server...');
        await grpcServer.initialize();
        await grpcServer.start(grpcPort);
        console.log(`gRPC server running on port ${grpcPort}`);
        
        connectSocketIO(server);
        
        console.log(`HTTP server running on port ${port}`);
        console.log(`Full stack ready - HTTP: ${port}, gRPC: ${grpcPort}`);
        
    } catch (error) {
        console.error('Failed to start servers:', error);
        process.exit(1);
    }
};

startServers();