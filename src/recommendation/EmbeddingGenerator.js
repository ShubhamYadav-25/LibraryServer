import { normalizeVector } from "./Similarity.js";

const DEFAULT_DIMENSION = 384;

/**
 * Deterministic text feature projection.
 * Generates a normalized 384-dimensional dense float32 vector based on
 * word tokens, character trigrams, and lexical features.
 */
export const generateDeterministicEmbedding = (text, dimension = DEFAULT_DIMENSION) => {
  const vector = new Float32Array(dimension);
  if (!text || typeof text !== "string" || text.trim() === "") {
    return vector;
  }

  const cleanText = text.toLowerCase().trim();
  const words = cleanText.split(/\s+/);

  // 1. Word token projections with positional weighting
  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const word = words[wIdx];
    const wordWeight = 1.0 / Math.sqrt(wIdx + 1);

    let h1 = 0x811c9dc5;
    let h2 = 0x5bd1e995;

    for (let i = 0; i < word.length; i++) {
      const code = word.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 0x01000193);
      h2 = Math.imul(h2 ^ code, 0x5bd1e995);
    }

    const idx1 = Math.abs(h1) % dimension;
    const idx2 = Math.abs(h2) % dimension;
    const sign1 = (h1 & 1) === 0 ? 1 : -1;
    const sign2 = (h2 & 1) === 0 ? 1 : -1;

    vector[idx1] += sign1 * wordWeight * 1.5;
    vector[idx2] += sign2 * wordWeight * 1.2;

    // 2. Character n-grams (3-grams) for subword semantic capture
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        const trigram = word.substring(i, i + 3);
        let th = 0x811c9dc5;
        for (let j = 0; j < 3; j++) {
          th = Math.imul(th ^ trigram.charCodeAt(j), 0x01000193);
        }
        const tIdx = Math.abs(th) % dimension;
        const tSign = (th & 1) === 0 ? 1 : -1;
        vector[tIdx] += tSign * 0.4;
      }
    }
  }

  const normalized = normalizeVector(vector);
  return normalized || vector;
};

/**
 * Builds standard textual representation for embedding a book.
 */
export const buildBookEmbeddingText = (book) => {
  const parts = [];
  if (book.title) parts.push(`Title: ${book.title}`);
  if (book.author) parts.push(`Author: ${book.author}`);
  if (book.genre) parts.push(`Genre: ${book.genre}`);
  if (book.description) parts.push(`Description: ${book.description}`);
  return parts.join(". ");
};

/**
 * Batch generates 384-dimensional dense embeddings for a list of book records.
 */
export const generateBookEmbeddings = async (books = [], dimension = DEFAULT_DIMENSION) => {
  const embeddings = new Float32Array(books.length * dimension);

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const text = buildBookEmbeddingText(book);
    const vector = generateDeterministicEmbedding(text, dimension);
    embeddings.set(vector, i * dimension);
  }

  return embeddings;
};
