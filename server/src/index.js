require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const { runMigrations } = require('./migrations');
const { validateEnv } = require('./config/env');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    validateEnv();
    await sequelize.authenticate();
    await runMigrations();
    console.log('Database connected');

    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to database:', error);
    process.exit(1);
  }
}

start();
