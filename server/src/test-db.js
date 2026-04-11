const sequelize = require('./config/db');

sequelize.authenticate()
  .then(() => {
    console.log('Database connection successful');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });