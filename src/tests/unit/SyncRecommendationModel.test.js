import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { syncRecommendationModel } from "../../recommendation/SyncRecommendationModel.js";
import pool from "../../config/db.js";

describe("SyncRecommendationModel", () => {
  let tempModelDir;

  after(async () => {
    if (tempModelDir) {
      try {
        await fs.rm(tempModelDir, { recursive: true, force: true });
      } catch (err) {
        // ignore cleanup error
      }
    }
    await pool.end();
  });

  test("synchronizes database catalog into artifacts and reloads model in memory", async () => {
    tempModelDir = await fs.mkdtemp(path.join(os.tmpdir(), "rec_test_model_"));

    // 1. Run sync into the temp directory
    const result = await syncRecommendationModel({
      modelDir: tempModelDir,
      force: true,
    });

    assert.ok(result !== null);
    assert.strictEqual(result.changed, true);
    assert.ok(result.totalBooks > 0);
    assert.ok(result.addedCount > 0);

    // 2. Verify all artifact files were generated on disk
    const binExists = await fs.stat(path.join(tempModelDir, "books_embeddings.bin"));
    const idMapExists = await fs.stat(path.join(tempModelDir, "book_id_to_index.json"));
    const infoExists = await fs.stat(path.join(tempModelDir, "embeddings_info.json"));
    const modelInfoExists = await fs.stat(path.join(tempModelDir, "model_info.json"));

    assert.ok(binExists.size > 0);
    assert.ok(idMapExists.size > 0);
    assert.ok(infoExists.size > 0);
    assert.ok(modelInfoExists.size > 0);

    // 3. Second run without force should detect no changes
    const idempotentResult = await syncRecommendationModel({
      modelDir: tempModelDir,
      force: false,
    });

    assert.strictEqual(idempotentResult.changed, false);
    assert.strictEqual(idempotentResult.addedCount, 0);
    assert.strictEqual(idempotentResult.removedCount, 0);
  });
});
