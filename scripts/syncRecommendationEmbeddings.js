#!/usr/bin/env node

import { syncRecommendationModel } from "../src/recommendation/SyncRecommendationModel.js";
import pool from "../src/config/db.js";

const run = async () => {
  console.log("==================================================");
  console.log("Starting Recommendation Model Catalog Synchronization...");
  console.log("==================================================");

  const force = process.argv.includes("--force");

  try {
    const startTime = Date.now();
    const result = await syncRecommendationModel({ force });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("Sync Status:", result.changed ? "UPDATED" : "IN_SYNC");
    console.log(`Total Books Indexed: ${result.totalBooks}`);
    console.log(`Existing Retained:   ${result.retainedCount}`);
    console.log(`Newly Added:         ${result.addedCount}`);
    console.log(`Pruned / Removed:    ${result.removedCount}`);
    console.log(`Duration:            ${duration}s`);
    console.log(`Message:             ${result.message}`);
    console.log("==================================================");
  } catch (error) {
    console.error("❌ Synchronization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
