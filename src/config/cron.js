import cron from "node-cron";

cron.schedule("* * * * * *", () => {
  require("../services/user/engine");
});

cron.schedule("* * * * *", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("1m");
});

cron.schedule("*/5 * * * *", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("5m");
});

cron.schedule("*/15 * * * *", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("15m");
});

cron.schedule("*/30 * * * *", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("30m");
});

cron.schedule("0 * * * *", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("1h");
});

cron.schedule("0 */4 * * *", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("4h");
});

cron.schedule("0 0 * * *", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("1d");
});

cron.schedule("0 0 * * 0", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("1W");
});

cron.schedule("0 0 1 * *", (date) => {
  require("../controllers/chart/chart.controller").redisToDB("1M");
});

cron.schedule("*/10 * * * * *", (date) => {
  require("../controllers/user/cron_jobs").depthData();
});

cron.schedule(
  "*/5 * * * * *",
  () => {
    require("../controllers/user/binance").checkOrder();
  },
  {
    scheduled: false,
  }
);
