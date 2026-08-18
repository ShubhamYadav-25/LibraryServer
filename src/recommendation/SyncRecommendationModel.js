import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "../config/db.js";
import recommendationModel from "./RecommendationModel.js";
import { loadRecommendationArtifacts } from "./EmbeddingLoader.js";
import { generateBookEmbeddings } from "./EmbeddingGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultModelDir = path.resolve(__dirname, "../recommendation_model");

/**
 * Fetches all active books with metadata from MySQL.
 */
export const fetchActiveCatalogFromDb = async (executor = pool) => {
  const [rows] = await executor.query(
    `
    SELECT
      v.book_id,
      v.title,
      v.ISBN,
      v.author,
      v.genre,
      bd.description,
      v.status
    FROM vw_books v
    LEFT JOIN book_details bd ON v.book_id = bd.book_id
    ORDER BY v.book_id ASC;
    `
  );
  return rows;
};

/**
 * Synchronizes the recommendation vector model with the current state of the database.
 * Preserves pre-computed vectors for existing books, generates embeddings for new books,
 * prunes deleted books, writes updated artifacts to disk, and hot-reloads the in-memory model.
 */
export const syncRecommendationModel = async ({
  modelDir = defaultModelDir,
  force = false,
  executor = pool,
} = {}) => {
  const activeBooks = await fetchActiveCatalogFromDb(executor);
  if (!Array.isArray(activeBooks) || activeBooks.length === 0) {
    throw new Error("No active books found in database to synchronize.");
  }

  let currentArtifacts = null;
  try {
    currentArtifacts = await loadRecommendationArtifacts(modelDir);
  } catch (error) {
    console.warn(`Could not load existing artifacts (${error.message}). Performing full rebuild.`);
  }

  const dimension = currentArtifacts?.dimension || 384;
  const currentIdMap = currentArtifacts?.bookIdToIndex || {};
  const currentEmbeddings = currentArtifacts?.embeddings;

  const dbBookIdSet = new Set(activeBooks.map((b) => String(b.book_id)));
  const existingIndexedIds = Object.keys(currentIdMap);

  const removedBookIds = existingIndexedIds.filter((id) => !dbBookIdSet.has(id));
  const newBooks = activeBooks.filter((b) => currentIdMap[String(b.book_id)] == null);
  const retainedBooks = activeBooks.filter((b) => currentIdMap[String(b.book_id)] != null);

  const hasChanges = removedBookIds.length > 0 || newBooks.length > 0;

  if (!hasChanges && !force && currentArtifacts) {
    return {
      changed: false,
      totalBooks: activeBooks.length,
      retainedCount: retainedBooks.length,
      addedCount: 0,
      removedCount: 0,
      message: "Recommendation model is already up to date with the database.",
    };
  }

  const totalBooks = activeBooks.length;
  const newEmbeddingsBuffer = new Float32Array(totalBooks * dimension);
  const newBookIdToIndex = {};
  const newIsbnToIndex = {};

  let targetIndex = 0;

  // 1. Copy retained book embeddings directly from vector cache
  for (const book of retainedBooks) {
    const oldIndex = currentIdMap[String(book.book_id)];
    if (currentEmbeddings && Number.isInteger(oldIndex)) {
      const srcOffset = oldIndex * dimension;
      const oldVector = currentEmbeddings.subarray(srcOffset, srcOffset + dimension);
      newEmbeddingsBuffer.set(oldVector, targetIndex * dimension);
    }

    newBookIdToIndex[String(book.book_id)] = targetIndex;
    if (book.ISBN) {
      newIsbnToIndex[String(book.ISBN)] = targetIndex;
    }
    targetIndex++;
  }

  // 2. Generate embeddings for newly added books
  if (newBooks.length > 0) {
    const newGeneratedVectors = await generateBookEmbeddings(newBooks, dimension);

    for (let i = 0; i < newBooks.length; i++) {
      const book = newBooks[i];
      const vectorSlice = newGeneratedVectors.subarray(i * dimension, (i + 1) * dimension);
      newEmbeddingsBuffer.set(vectorSlice, targetIndex * dimension);

      newBookIdToIndex[String(book.book_id)] = targetIndex;
      if (book.ISBN) {
        newIsbnToIndex[String(book.ISBN)] = targetIndex;
      }
      targetIndex++;
    }
  }

  // 3. Write updated artifacts to disk
  await fs.mkdir(modelDir, { recursive: true });

  const embeddingsInfo = {
    rows: totalBooks,
    dimension,
    dtype: "float32",
    normalized: true,
  };

  const modelInfo = {
    model_name: "sentence-transformers/all-MiniLM-L6-v2",
    embedding_dimension: dimension,
    number_of_books: totalBooks,
    last_synced_at: new Date().toISOString(),
    similarity: "cosine",
  };

  // Convert Float32Array to Node.js Buffer for binary write
  const rawBytes = Buffer.from(
    newEmbeddingsBuffer.buffer,
    newEmbeddingsBuffer.byteOffset,
    newEmbeddingsBuffer.byteLength
  );

  await Promise.all([
    fs.writeFile(path.join(modelDir, "books_embeddings.bin"), rawBytes),
    fs.writeFile(path.join(modelDir, "book_id_to_index.json"), JSON.stringify(newBookIdToIndex, null, 2)),
    fs.writeFile(path.join(modelDir, "isbn_to_index.json"), JSON.stringify(newIsbnToIndex, null, 2)),
    fs.writeFile(path.join(modelDir, "embeddings_info.json"), JSON.stringify(embeddingsInfo, null, 2)),
    fs.writeFile(path.join(modelDir, "model_info.json"), JSON.stringify(modelInfo, null, 2)),
  ]);

  // 4. Hot-reload the in-memory singleton
  await recommendationModel.reload();

  return {
    changed: true,
    totalBooks,
    retainedCount: retainedBooks.length,
    addedCount: newBooks.length,
    removedCount: removedBookIds.length,
    timestamp: modelInfo.last_synced_at,
    message: `Recommendation model successfully synchronized (${newBooks.length} added, ${removedBookIds.length} removed).`,
  };
};
