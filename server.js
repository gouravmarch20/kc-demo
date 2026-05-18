// Thin entry so platforms that default to `node server.js` (e.g. Render) can
// boot the Next.js production server without any extra configuration. We spawn
// `next start` instead of using a custom server so we don't lose Automatic
// Static Optimization (see next/dist/docs/01-app/02-guides/custom-server.md).

const { spawn } = require('node:child_process');

const port = process.env.PORT || '3000';
const host = process.env.HOST || '0.0.0.0';
const nextBin = require.resolve('next/dist/bin/next');

const child = spawn(
  process.execPath,
  [nextBin, 'start', '-p', port, '-H', host],
  { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } }
);

const forward = (signal) => {
  if (!child.killed) child.kill(signal);
};
process.on('SIGINT', () => forward('SIGINT'));
process.on('SIGTERM', () => forward('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
