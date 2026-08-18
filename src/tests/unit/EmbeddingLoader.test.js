import { test, describe } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRecommendationArtifacts } from "../../recommendation/EmbeddingLoader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultModelDir = path.resolve(__dirname, "../../recommendation_model");

describe("EmbeddingLoader", () => {
  test("successfully loads model artifacts without requiring books_metadata.json", async () => {
    const artifacts = await loadRecommendationArtifacts(defaultModelDir);

    assert.ok(artifacts !== null);
    assert.strictEqual(typeof artifacts.numBooks, "number");
    assert.strictEqual(typeof artifacts.dimension, "number");
    assert.strictEqual(artifacts.numBooks, 400);
    assert.strictEqual(artifacts.dimension, 384);

    assert.ok(artifacts.embeddings instanceof Float32Array);
    assert.strictEqual(artifacts.embeddings.length, 400 * 384);

    assert.strictEqual(typeof artifacts.bookIdToIndex, "object");
    assert.ok(Array.isArray(artifacts.indexToBookId));
    assert.strictEqual(artifacts.indexToBookId.length, 400);

    // Verify index mapping consistency
    const firstBookId = artifacts.indexToBookId[0];
    assert.strictEqual(artifacts.bookIdToIndex[String(firstBookId)], 0);
  });
});
