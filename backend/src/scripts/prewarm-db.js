/**
 * Pre-downloads the embedded MongoDB binary so the first server start is fast.
 * Only needed when running without an external MONGODB_URI.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  if (process.env.MONGODB_URI) {
    console.log('[prewarm-db] MONGODB_URI set, nothing to prewarm.');
    return;
  }
  console.log('[prewarm-db] downloading embedded MongoDB binary...');
  const server = await MongoMemoryServer.create({ instance: { dbName: 'mock_interview' } });
  console.log('[prewarm-db] ready at', server.getUri('mock_interview'));
  await server.stop();
}

main().catch((err) => {
  console.error('[prewarm-db] failed:', err.message);
  process.exit(0);
});
