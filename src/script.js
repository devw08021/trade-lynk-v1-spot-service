const { spawn } = require('child_process');

const [major, minor] = process.versions.node.split('.').map(Number);

if (major < 18 || (major === 18 && minor < 11)) {
    console.error(
        `❌ Node.js v18.11.0 or higher is required'. You are using v${process.versions.node}`
    );
    process.exit(1);
}

const args = [
    'run',
    '--env-file',
    'src/.env.local',
    '--',
    'node',
    '--watch',
    '-r',
    './src/babel_hook.js',
    'src/server.js',
];

spawn('dotenvx', args, {
    stdio: 'inherit',
});
