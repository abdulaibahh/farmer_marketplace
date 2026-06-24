import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(toolsDirectory, '..');

async function isPortAvailable(port) {
  const isReachable = await Promise.any(
    ['127.0.0.1', '::1'].map(
      (host) =>
        new Promise((resolve, reject) => {
          const socket = net.createConnection({ host, port });
          socket.setTimeout(300);
          socket.once('connect', () => {
            socket.destroy();
            resolve(true);
          });
          socket.once('timeout', () => {
            socket.destroy();
            reject(new Error('timeout'));
          });
          socket.once('error', reject);
        })
    )
  ).catch(() => false);

  if (isReachable) {
    return false;
  }

  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

async function findWebPort() {
  for (let port = 8081; port <= 8090; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error('No free Expo web port was found between 8081 and 8090.');
}

const webPort = await findWebPort();
const localWebUrl = `http://localhost:${webPort}`;
const sharedEnvironment = {
  ...process.env,
  NODE_ENV: 'development',
  CLIENT_ORIGIN: localWebUrl,
  PAYMENT_RETURN_URL: `${localWebUrl}/payment-return`
};

const apiProcess = spawn(process.execPath, ['backend/src/index.js'], {
  cwd: workspaceDirectory,
  env: sharedEnvironment,
  stdio: 'inherit',
  windowsHide: true
});

const webProcess = spawn(
  process.execPath,
  ['node_modules/expo/bin/cli', 'start', '--web', '--port', String(webPort)],
  {
    cwd: workspaceDirectory,
    env: {
      ...sharedEnvironment,
      EXPO_NO_DOCTOR: '1',
      EXPO_PUBLIC_API_URL: 'http://localhost:4000',
      EXPO_PUBLIC_PAYMENT_RETURN_URL: `${localWebUrl}/payment-return`
    },
    stdio: 'inherit',
    windowsHide: true
  }
);

console.log(`Local marketplace: ${localWebUrl}`);
console.log('Local API: http://localhost:4000');
console.log('Press Ctrl+C to stop both services.');

let shuttingDown = false;

function stop(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  apiProcess.kill();
  webProcess.kill();
  setTimeout(() => process.exit(exitCode), 250);
}

apiProcess.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`The local API stopped with exit code ${code ?? 1}.`);
    stop(code ?? 1);
  }
});

webProcess.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`Expo web stopped with exit code ${code ?? 1}.`);
    stop(code ?? 1);
  }
});

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
