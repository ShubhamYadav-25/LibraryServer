import { addWeightedEmbedding, normalizeVector } from "./Similarity.js";

export const buildStudentProfile = ({ interactions = [], model }) => {
  if (!model?.artifacts) {
    throw new Error("Recommendation model artifacts must be loaded before building a profile.");
  }

  const { embeddings, dimension } = model.artifacts;
  const profile = new Float32Array(dimension);
  const excludedBookIds = new Set();
  const usedInteractions = [];
  let totalWeight = 0;

  for (const interaction of (interactions || [])) {
    const bookId = interaction.book_id;
    if (bookId != null) {
      excludedBookIds.add(String(bookId));
    }

    const index = model.getBookIndex(bookId);
    const weight = Number(interaction.weight);

    if (index == null || !Number.isFinite(weight) || weight <= 0) continue;

    addWeightedEmbedding({
      accumulator: profile,
      embeddings,
      index,
      dimension,
      weight,
    });

    totalWeight += weight;
    usedInteractions.push({
      book_id: bookId,
      source: interaction.source,
      weight,
    });
  }

  return {
    vector: normalizeVector(profile),
    excludedBookIds,
    usedInteractions,
    totalWeight,
  };
};
