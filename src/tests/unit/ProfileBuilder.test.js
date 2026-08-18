import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import recommendationModel from "../../recommendation/RecommendationModel.js";
import { buildStudentProfile } from "../../recommendation/ProfileBuilder.js";

describe("ProfileBuilder", () => {
  before(async () => {
    await recommendationModel.load();
  });

  test("builds normalized profile vector from multiple weighted student signals", () => {
    const interactions = [
      { book_id: 1, weight: 3.5, source: "like" },
      { book_id: 2, weight: 4.0, source: "rating" },
      { book_id: 3, weight: 2.0, source: "request" },
      { book_id: 4, weight: 1.5, source: "issue" },
    ];

    const profile = buildStudentProfile({
      interactions,
      model: recommendationModel,
    });

    assert.ok(profile.vector instanceof Float32Array);
    assert.strictEqual(profile.vector.length, recommendationModel.artifacts.dimension);
    assert.strictEqual(profile.usedInteractions.length, 4);
    assert.strictEqual(profile.totalWeight, 3.5 + 4.0 + 2.0 + 1.5);

    // Verify all interacted books are added to excludedBookIds
    assert.strictEqual(profile.excludedBookIds.has("1"), true);
    assert.strictEqual(profile.excludedBookIds.has("2"), true);
    assert.strictEqual(profile.excludedBookIds.has("3"), true);
    assert.strictEqual(profile.excludedBookIds.has("4"), true);
  });

  test("returns null vector for empty interactions or zero weights (cold start)", () => {
    const profile = buildStudentProfile({
      interactions: [],
      model: recommendationModel,
    });

    assert.strictEqual(profile.vector, null);
    assert.strictEqual(profile.totalWeight, 0);
    assert.strictEqual(profile.excludedBookIds.size, 0);
  });

  test("handles negative rating exclusion signal (weight = 0)", () => {
    const interactions = [
      { book_id: 99, weight: 0, source: "rating", exclude_only: 1 },
    ];

    const profile = buildStudentProfile({
      interactions,
      model: recommendationModel,
    });

    assert.strictEqual(profile.vector, null);
    assert.strictEqual(profile.excludedBookIds.has("99"), true);
    assert.strictEqual(profile.usedInteractions.length, 0);
  });
});
