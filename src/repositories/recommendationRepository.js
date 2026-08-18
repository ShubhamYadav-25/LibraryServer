import pool from "../config/db.js";

export const getStudentRecommendationSignals = async ({ student_id }, executor = pool) => {
  if (!student_id) return [];

  const [rows] = await executor.query(
    `
    SELECT book_id, 3.5 AS weight, 'like' AS source, 0 AS exclude_only
    FROM book_likes
    WHERE student_id = ?
      AND is_liked = 1

    UNION ALL

    SELECT
      book_id,
      CASE WHEN rating >= 3 THEN rating ELSE 0 END AS weight,
      'rating' AS source,
      CASE WHEN rating < 3 THEN 1 ELSE 0 END AS exclude_only
    FROM reviews
    WHERE student_id = ?

    UNION ALL

    SELECT bc.book_id, 1.5 AS weight, 'issue' AS source, 0 AS exclude_only
    FROM transaction_history th
    JOIN book_copy bc ON bc.copy_id = th.copy_id
    WHERE th.student_id = ?

    UNION ALL

    SELECT book_id, 2.0 AS weight, 'request' AS source, 0 AS exclude_only
    FROM book_request
    WHERE student_id = ?
      AND book_id IS NOT NULL;
    `,
    [student_id, student_id, student_id, student_id]
  );

  return rows;
};

/**
 * Fetches safe student-facing book details from vw_books for a given list of book IDs.
 * Strictly avoids exposing confidential/operational columns (total_copies, shelf_location).
 */
export const getBooksByIds = async (bookIds, executor = pool) => {
  if (!Array.isArray(bookIds) || bookIds.length === 0) return [];

  const uniqueBookIds = [...new Set(bookIds.map((id) => Number(id)).filter(Number.isInteger))];
  if (uniqueBookIds.length === 0) return [];

  const placeholders = uniqueBookIds.map(() => "?").join(",");
  const [rows] = await executor.query(
    `
    SELECT
      book_id,
      title,
      ISBN,
      image,
      author,
      genre,
      date,
      status
    FROM vw_books
    WHERE book_id IN (${placeholders});
    `,
    uniqueBookIds
  );

  return rows;
};

export const getStudentLikedBooks = async (student_id, executor = pool) => {
  if (!student_id) return [];

  const [rows] = await executor.query(
    `SELECT book_id FROM book_likes WHERE student_id = ? AND is_liked = 1;`,
    [student_id]
  );

  return rows;
};

export const getPopularBooksForRecommendation = async (
  { limit = 20, excludeBookIds = [] } = {},
  executor = pool
) => {
  const uniqueExcluded = [...new Set(excludeBookIds.map((id) => Number(id)).filter(Number.isInteger))];
  let excludeClause = "";
  const params = [];

  if (uniqueExcluded.length > 0) {
    const placeholders = uniqueExcluded.map(() => "?").join(",");
    excludeClause = `WHERE b.book_id NOT IN (${placeholders})`;
    params.push(...uniqueExcluded);
  }

  params.push(Number(limit) || 20);

  const [rows] = await executor.query(
    `
    SELECT
      v.book_id,
      v.title,
      v.ISBN,
      v.image,
      v.author,
      v.genre,
      v.date,
      v.status,
      b.like_count
    FROM vw_books v
    JOIN book b ON v.book_id = b.book_id
    ${excludeClause}
    ORDER BY 
      b.like_count DESC, 
      (MOD(v.book_id * 17, 397)) DESC, 
      v.book_id DESC
    LIMIT ?;
    `,
    params
  );

  return rows;
};
