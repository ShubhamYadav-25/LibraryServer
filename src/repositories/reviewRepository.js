import pool from "../config/db.js"; 


export const getReviewsbyBook = async(book_id, executor = pool)=>{

  const [rows] = await executor.query(`
    SELECT
      review_id AS id,
      rating,
      book_review AS comment,
      created_at AS date,
      helpful_count as helpful
    FROM
      reviews 
    WHERE
        book_id = ?`, [book_id]);
  return rows;
};


export const getReview = async(comment_id, executor = pool)=>{
  const [row] = await executor.query(`
    SELECT * from reviews
    WHERE review_id = ? ;`,
    [comment_id]);

  return row.length > 0 ? row[0]: null;
}


export const addReview = async(book_id, student_id, rating, comment, executor = pool)=>{

  await executor.query(`
    INSERT INTO reviews(book_id,student_id,rating,book_review,created_at)
    VALUES (?,?,?,?,NOW())`,[book_id, student_id, rating, comment]);
  return
};


export const deleteReview = async(comment_id, executor = pool)=>{

  const [result] = await executor.query(`
    DELETE FROM reviews
    WHERE review_id = ?;`,[comment_id]);

  return result.affectedRows;
}


export const updateReview = async(
  { book_id, student_id, review = null, rating = null },
  executor = pool
)=>{

  const [result] = await executor.execute(
    `
    UPDATE book_ratings
    SET
      review = COALESCE(?, review),
      rating = COALESCE(?, rating)
    WHERE student_id = ? AND book_id = ?;
    `,
    [review, rating, student_id, book_id]
  );

  if (result.affectedRows === 0) {
    throw new Error("Student not found");
  }
};


export const getBookRating = async(book_id, executor = pool)=>{

  const [rows]= await executor.query(`
    SELECT 
        rating,
        review_count as count,
        stars_1 as 1stars,
        stars_2 as 2stars,
        stars_3 as 3stars,
        stars_4 as 4stars,
        stars_5 as 5stars
    FROM book_ratings where book_id = ? ;`,[book_id]);
  return rows[0];
}