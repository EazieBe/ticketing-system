module.exports = {
  apps: [
    {
      name: 'ticketing-backend',
      script: 'uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000 --reload',
      cwd: '/home/eazie/ticketing-system',
      env: {
        PATH: '/home/eazie/ticketing-system/venv/bin'
      },
      interpreter: '/home/eazie/ticketing-system/venv/bin/python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_file: './logs/backend.log',
      out_file: './logs/backend-out.log',
      error_file: './logs/backend-error.log'
    },
    {
      name: 'ticketing-frontend',
      script: 'serve',
      args: '-s build -l 3000 --single',
      cwd: '/home/eazie/ticketing-system/frontend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_file: '../logs/frontend.log',
      out_file: '../logs/frontend-out.log',
      error_file: '../logs/frontend-error.log'
    }
  ]
}; 