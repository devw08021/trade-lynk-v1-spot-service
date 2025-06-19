const { build } = require('esbuild');
const fs = require('fs');
const dotenv = require('dotenv');
const { resolve } = require('path');
const { builtinModules } = require('module');

const envArg = process.argv.find(arg => arg.startsWith('--env='));
const envName = envArg ? envArg.split('=')[1] : 'dev';
const envPath = `src/.env.${envName}`;

if (!fs.existsSync(envPath)) {
    console.error(`❌ .env file not found: ${envPath}`);
    process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envPath));
const define = {};
for (const k in env) {
    define[`process.env.${k}`] = JSON.stringify(env[k]);
}

build({
    entryPoints: [resolve('src/server.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outdir: '../build',
    sourcemap: true,
    target: ['node20'],
    external: [
        ...builtinModules,
        'bcrypt',
        'node-pre-gyp',
        '@mapbox/node-pre-gyp',
    ],
    define,
}).catch(() => process.exit(1));
