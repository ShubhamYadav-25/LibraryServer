import recommendationModel from "../recommendation/RecommendationModel.js";
import { buildStudentProfile } from "../recommendation/ProfileBuilder.js";
import { popularFallback, rankFromProfile } from "../recommendation/RecommendationRanker.js";
import { formatRecommendationList } from "../recommendation/RecommendationFormatter.js";
import * as recommendationRepository from "../repositories/recommendationRepository.js";
import ApiError from "../utils/errorHandler.js";

const DEFAULT_LIMIT = 35;
const MAX_LIMIT = 50;
const RECOMMENDATION_POOL_SIZE = 50;

const getSafeLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
};

const getSafePage = (page) => {
  const parsed = Number(page);
  if (!Number.isInteger(parsed) || parsed <= 0) return 1;
  return parsed;
};

const ensureModelLoaded = async () => {
  try {
    await recommendationModel.load();
  } catch (error) {
    throw new ApiError(500, `Recommendation model failed to load: ${error.message}`, false);
  }
};

const hydrateAndFormat = async ({ ranked, student_id }) => {
  const bookIds = ranked.map((item) => item.book_id);
  const [liveBooks, likedBooks] = await Promise.all([
    recommendationRepository.getBooksByIds(bookIds),
    recommendationRepository.getStudentLikedBooks(student_id),
  ]);

  return formatRecommendationList({
    ranked,
    liveBooks,
    likedBooks,
  });
};

export const fetchPersonalizedRecommendations = async ({ user, page = 1, limit = DEFAULT_LIMIT, offset: customOffset }) => {
  const student_id = user?.student_id || null;

  const safeLimit = getSafeLimit(limit);
  let pageNum = getSafePage(page);
  let offset = (pageNum - 1) * safeLimit;

  if (customOffset !== undefined && customOffset !== null) {
    const parsedOffset = Number(customOffset);
    if (Number.isInteger(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset;
      pageNum = Math.floor(offset / safeLimit) + 1;
    }
  }

  const candidateLimit = Math.max((offset + safeLimit) * 2, 70);

  await ensureModelLoaded();

  const interactions = await recommendationRepository.getStudentRecommendationSignals({
    student_id,
  });
  const profile = buildStudentProfile({ interactions, model: recommendationModel });

  let ranked = [];
  let strategy = "personalized_content";

  if (profile.vector) {
    ranked = rankFromProfile({
      model: recommendationModel,
      profileVector: profile.vector,
      limit: candidateLimit,
      excludeBookIds: profile.excludedBookIds,
    });
  } else {
    strategy = "popular_content_fallback";
    const popularCandidates = await recommendationRepository.getPopularBooksForRecommendation({
      limit: candidateLimit,
      excludeBookIds: [...profile.excludedBookIds],
    });

    ranked = popularFallback({
      model: recommendationModel,
      limit: candidateLimit,
      excludeBookIds: profile.excludedBookIds,
      popularCandidates,
    });
  }

  const hydrated = await hydrateAndFormat({
    ranked,
    student_id,
  });

  const pool = hydrated.slice(0, RECOMMENDATION_POOL_SIZE);
  const total = pool.length;
  const paginated = pool.slice(offset, offset + safeLimit);
  const totalPages = Math.ceil(total / safeLimit) || 1;
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    recommendations: paginated,
    page: pageNum,
    limit: safeLimit,
    offset,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    strategy,
    signalsUsed: profile.usedInteractions.length,
  };
};

export const fetchSimilarBooks = async ({ book_id, user, limit = DEFAULT_LIMIT, page = 1, offset: customOffset }) => {
  const safeLimit = getSafeLimit(limit);
  let pageNum = getSafePage(page);
  let offset = (pageNum - 1) * safeLimit;

  if (customOffset !== undefined && customOffset !== null) {
    const parsedOffset = Number(customOffset);
    if (Number.isInteger(parsedOffset) && parsedOffset >= 0) {
      offset = parsedOffset;
      pageNum = Math.floor(offset / safeLimit) + 1;
    }
  }

  await ensureModelLoaded();

  const index = recommendationModel.getBookIndex(book_id);
  if (index == null) {
    throw new ApiError(404, "Book is not available in the recommendation model.");
  }

  const sourceBookId = recommendationModel.getBookId(index) ?? book_id;
  const dimension = recommendationModel.artifacts.dimension;
  const vector = recommendationModel.artifacts.embeddings.subarray(
    index * dimension,
    (index + 1) * dimension
  );

  const candidateLimit = Math.max((offset + safeLimit) * 2, 70);

  const ranked = recommendationModel.findNearest(vector, {
    limit: candidateLimit,
    excludeBookIds: new Set([String(sourceBookId)]),
  });

  const hydrated = await hydrateAndFormat({
    ranked,
    student_id: user?.student_id || null,
  });

  const pool = hydrated.slice(0, RECOMMENDATION_POOL_SIZE);
  const total = pool.length;
  const paginated = pool.slice(offset, offset + safeLimit);
  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    sourceBookId,
    recommendations: paginated,
    page: pageNum,
    limit: safeLimit,
    offset,
    total,
    totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
    strategy: "similar_content",
  };
};

export const fetchRecommendationModelHealth = async () => {
  await ensureModelLoaded();
  return recommendationModel.getDiagnostics();
};
