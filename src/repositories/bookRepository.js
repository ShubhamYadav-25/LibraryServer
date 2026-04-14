import pool from "../config/db.js"; 
import USER_ROLES from "../constants/userRoles.js";

const privilegedRoles = [USER_ROLES.ADMIN, USER_ROLES.LIBRARIAN];

export const getBooks = async (searchParams = {}, limit, offset,  role, executor = pool) => {

    let whereClauses = [];
    let queryParams = [];

    let selectFields = `
        book_id,
        title,
        ISBN,
        image,
        author,
        genre,
        date,
        status
    `;

    if (searchParams.bookName) {
        whereClauses.push("title LIKE ?");
        queryParams.push(`%${searchParams.bookName}%`);
    }

    if (searchParams.genre) {
        whereClauses.push("genre LIKE ?");
        queryParams.push(`${searchParams.genre}`);
    }

    if (privilegedRoles.includes(role)) {
        selectFields += `,
            total_copy,
            issued_copy,
            date
        `;
    }

    const where =
        whereClauses.length > 0
            ? `WHERE ${whereClauses.join(" AND ")}`
            : "";

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM vw_books ${where}`,
        queryParams
    );

    const total = countRows[0].total;

    const query = `
        SELECT ${selectFields} FROM vw_books
        ${where} LIMIT ? OFFSET ?`;

    const [rows] = await executor.query(query, [
        ...queryParams,
        limit,
        offset
    ]);

    return {
        books: rows,
        total
    };
};


export const getBook = async (bookid, role, studentId = null, executor = pool) => {
  let selectFields = `
    vb.book_id,
    vb.title,
    vb.ISBN,
    vb.image,
    vb.author,
    vb.genre,
    vb.date,
    vb.status,
    bd.description,
    bd.pages,
    bd.language`;  
    
  if (privilegedRoles.includes(role)) {
    selectFields += `,
      bd.shelf_location AS location,
      vb.total_copy,
      vb.issued_copy`;
  }

  if (role === "Student") {
    selectFields += `,
      CASE 
        WHEN bl.student_id IS NULL THEN 0 
        ELSE 1 
      END AS is_liked`;
  }

  const joins = `
    FROM vw_books vb
    LEFT JOIN book_details bd ON vb.book_id = bd.book_id
    ${role === "Student" ? `
      LEFT JOIN book_likes bl 
        ON bl.book_id = vb.book_id 
       AND bl.student_id = ?
    ` : ``}
    WHERE vb.book_id = ?`;  

  const params = role === "Student" ? [studentId, bookid] : [bookid];

  const [rows] = await executor.query(
   `SELECT ${selectFields} ${joins}`, params);

  return rows[0] || null;
};


export const checkAvailability = async (book_id, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT book_no as copy_no FROM book_copy 
        WHERE is_available = 1 and book_id = ? limit 1;`,[book_id]);

    return rows;
};


export const getUserLikedBooks = async(userId, executor = pool)=>{

    const [row] = await executor.query(
      `SELECT book_id from book_likes
      where student_id = ?`,[userId]);
    return row;
};

// need modification
export const likeUnlikeBook = async (userId, bookId, executor = pool) => {

  const [deleteResult] = await executor.execute(
    `DELETE FROM book_likes 
     WHERE student_id = ? AND book_id = ?`,
    [userId, bookId]
  );

  if (deleteResult.affectedRows > 0) {
    await executor.execute(
      `UPDATE book 
       SET like_count = like_count - 1 
       WHERE book_id = ?`,
      [bookId]
    );

    return { action: "unliked" };
  }

  await executor.execute(
    `INSERT INTO book_likes (student_id, book_id)
     VALUES (?, ?)`,
    [userId, bookId]
  );

  await executor.execute(
    `UPDATE book 
     SET like_count = like_count + 1 
     WHERE book_id = ?`,
    [bookId]
  );

  return { action: "liked" };
};


export const newbookArrivals =  async (limitNum, offset, executor = pool)=>{
    const [row] = await executor.query(
      `SELECT v.book_id, v.title, v.ISBN,v.image, v.author, 
      v.genre, v.date, v.status FROM vw_books v
      JOIN book b on v.book_id = b.book_id
      WHERE v.date >= NOW() - INTERVAL 90 DAY
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?;`,
      [limitNum, offset]);
    return row;
}


export const getTrending = async(limitNum, offset, executor = pool)=>{

    const [row] = await executor.query(
      `SELECT v.book_id, v.title, v.ISBN,v.image, v.author, 
      v.genre, v.date, v.status FROM vw_books as v
      JOIN book b on v.book_id = b.book_id
      WHERE b.like_count!=0 
      ORDER BY b.like_count DESC
      LIMIT ? OFFSET ?;`,
      [limitNum, offset]);
    return row;
}


export const getMostRatedBooks = async(limit, offset, executor = pool)=>{

  const [rows] = await executor.query(
    `SELECT 
        b.book_id,
        b.title,
        b.ISBN,
        b.image,
        b.author,
        b.genre,
        r.rating,
        r.review_count
    FROM
        book_ratings r
            LEFT JOIN
        vw_books b ON b.book_id = r.book_id
    ORDER BY r.rating DESC
    LIMIT ? OFFSET ?`, [limit, offset]);

  return rows;
}


export const popularThisMonth = async(limit,offset,executor = pool)=>{
  const [rows] = await executor.query(`
    SELECT 
        b.book_id,
        b.title,
        b.ISBN,
        b.image,
        b.author,
        b.genre,
        r.rating,
        r.review_count,
        COUNT(bc.copy_id) AS timesIssued
    FROM
        book_copy bc
            JOIN
        vw_books b ON b.book_id = bc.book_id
            JOIN
        book_ratings r ON r.book_id = b.book_id
            RIGHT JOIN
        transaction_history t ON t.copy_id = bc.copy_id
    WHERE
        t.issue_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
            AND t.issue_date < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'),
            INTERVAL 1 MONTH)
    GROUP BY bc.book_id
    ORDER BY timesIssued DESC
    LIMIT ? OFFSET ?;`, [limit, offset]);

    return rows;
}