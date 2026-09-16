import { fileURLToPath } from 'node:url';
import { startServer } from './static-server.cjs';

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--port')) throw new Error('Usage: npm start -- --port 4173');
try {
  const running = await startServer({ root: fileURLToPath(new URL('../dist/web/', import.meta.url)), port: args.length ? Number(args[1]) : 4173 });
  console.log(`学会啦 / Got It Learning: ${running.url}\nPress Ctrl+C to stop. Progress belongs to this browser and port.`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await running.close(); process.exit(0); });
} catch (error) {
  console.error(error.code === 'EADDRINUSE' ? 'Port is busy. Close the previous server, or use npm start -- --port 4175 (a different port has separate saved progress).' : error.message);
  process.exitCode = 1;
}
