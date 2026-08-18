import path from "node:path";
import { fileURLToPath } from "node:url";
import { cosineSimilarity, dotProduct } from "./Similarity.js";
import { loadRecommendationArtifacts } from "./EmbeddingLoader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultModelDir = path.resolve(__dirname, "../recommendation_model");

class RecommendationModel {
  constructor(modelDir = defaultModelDir) {
    this.modelDir = modelDir;
    this.artifacts = null;
    this.loadPromise = null;
  }

  async load() {
    if (this.artifacts) return this.artifacts;

    if (!this.loadPromise) {
      this.loadPromise = loadRecommendationArtifacts(this.modelDir)
        .then((artifacts) => {
          this.artifacts = artifacts;
          return artifacts;
        })
        .catch((error) => {
          this.loadPromise = null;
          throw error;
        });
    }

    return this.loadPromise;
  }

  async reload() {
    this.loadPromise = null;
    const newArtifacts = await loadRecommendationArtifacts(this.modelDir);
    this.artifacts = newArtifacts;
    return this.artifacts;
  }

  isLoaded() {
    return Boolean(this.artifacts);
  }

  getDiagnostics() {
    const artifacts = this.artifacts;
    if (!artifacts) {
      return {
        loaded: false,
        modelDir: this.modelDir,
      };
    }

    return {
      loaded: true,
      modelDir: this.modelDir,
      numBooks: artifacts.numBooks,
      dimension: artifacts.dimension,
      dtype: artifacts.embeddingsInfo?.dtype || "float32",
      normalized: artifacts.normalized,
      modelInfo: artifacts.modelInfo,
      trainingConfig: artifacts.trainingConfig,
    };
  }

  getBookIndex(bookId) {
    const key = String(bookId);
    const index = this.artifacts?.bookIdToIndex?.[key];
    return Number.isInteger(index) ? index : null;
  }

  getBookId(index) {
    if (!Number.isInteger(index) || index < 0) return null;
    return this.artifacts?.indexToBookId?.[index] ?? null;
  }

  getIsbnIndex(isbn) {
    const key = String(isbn);
    const index = this.artifacts?.isbnToIndex?.[key];
    return Number.isInteger(index) ? index : null;
  }

  scoreVector(vector, index) {
    const { embeddings, dimension, normalized } = this.artifacts;
    const offset = index * dimension;
    return normalized
      ? dotProduct(vector, embeddings, offset, dimension)
      : cosineSimilarity(vector, embeddings, offset, dimension);
  }

  findNearest(vector, { limit, excludeBookIds = new Set() } = {}) {
    const { numBooks, indexToBookId } = this.artifacts;
    const results = [];

    for (let index = 0; index < numBooks; index += 1) {
      const bookId = indexToBookId[index];
      if (bookId == null || excludeBookIds.has(String(bookId))) continue;

      results.push({
        index,
        book_id: bookId,
        score: this.scoreVector(vector, index),
      });
    }

    results.sort((left, right) => right.score - left.score);
    return typeof limit === "number" && limit > 0 ? results.slice(0, limit) : results;
  }
}

const recommendationModel = new RecommendationModel();

export default recommendationModel;
export { RecommendationModel };
