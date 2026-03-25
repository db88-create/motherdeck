module.exports = {
  apps: [{
    name: 'mother',
    script: '/home/claudeclaw/motherdeck/start-mother.sh',
    cwd: '/home/claudeclaw/motherdeck',
    interpreter: '/bin/bash',
    watch: false,
    autorestart: true,
    max_restarts: 3,
    restart_delay: 10000,
    kill_timeout: 15000,
    treekill: true,
    env: {
      NODE_ENV: 'production',
    },
  }],
};
