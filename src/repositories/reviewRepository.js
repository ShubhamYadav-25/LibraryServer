import pool from "../config/db.js"; 


export const getReviewsbyBook = async(book_id, executor = pool)=>{

  const [rows] = await executor.query(`
    SELECT 
        s.name,
        r.review_id AS id,
        r.rating,
        r.book_review AS comment,
        r.created_at AS date,
        r.helpful_count AS helpful
    FROM
        reviews r
            JOIN
        student_overview s ON r.student_id = s.studentId
    WHERE
        book_id = ? AND book_review IS NOT NULL;`, [book_id]);
        
  return rows.length > 0 ? rows : [];
};


export const getReview = async(comment_id, executor = pool)=>{
  const [row] = await executor.query(`
    SELECT * from reviews
    WHERE review_id = ? ;`,
    [comment_id]);

  return row.length > 0 ? row[0]: null;
}


export const deleteReview = async(comment_id, student_id, book_id, executor = pool)=>{

  const [result] = await executor.query(`
    UPDATE reviews
    SET book_review = NULL
    WHERE review_id = ? AND student_id = ? AND book_id = ? ;
    `,[comment_id, student_id, book_id]);

  return result.affectedRows;
}


export const updateReview = async(
  {  comment_id, student_id, comment},
  executor = pool
)=>{

  const [result] = await executor.execute(
    `
    UPDATE reviews
    SET
      book_review = COALESCE(?, book_review)
    WHERE student_id = ? AND review_id = ?;
    `,
    [comment, student_id, comment_id]);

  return result.affectedRows;
};


export const getBookRating = async(book_id, executor = pool)=>{

  const [rows]= await executor.query(`
    SELECT 
        rating,
        review_count as totalReviews,
        stars_1 as 1stars,
        stars_2 as 2stars,
        stars_3 as 3stars,
        stars_4 as 4stars,
        stars_5 as 5stars
    FROM book_ratings where book_id = ? ;`,[book_id]);
  return rows[0];
}


export const getBookRatingReview = async (book_id, student_id, executor = pool)=>{
  const [row] = await executor.query(
    `SELECT review_id, rating as my_rating, book_review as my_comment FROM reviews
    where student_id = ? and book_id = ?;`,
  [student_id, book_id]);

  return row.length > 0 ? row[0] : false;
}


export const rateBook = async(book_id, student_id, rating, executor = pool)=>{
  const [result] = await executor.query(
    `INSERT INTO reviews(book_id,student_id, rating ,created_at)
    VALUES (?,?,?,NOW())`,[book_id, student_id, rating]
  );

  return result.insertId;
};


export const removeBookRating = async(review_id, executor = pool)=>{
  const [row] = await executor.query(`
    DELETE FROM reviews
    where review_id = ? ;`, [review_id]);

  return row.affectedRows;
}


export const addhelpful = async(student_id, comment_id, executor = pool)=>{
  const [row] = await executor.query(`
    INSERT INTO comment_likes(comment_id, student_id)
    VALUE (?,?);`,[comment_id, student_id]);

  return row.affectedRows ? row.insertId : false; 
}


export const removehelpful = async(student_id, comment_id, executor = pool)=>{
  const [row] = await executor.query(`
    DELETE FROM comment_likes
    WHERE comment_id = ? and student_id = ?;`,[comment_id, student_id]);

  return row.affectedRows; 
}