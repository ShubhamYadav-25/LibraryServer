import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  dotProduct,
  vectorNorm,
  cosineSimilarity,
  normalizeVector,
  addWeightedEmbedding,
} from "../../recommendation/Similarity.js";

describe("Similarity Utilities", () => {
  test("dotProduct computes exact sum of element-wise products", () => {
    const v1 = new Float32Array([1, 2, 3]);
    const matrix = new Float32Array([0, 0, 4, 5, 6, 0]);
    const offset = 2;
    const dimension = 3;

    const result = dotProduct(v1, matrix, offset, dimension);
    assert.strictEqual(result, 1 * 4 + 2 * 5 + 3 * 6); // 4 + 10 + 18 = 32
  });

  test("vectorNorm calculates Euclidean norm", () => {
    const v = new Float32Array([3, 4]);
    assert.strictEqual(vectorNorm(v), 5);

    const zero = new Float32Array([0, 0, 0]);
    assert.strictEqual(vectorNorm(zero), 0);
  });

  test("cosineSimilarity returns 1 for identical vectors and 0 for orthogonal vectors", () => {
    const v1 = new Float32Array([1, 0, 0]);
    const matrix = new Float32Array([
      1, 0, 0, // identical -> index 0 (offset 0)
      0, 1, 0, // orthogonal -> index 1 (offset 3)
      -1, 0, 0 // opposite -> index 2 (offset 6)
    ]);

    const simIdentical = cosineSimilarity(v1, matrix, 0, 3);
    assert.ok(Math.abs(simIdentical - 1.0) < 1e-6);

    const simOrthogonal = cosineSimilarity(v1, matrix, 3, 3);
    assert.ok(Math.abs(simOrthogonal - 0.0) < 1e-6);

    const simOpposite = cosineSimilarity(v1, matrix, 6, 3);
    assert.ok(Math.abs(simOpposite - (-1.0)) < 1e-6);
  });

  test("normalizeVector scales vector to unit length and handles zero vector safely", () => {
    const v = new Float32Array([3, 4]);
    const normalized = normalizeVector(v);
    assert.ok(normalized !== null);
    assert.ok(Math.abs(vectorNorm(normalized) - 1.0) < 1e-6);
    assert.ok(Math.abs(normalized[0] - 0.6) < 1e-6);
    assert.ok(Math.abs(normalized[1] - 0.8) < 1e-6);

    const zero = new Float32Array([0, 0, 0]);
    assert.strictEqual(normalizeVector(zero), null);
  });

  test("addWeightedEmbedding correctly accumulates weighted embeddings into target vector", () => {
    const accumulator = new Float32Array([1, 1, 1]);
    const embeddings = new Float32Array([0, 0, 2, 4, 6]);
    const index = 1;
    const dimension = 3;
    const offset = 2; // index * dimension = 1 * 2 if offset=2 in slice
    const weight = 2.5;

    // embeddings array has offset = 1 * 3 = index * dimension
    const matrix = new Float32Array([
      0, 0, 0,    // index 0
      2, 4, 6     // index 1
    ]);

    addWeightedEmbedding({
      accumulator,
      embeddings: matrix,
      index: 1,
      dimension: 3,
      weight,
    });

    assert.strictEqual(accumulator[0], 1 + 2 * 2.5); // 6
    assert.strictEqual(accumulator[1], 1 + 4 * 2.5); // 11
    assert.strictEqual(accumulator[2], 1 + 6 * 2.5); // 16
  });
});
