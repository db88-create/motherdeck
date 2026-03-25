module.exports = {
  apps: [{
    name: 'command',
    script: '/home/claudeclaw/command/start-command.sh',
    cwd: '/home/claudeclaw/command',
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
