import fs from "node:fs/promises";
import path from "node:path";

const FLOAT32_BYTES = Float32Array.BYTES_PER_ELEMENT;

const readJson = async (filePath, optional = false) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (optional && error.code === "ENOENT") return null;
    throw new Error(`Unable to load recommendation artifact ${path.basename(filePath)}: ${error.message}`);
  }
};

const getPositiveInteger = (...values) => {
  for (const value of values) {
    if (Number.isInteger(value) && value > 0) return value;
  }
  return null;
};

const getShapeValue = (shape, index) => {
  if (!Array.isArray(shape)) return null;
  const value = Number(shape[index]);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const validateIndexMap = (map, mapName, numBooks) => {
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    throw new Error(`${mapName} must be a JSON object`);
  }

  for (const [key, value] of Object.entries(map)) {
    if (!Number.isInteger(value) || value < 0 || value >= numBooks) {
      throw new Error(`${mapName} contains invalid index for key ${key}`);
    }
  }
};

const buildIndexToIdArray = (idToIndexMap, numBooks) => {
  const indexToId = new Array(numBooks).fill(null);
  for (const [id, index] of Object.entries(idToIndexMap)) {
    const numId = Number(id);
    indexToId[index] = Number.isInteger(numId) ? numId : id;
  }
  return indexToId;
};

const createFloat32View = (buffer) => {
  if (buffer.byteLength === 0) {
    throw new Error("books_embeddings.bin is empty");
  }

  if (buffer.byteLength % FLOAT32_BYTES !== 0) {
    throw new Error("books_embeddings.bin byte length is not aligned to float32 values");
  }

  const floatCount = buffer.byteLength / FLOAT32_BYTES;

  if (buffer.byteOffset % FLOAT32_BYTES === 0) {
    return new Float32Array(buffer.buffer, buffer.byteOffset, floatCount);
  }

  const aligned = new Uint8Array(buffer.byteLength);
  aligned.set(buffer);
  return new Float32Array(aligned.buffer);
};

export const loadRecommendationArtifacts = async (modelDir) => {
  const embeddingsInfo = await readJson(path.join(modelDir, "embeddings_info.json"));
  const bookIdToIndex = await readJson(path.join(modelDir, "book_id_to_index.json"));
  const isbnToIndex = await readJson(path.join(modelDir, "isbn_to_index.json"), true);
  const modelInfo = await readJson(path.join(modelDir, "model_info.json"), true);
  const trainingConfig = await readJson(path.join(modelDir, "training_config.json"), true);
  const embeddingsBuffer = await fs.readFile(path.join(modelDir, "books_embeddings.bin"));

  const numBooks = getPositiveInteger(
    Number(embeddingsInfo?.num_books),
    Number(embeddingsInfo?.number_of_books),
    Number(embeddingsInfo?.rows),
    getShapeValue(embeddingsInfo?.shape, 0),
    Object.keys(bookIdToIndex || {}).length
  );

  const dimension = getPositiveInteger(
    Number(embeddingsInfo?.embedding_dimension),
    Number(embeddingsInfo?.dimension),
    getShapeValue(embeddingsInfo?.shape, 1),
    Number(modelInfo?.embedding_dimension)
  );

  if (!numBooks || !dimension) {
    throw new Error("embeddings_info.json does not define a valid matrix shape");
  }

  if (String(embeddingsInfo?.dtype || "").toLowerCase() !== "float32") {
    throw new Error(`Unsupported embedding dtype: ${embeddingsInfo?.dtype}`);
  }

  const expectedBytes = numBooks * dimension * FLOAT32_BYTES;
  if (embeddingsBuffer.byteLength !== expectedBytes) {
    throw new Error(
      `Embedding binary size ${embeddingsBuffer.byteLength} does not match expected size ${expectedBytes}`
    );
  }

  validateIndexMap(bookIdToIndex, "book_id_to_index.json", numBooks);
  if (isbnToIndex) validateIndexMap(isbnToIndex, "isbn_to_index.json", numBooks);

  const indexToBookId = buildIndexToIdArray(bookIdToIndex, numBooks);

  return {
    embeddings: createFloat32View(embeddingsBuffer),
    numBooks,
    dimension,
    bookIdToIndex,
    indexToBookId,
    isbnToIndex: isbnToIndex || {},
    embeddingsInfo,
    modelInfo: modelInfo || {},
    trainingConfig: trainingConfig || {},
    normalized:
      embeddingsInfo?.normalized === true ||
      trainingConfig?.normalize_embeddings === true ||
      modelInfo?.normalized === true,
  };
};
