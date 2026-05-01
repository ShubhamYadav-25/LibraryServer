import pool from "../config/db.js"; 


export const getStats = async(executor = pool)=>{
  const query = `
      SELECT
      (SELECT COUNT(T.copy_id) 
       FROM TRANSACTION_HISTORY T 
       WHERE T.return_date IS NULL) AS issuedBooks,
    
      (SELECT COUNT(T.copy_id) 
       FROM TRANSACTION_HISTORY T 
       WHERE T.return_date IS NULL 
         AND T.due_date < CURDATE()) AS overdueBooks,
    
      (SELECT COUNT(request_id) 
       FROM BOOK_REQUEST 
       WHERE is_fulfilled = FALSE) AS activeRequest,
    
      (SELECT COUNT(*) FROM book_copy) AS totalBooks,
    
      (SELECT COUNT(*) FROM student) AS totalUsers,
    
      (SELECT COUNT(*) 
       FROM book 
       WHERE YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)) AS addedThisWeek,
    
      (SELECT COUNT(copy_id) 
       FROM transaction_history
       WHERE issue_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND issue_date < DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
      ) AS thisMonth,
    
      (SELECT COUNT(copy_id) 
       FROM transaction_history
       WHERE issue_date >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
         AND issue_date < DATE_FORMAT(CURDATE(), '%Y-%m-01')
      ) AS previousMonth,
    
      (SELECT COUNT(copy_id) 
       FROM transaction_history
       WHERE due_date >= CURDATE()
         AND due_date < CURDATE() + INTERVAL 1 DAY
      ) AS dueToday,
    
      (SELECT COUNT(request_id) 
       FROM BOOK_REQUEST
       WHERE request_date >= CURDATE()
         AND request_date < CURDATE() + INTERVAL 1 DAY
      ) AS newToday;`;
      
    const [rows] = await executor.query(query);
    
    return rows.length > 0 ? rows[0]: null;
};


export const getRecentActivities = async(executor = pool)=>{

    const [rows] = await executor.query(
    `SELECT
    B.book_name AS book_title,
    SV.studentId as studentId,
    SV.name,
    CASE
        WHEN T.return_date IS NULL 
        THEN TIMESTAMPDIFF(HOUR, T.issue_date, NOW()) 
        ELSE TIMESTAMPDIFF(HOUR, T.return_date, NOW())
    END AS time, 
    CASE
        WHEN T.return_date IS NULL THEN 'BORROWED'
        ELSE 'RETURNED'
    END AS activity_status
    FROM
        TRANSACTION_HISTORY T
    JOIN
        BOOK_COPY C ON T.copy_id = C.copy_id
    JOIN
        BOOK B ON C.book_id = B.book_id
    JOIN
        student_overview SV
            ON T.student_id = SV.studentId
    WHERE
        TIMESTAMPDIFF(
            DAY,
            COALESCE(T.return_date, T.issue_date),
            NOW()
        ) BETWEEN 0 AND 1
    ORDER BY
        COALESCE(T.return_date, T.issue_date) DESC
    LIMIT 3;`);
      
    return rows;
}


export const updateConfig = async (key, value, executor = pool) => {
    const [result] = await executor.execute(
        `UPDATE SYSTEM_CONFIG 
         SET config_value = ? 
         WHERE config_key = ?`,
        [value, key]
    );

    return result.affectedRows; 
};


export const getConfig = async (key, executor = pool) => {
    const [rows] = await executor.execute(
        `SELECT config_value 
         FROM SYSTEM_CONFIG 
         WHERE config_key = ?`,
        [key]
    );

    return rows.length > 0 ? rows[0]?.config_value : false;
};


export const getUsertransactions = async (limit, offset, isReturn, executor = pool) => {

    const whereClause = isReturn
      ? `WHERE t.return_date IS NULL`
      : `WHERE t.return_date IS NOT NULL`;

    const selectquery = isReturn
      ? `
        t.due_date AS dueDate,
        CASE
          WHEN DATEDIFF(t.due_date, NOW()) < 0 THEN 'overdue'
          WHEN DATEDIFF(t.due_date, NOW()) <= 1 THEN 'due soon'
          ELSE 'on time'
        END AS status
      `
      : `t.return_date AS returnDate,
        CASE
          WHEN DATEDIFF(t.due_date, t.return_date) < 0 THEN 'overdue'
          ELSE 'on time'
        END AS status`;

    const [rows] = await executor.query(`
      SELECT 
        t.transaction_id,
        t.student_id AS studentId,
        sv.name AS studentName,
        sv.department,
        t.issue_date AS issueDate,
        t.issued_by_staff_id AS staffId,
        t.copy_id AS bookNo,
        vb.title AS bookTitle,
        vb.ISBN AS isbn,
        vb.genre,
        ${selectquery}
      FROM transaction_history t
      JOIN student_overview sv ON t.student_id = sv.studentId
      JOIN book_copy bc ON t.copy_id = bc.copy_id
      JOIN vw_books vb ON bc.book_id = vb.book_id
      ${whereClause}
      ORDER BY t.issue_date DESC
      LIMIT ? OFFSET ?;
    `, [limit, offset]);

    // ✅ Total count (for pagination)
    const [[{ total }]] = await executor.query(`
      SELECT COUNT(*) AS total
      FROM transaction_history t
      ${whereClause};
    `);

    return { rows, total };
};


export const getActivetransaction = async(copy_id, student_id, executor = pool) =>{
  const [row] = await executor.query(`
    SELECT * FROM transaction_history
    WHERE return_date IS NULL and student_id = ? and copy_id = ?;`,
  [student_id, copy_id]);

  return row.length > 0 ? row[0]: false;
}


export const changedueDate = async(transaction_id, due_date, executor = pool)=>{
  const [result] = await executor.execute(`
    Update transaction_history
    set due_date = ?
    where transaction_id = ?;`,[due_date, transaction_id]);

  return result.affectedRows;
}