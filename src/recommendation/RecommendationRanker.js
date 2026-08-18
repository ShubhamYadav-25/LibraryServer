export const popularFallback = ({
  model,
  limit = 10,
  excludeBookIds = new Set(),
  popularCandidates = [],
}) => {
  if (Array.isArray(popularCandidates) && popularCandidates.length > 0) {
    return popularCandidates
      .filter((candidate) => candidate?.book_id != null && !excludeBookIds.has(String(candidate.book_id)))
      .map((candidate, idx) => ({
        book_id: candidate.book_id,
        score: Number(candidate.like_count || candidate.score || (1 / (idx + 1))),
      }))
      .slice(0, limit);
  }

  const { numBooks, indexToBookId } = model.artifacts;
  const results = [];

  for (let index = 0; index < numBooks; index += 1) {
    const bookId = indexToBookId[index];
    if (bookId == null || excludeBookIds.has(String(bookId))) continue;

    results.push({
      index,
      book_id: bookId,
      score: 1.0 / (results.length + 1),
    });

    if (results.length >= limit) break;
  }

  return results;
};

export const rankFromProfile = ({ model, profileVector, limit, excludeBookIds }) => {
  return model.findNearest(profileVector, {
    limit,
    excludeBookIds,
  });
};
