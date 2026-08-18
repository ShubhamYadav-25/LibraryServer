import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import recommendationModel, { RecommendationModel } from "../../recommendation/RecommendationModel.js";

describe("RecommendationModel", () => {
  before(async () => {
    await recommendationModel.load();
  });

  test("model loads properly and reports healthy diagnostics", () => {
    assert.ok(recommendationModel.isLoaded());
    const diagnostics = recommendationModel.getDiagnostics();
    assert.strictEqual(diagnostics.loaded, true);
    assert.strictEqual(diagnostics.numBooks, 400);
    assert.strictEqual(diagnostics.dimension, 384);
    assert.strictEqual(diagnostics.dtype, "float32");
  });

  test("getBookIndex and getBookId provide bidirectional lookups", () => {
    const bookId = 1;
    const index = recommendationModel.getBookIndex(bookId);
    assert.ok(Number.isInteger(index));
    assert.strictEqual(index, 0);

    const mappedBackId = recommendationModel.getBookId(index);
    assert.strictEqual(Number(mappedBackId), bookId);
  });

  test("findNearest returns nearest neighbors excluding specified book IDs", () => {
    const bookId = 1;
    const index = recommendationModel.getBookIndex(bookId);
    const dimension = recommendationModel.artifacts.dimension;
    const bookVector = recommendationModel.artifacts.embeddings.subarray(
      index * dimension,
      (index + 1) * dimension
    );

    const excludeSet = new Set([String(bookId)]);
    const nearest = recommendationModel.findNearest(bookVector, {
      limit: 5,
      excludeBookIds: excludeSet,
    });

    assert.ok(Array.isArray(nearest));
    assert.strictEqual(nearest.length, 5);
    // Ensure the source book was excluded
    for (const item of nearest) {
      assert.notStrictEqual(String(item.book_id), String(bookId));
      assert.ok(typeof item.score === "number");
    }
    // Verify descending sort order
    for (let i = 0; i < nearest.length - 1; i++) {
      assert.ok(nearest[i].score >= nearest[i + 1].score);
    }
  });

  test("reload() method hot-reloads the artifacts without breaking lookups", async () => {
    const reloaded = await recommendationModel.reload();
    assert.ok(reloaded !== null);
    assert.strictEqual(recommendationModel.isLoaded(), true);
    assert.strictEqual(recommendationModel.getBookIndex(1), 0);
  });
});
