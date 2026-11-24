import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { pool } from './db';
import { appRouter } from './router';

const PORT = 3001;

async function iniciar() {
  await pool.query('SELECT 1 FROM products LIMIT 1');
  const server = createHTTPServer({ router: appRouter });
  server.on('error', (error) => {
    console.error('Error en servidor tRPC:', error.message);
    process.exitCode = 1;
    void pool.end();
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Servidor tRPC (MySQL) escuchando en el puerto: ${PORT}`);
  });
}

iniciar().catch(async (error) => {
  console.error('Error al conectar con MySQL:', error.message);
  process.exitCode = 1;
  await pool.end();
});
