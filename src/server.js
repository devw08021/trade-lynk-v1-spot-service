// server-node.js
import { serve } from '@hono/node-server';
import app from './index.js';
import { connectSocketIO } from './config/socketIO.js'
const [major, minor] = process.versions.node.split('.').map(Number);

if (major < 18 || (major === 18 && minor < 11)) {
    console.error(
        `❌ Node.js v18.11.0 or higher is required'. You are using v${process.versions.node}`
    );
    process.exit(1);
}
const port = process.env.PORT || 3000;
let server = serve({
    fetch: app.fetch,
    port,
});
//Connect to socket
connectSocketIO(server)

console.log(`🦸‍♂️💨 Superman is flying to http://localhost:${port}`);
