import cron from "node-cron";
import { runEngine } from "../services/user/engine";

cron.schedule("* * * * * *", async () => {
    runEngine()
});