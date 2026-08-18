import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  generateDeterministicEmbedding,
  buildBookEmbeddingText,
  generateBookEmbeddings,
} from "../../recommendation/EmbeddingGenerator.js";
import { vectorNorm, cosineSimilarity } from "../../recommendation/Similarity.js";

describe("EmbeddingGenerator", () => {
  test("generates normalized 384-dimensional dense vectors", () => {
    const text = "Clean Code by Robert Martin. Software Engineering principles.";
    const vector = generateDeterministicEmbedding(text, 384);

    assert.ok(vector instanceof Float32Array);
    assert.strictEqual(vector.length, 384);

    const norm = vectorNorm(vector);
    assert.ok(Math.abs(norm - 1.0) < 1e-4);
  });

  test("semantically similar texts produce higher cosine similarity than unrelated texts", () => {
    const text1 = "Introduction to Algorithms, Data Structures and Complexity Analysis";
    const text2 = "Algorithms and Data Structures in C++ and Java";
    const textUnrelated = "Cooking Recipes: Italian Pasta, Pizza, and Gourmet Desserts";

    const v1 = generateDeterministicEmbedding(text1, 384);
    const v2 = generateDeterministicEmbedding(text2, 384);
    const vUnrelated = generateDeterministicEmbedding(textUnrelated, 384);

    const simRelated = cosineSimilarity(v1, v2, 0, 384);
    const simUnrelated = cosineSimilarity(v1, vUnrelated, 0, 384);

    assert.ok(simRelated > simUnrelated, `Expected ${simRelated} > ${simUnrelated}`);
  });

  test("generateBookEmbeddings batches vectors for multiple books into single Float32 buffer", async () => {
    const books = [
      { title: "Book A", author: "Author A", genre: "Fiction", description: "A fiction story" },
      { title: "Book B", author: "Author B", genre: "Tech", description: "A technical guide" },
    ];

    const matrix = await generateBookEmbeddings(books, 384);
    assert.strictEqual(matrix.length, 2 * 384);

    // Verify first book vector is normalized
    const v0 = matrix.subarray(0, 384);
    assert.ok(Math.abs(vectorNorm(v0) - 1.0) < 1e-4);

    // Verify second book vector is normalized
    const v1 = matrix.subarray(384, 768);
    assert.ok(Math.abs(vectorNorm(v1) - 1.0) < 1e-4);
  });
});
