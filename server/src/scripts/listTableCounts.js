const { sequelize } = require('../models');
const models = require('../models');

(async function() {
  try {
    const out = {};
    for (const key of Object.keys(models)) {
      if (key === 'sequelize') continue;
      const model = models[key];
      if (model && typeof model.count === 'function') {
        try {
          const cnt = await model.count();
          out[key] = cnt;
        } catch (err) {
          out[key] = `error: ${err.message}`;
        }
      }
    }
    console.log(JSON.stringify(out, null, 2));
    await sequelize.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
