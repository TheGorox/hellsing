module.exports = {
  apps: [
    {
      name: 'hell',
      script: 'src/index.ts',
      interpreter: 'node',
      interpreter_args: '--import @swc-node/register/esm-register --no-warnings',
      env: {
        NODE_ENV: 'production',
        TS_NODE_PROJECT: 'tsconfig.json'
      },
      watch: false
    }
  ]
};
