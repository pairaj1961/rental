import 'dotenv/config';
import { buildServer } from './server';
import { config } from './config';

async function main() {
  const app = await buildServer();
  await app.listen({ port: config.PORT, host: config.HOST });
  console.log(`🚀 Tools Act API running at http://${config.HOST}:${config.PORT}`);
}

main().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
