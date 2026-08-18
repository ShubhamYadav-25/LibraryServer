import recommendationModel from "../recommendation/RecommendationModel.js";

export const checkRecommendationModelHealth = async () => {
  try {
    await recommendationModel.load();
    const diagnostics = recommendationModel.getDiagnostics();
    console.log(
      `Recommendation model ready: ${diagnostics.numBooks} books x ${diagnostics.dimension}`
    );
    return diagnostics;
  } catch (error) {
    console.error("Recommendation model health check failed:", error);
    return null;
  }
};
