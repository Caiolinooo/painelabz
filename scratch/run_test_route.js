require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

require('ts-node').register({
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    target: 'es2017'
  }
});
require('tsconfig-paths').register();
require('./test_realtime_route.ts');
