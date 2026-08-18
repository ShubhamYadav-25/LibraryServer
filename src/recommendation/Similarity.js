export const dotProduct = (vector, matrix, offset, dimension) => {
  let score = 0;
  for (let i = 0; i < dimension; i += 1) {
    score += vector[i] * matrix[offset + i];
  }
  return score;
};

export const vectorNorm = (vector, offset = 0, dimension = vector.length) => {
  let sum = 0;
  for (let i = 0; i < dimension; i += 1) {
    const value = vector[offset + i];
    sum += value * value;
  }
  return Math.sqrt(sum);
};

export const cosineSimilarity = (vector, matrix, offset, dimension) => {
  const numerator = dotProduct(vector, matrix, offset, dimension);
  const leftNorm = vectorNorm(vector);
  const rightNorm = vectorNorm(matrix, offset, dimension);

  if (leftNorm === 0 || rightNorm === 0) return 0;
  return numerator / (leftNorm * rightNorm);
};

export const normalizeVector = (vector) => {
  const norm = vectorNorm(vector);
  if (norm === 0) return null;

  for (let i = 0; i < vector.length; i += 1) {
    vector[i] /= norm;
  }

  return vector;
};

export const addWeightedEmbedding = ({
  accumulator,
  embeddings,
  index,
  dimension,
  weight,
}) => {
  const offset = index * dimension;
  for (let i = 0; i < dimension; i += 1) {
    accumulator[i] += embeddings[offset + i] * weight;
  }
};
