import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  fetchPersonalizedRecommendations,
  fetchSimilarBooks,
  fetchRecommendationModelHealth,
} from "../../services/recommendationService.js";
import recommendationModel from "../../recommendation/RecommendationModel.js";
import pool from "../../config/db.js";

const SAFE_STUDENT_KEYS = [
  "ISBN",
  "author",
  "book_id",
  "date",
  "genre",
  "image",
  "is_liked",
  "score",
  "status",
  "title",
].sort();

describe("Recommendation Service Integration Test", () => {
  before(async () => {
    await recommendationModel.load();
  });

  after(async () => {
    await pool.end();
  });

  test("fetchRecommendationModelHealth returns model diagnostics", async () => {
    const health = await fetchRecommendationModelHealth();
    assert.strictEqual(health.loaded, true);
    assert.strictEqual(health.numBooks, 400);
    assert.strictEqual(health.dimension, 384);
    assert.strictEqual(health.dtype, "float32");
  });

  test("fetchSimilarBooks returns sanitized recommendations without sensitive fields", async () => {
    const result = await fetchSimilarBooks({
      book_id: 1,
      user: { student_id: 10 },
      limit: 3,
    });

    assert.ok(result !== null);
    assert.strictEqual(result.sourceBookId, 1);
    assert.strictEqual(result.strategy, "similar_content");
    assert.ok(Array.isArray(result.recommendations));
    assert.ok(result.recommendations.length <= 3);

    for (const book of result.recommendations) {
      assert.notStrictEqual(book.book_id, 1); // Source book must be excluded
      assert.ok(typeof book.score === "number");
      assert.ok(typeof book.is_liked === "boolean");

      // Verify no confidential data is exposed
      assert.strictEqual(book.shelf_location, undefined);
      assert.strictEqual(book.total_copies, undefined);
      assert.strictEqual(book.total_copy, undefined);
      assert.strictEqual(book.available_copies, undefined);
      assert.strictEqual(book.issued_copy, undefined);

      const actualKeys = Object.keys(book).sort();
      assert.deepStrictEqual(actualKeys, SAFE_STUDENT_KEYS);
    }
  });

  test("fetchPersonalizedRecommendations rejects requests missing student_id with 403", async () => {
    await assert.rejects(
      async () => {
        await fetchPersonalizedRecommendations({
          user: { id: 1, role: "Admin" }, // No student_id
          page: 1,
          limit: 5,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  test("fetchPersonalizedRecommendations returns paginated recommendations for valid student", async () => {
    const result = await fetchPersonalizedRecommendations({
      user: { student_id: 1 },
      page: 1,
      limit: 4,
    });

    assert.ok(result !== null);
    assert.strictEqual(result.page, 1);
    assert.strictEqual(result.limit, 4);
    assert.ok(["personalized_content", "popular_content_fallback"].includes(result.strategy));
    assert.ok(Array.isArray(result.recommendations));
    assert.ok(result.recommendations.length <= 4);

    for (const book of result.recommendations) {
      assert.ok(typeof book.score === "number");
      assert.ok(typeof book.is_liked === "boolean");

      // Ensure no sensitive fields
      assert.strictEqual(book.shelf_location, undefined);
      assert.strictEqual(book.total_copies, undefined);
      assert.strictEqual(book.available_copies, undefined);

      const actualKeys = Object.keys(book).sort();
      assert.deepStrictEqual(actualKeys, SAFE_STUDENT_KEYS);
    }
  });
});
