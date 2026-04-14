// src/cron/cleanupTokens.job.js

import cron from "node-cron";
import { deleteExpiredTokens } from "../services/token.service.js";

// runs every day at midnight
export const startTokenCleanupJob = () => {
    cron.schedule("0 0 * * *", async () => {
        console.log("Running token cleanup job...");
        await deleteExpiredTokens();
    });
};