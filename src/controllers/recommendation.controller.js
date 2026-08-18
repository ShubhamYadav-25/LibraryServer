import {
  fetchPersonalizedRecommendations,
  fetchRecommendationModelHealth,
  fetchSimilarBooks,
} from "../services/recommendationService.js";
import { catchAsync } from "../utils/errorHandler.js";

export const get_recommendations = catchAsync(async (req, res) => {
  const user = req.user || null;
  const { page, limit, offset } = req.query;

  const data = await fetchPersonalizedRecommendations({
    user,
    page,
    limit,
    offset,
  });

  res.status(200).json(data);
});

export const get_similar_books = catchAsync(async (req, res) => {
  const { limit, page, offset } = req.query;
  const { bookId } = req.params;

  const data = await fetchSimilarBooks({
    book_id: bookId,
    user: req.user || null,
    limit,
    page,
    offset,
  });

  res.status(200).json(data);
});

export const get_recommendation_model_health = catchAsync(async (req, res) => {
  const data = await fetchRecommendationModelHealth();
  res.status(200).json(data);
});
