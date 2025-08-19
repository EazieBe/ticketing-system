module.exports = {
  apps: [
    {
      name: "ticketing-api",
      script: "uvicorn",
      args: "app.main:app --host 0.0.0.0 --port 8000 --workers 1",
      interpreter: "python3",
      cwd: "/home/eazie/ticketing-system",
      env: {
        NODE_ENV: "production",
        PORT: 8000,
        DATABASE_URL: "postgresql://ticketuser:securepassword123@localhost:5432/ticketing",
        SECRET_KEY: "your-secret-key-here",
        ALGORITHM: "HS256",
        ACCESS_TOKEN_EXPIRE_MINUTES: "30"
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_file: "./logs/api-combined.log",
      time: true
    },
    {
      name: "ticketing-web",
      script: "npx",
      args: "serve -s frontend/build -l 3000 --single",
      cwd: "/home/eazie/ticketing-system",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "./logs/web-error.log",
      out_file: "./logs/web-out.log",
      log_file: "./logs/web-combined.log",
      time: true
    }
  ]
}; 