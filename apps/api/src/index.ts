import app from './app.js';
import { env } from './env.js';

app.listen(env.PORT, () => {
  console.log(`\nHypercard API running at http://localhost:${env.PORT}`);
  console.log(`   Health: http://localhost:${env.PORT}/api/health`);
  console.log(`   Auth:   http://localhost:${env.PORT}/api/auth`);
  console.log(`   CORS:   ${env.CORS_ORIGIN}\n`);
});
