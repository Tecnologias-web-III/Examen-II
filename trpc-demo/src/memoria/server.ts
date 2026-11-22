import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { appRouter } from './router';

const PORT = 3000;

const server = createHTTPServer({
  router: appRouter,
});

server.listen(PORT, '127.0.0.1');
console.log(`Servidor tRPC (memoria) escuchando en el puerto: ${PORT}`);