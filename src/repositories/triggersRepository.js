import pool from "../config/db.js"; 


export const tr_initializeRating = async(book_id, executor = pool)=>{
    const [result] = await executor.execute(`
        INSERT INTO book_ratings (book_id)
        VALUES (?);`, [book_id]);
    return result.affectedRows;
}

export const tr_addLikeonComment = async(review_id, executor = pool)=>{
    const [result] = await executor.execute(`
        UPDATE reviews
        SET helpful_count = helpful_count + 1
        WHERE review_id = ?;
        `,[review_id]);
    return result.affectedRows;
}


export const tr_removeLikeonComment = async(review_id, executor = pool)=>{
    const [result] = await executor.execute(`
        UPDATE reviews
        SET helpful_count = GREATEST(helpful_count - 1, 0)
        WHERE review_id = ?;`,[review_id]);
    return result.affectedRows;
}


export const tr_updateRatingAfterReviewInsert = async (book_id, rating, executor = pool) => {
  const query = `
    UPDATE book_ratings
    SET
      stars_1 = stars_1 + (? = 1),
      stars_2 = stars_2 + (? = 2),
      stars_3 = stars_3 + (? = 3),
      stars_4 = stars_4 + (? = 4),
      stars_5 = stars_5 + (? = 5),

      review_count = review_count + 1,

      rating = (
        (
          stars_1 * 1 +
          stars_2 * 2 +
          stars_3 * 3 +
          stars_4 * 4 +
          stars_5 * 5 +
          ?
        )
        /
        (review_count + 1)
      )
    WHERE book_id = ?;
  `;

  const values = [
    rating, rating, rating, rating, rating, // for stars_1 to stars_5
    rating,                                 // for weighted sum
    book_id
  ];

  const [result] = await executor.execute(query, values);
  return result.affectedRows;
};


export const tr_updateRatingAfterReviewUpdate = async (
  book_id,
  oldRating,
  newRating,
  executor = pool
) => {
  // Skip if no actual change (equivalent to IF OLD.rating <> NEW.rating)
  if (oldRating === newRating) return;

  // Step 1: Update star distribution
  const updateCountsQuery = `
    UPDATE book_ratings
    SET
      stars_1 = stars_1 - (? = 1) + (? = 1),
      stars_2 = stars_2 - (? = 2) + (? = 2),
      stars_3 = stars_3 - (? = 3) + (? = 3),
      stars_4 = stars_4 - (? = 4) + (? = 4),
      stars_5 = stars_5 - (? = 5) + (? = 5)
    WHERE book_id = ?;
  `;

  const countValues = [
    oldRating, newRating,
    oldRating, newRating,
    oldRating, newRating,
    oldRating, newRating,
    oldRating, newRating,
    book_id
  ];

  await executor.execute(updateCountsQuery, countValues);

  // Step 2: Recompute average rating
  const recomputeQuery = `
    UPDATE book_ratings
    SET rating =
      CASE
        WHEN review_count > 0 THEN
          (
            stars_1 * 1 +
            stars_2 * 2 +
            stars_3 * 3 +
            stars_4 * 4 +
            stars_5 * 5
          ) / review_count
        ELSE 0
      END
    WHERE book_id = ?;
  `;

  const [result] = await executor.execute(recomputeQuery, [book_id]);

  return result.affectedRows;
};


export const tr_updateRatingAfterReviewDelete = async (
  book_id,
  oldRating,
  executor = pool
) => {
  // Step 1: Update star counts + review count
  const updateCountsQuery = `
    UPDATE book_ratings
    SET
      stars_1 = stars_1 - (? = 1),
      stars_2 = stars_2 - (? = 2),
      stars_3 = stars_3 - (? = 3),
      stars_4 = stars_4 - (? = 4),
      stars_5 = stars_5 - (? = 5),
      review_count = GREATEST(review_count - 1, 0)
    WHERE book_id = ?;
  `;

  const countValues = [
    oldRating,
    oldRating,
    oldRating,
    oldRating,
    oldRating,
    book_id
  ];

  await executor.execute(updateCountsQuery, countValues);

  // Step 2: Recompute rating
  const recomputeQuery = `
    UPDATE book_ratings
    SET rating =
      CASE
        WHEN review_count > 0 THEN
          (
            stars_1 * 1 +
            stars_2 * 2 +
            stars_3 * 3 +
            stars_4 * 4 +
            stars_5 * 5
          ) / review_count
        ELSE 0
      END
    WHERE book_id = ?;
  `;

  const [result] = await executor.execute(recomputeQuery, [book_id]);

  return result.affectedRows;
};
