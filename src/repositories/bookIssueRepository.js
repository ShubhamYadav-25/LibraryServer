import pool from "../config/db.js"; 


// 1️⃣ Get active loans
export const getActiveLoans = async (student_id, executor = pool) => {
  const [row] = await executor.execute(
    `SELECT COUNT(transaction_id) AS count
     FROM TRANSACTION_HISTORY
     WHERE student_id = ?
     AND return_date IS NULL`,
    [student_id]
  );

  return row.length > 0? row[0].count: null;
};


// 2️⃣ Get available copy WITH LOCK (FOR UPDATE)
export const getAvailableCopyForUpdate = async (book_id, executor = pool) => {
  const [rows] = await executor.execute(
    `SELECT copy_id
     FROM BOOK_COPY
     WHERE book_id = ?
     AND is_available = 1
     ORDER BY copy_id
     LIMIT 1
     FOR UPDATE`,
    [book_id]
  );

  return rows[0] || null;
};


// 3️⃣ Insert transaction
export const insertTransaction = async (data, executor = pool) => {
  const [result] = await executor.execute(
    `INSERT INTO TRANSACTION_HISTORY (
        copy_id,
        student_id,
        issue_date,
        due_date,
        issued_by_staff_id
    )
    VALUES (
        ?, ?, NOW(),
        DATE_ADD(NOW(), INTERVAL ? DAY),
        ?
    )`,
    [
      data.copy_id,
      data.student_id,
      data.loan_period_days,
      data.issued_by_staff_id
    ]
  );

  return result.insertId;
};


// 4️⃣ Update book availability
export const updateBookAvailability = async (is_available, copy_id, executor = pool) => {
  const [result] = await executor.execute(
    `UPDATE BOOK_COPY
     SET is_available = ?
     WHERE copy_id = ?`,
    [is_available, copy_id]
  );

  return result?.affectedRows || null;
};


// 5️⃣ Fulfill request
export const fulfillRequest = async (request_id, book_id, executor = pool) => {
  await executor.execute(
    `UPDATE book_request
     SET is_fulfilled = 1,
         book_id = ?
     WHERE request_id = ?`,
    [book_id, request_id]
  );
};

// 1️⃣ get Book Issued to user
export const getUserIssuedBook = async(copy_id, student_id, executor = pool) =>{
  const [row] = await executor.execute(
    `SELECT transaction_id, due_date 
     FROM transaction_history
     WHERE copy_id = ? AND student_id = ? AND return_date IS NULL
     LIMIT 1 FOR UPDATE`,
    [copy_id, student_id]
  );

  return row.length > 0 ? row[0] : null;
}

// 2️⃣ Update the Book Transaction
export const updateBookTransaction = async(returnDate, transaction_id, executor = pool) =>{
  const [row] = await executor.execute(
      `UPDATE transaction_history
       SET return_date = ?
       WHERE transaction_id = ?`,
      [returnDate, transaction_id]
    );

  return row?.affectedRows;
}

// 4️⃣ Create Fine for Overdue Book
export const createFineRecord = async(data, executor = pool)=>{
  const [result] = await executor.query(
    `INSERT INTO fine_record (
      student_id,
      transaction_id,
      fine_date,
      fine_amount,
      reason,
      is_paid
    ) VALUES (?, ?, ?, ?, ?, 0)`,
    [
      data.student_id,
      data.transaction_id,
      data.returnDate,
      data.totalFine,
      `Overdue Penalty for ${data.daysOverdue} days`
    ]
  );

  return result?.insertId || null;
}

// 5️⃣ Update User Fine
export const updateStudentFineBalance = async(totalFine, student_id, executor = pool)=>{
  await executor.query(
    `UPDATE student
     SET fine_balance = fine_balance + ?,
        updated_at = NOW()
     WHERE id = ?`,
    [totalFine, student_id]
  );
}


export const getUserIssuedBooks =  async (student_id, executor = pool)=>{

  const [rows] = await executor.query(
    `SELECT
      B.book_id as id,
      B.title,
      B.image,
      B.ISBN as isbn,
      BC.copy_id,
      B.author,
      T.issue_date as issueDate,
      T.due_date as dueDate
    FROM transaction_history T
    JOIN book_copy BC ON T.copy_id = BC.copy_id
    JOIN vw_books B ON B.book_id = BC.book_id
    WHERE T.return_date IS NULL AND T.student_id=?;`, [student_id]
  );

  return {rows};
}


export const getUserTransaction =  async (member_id, copy_id, executor = pool) => {

    const [row] = await executor.query(
    `SELECT * FROM transaction_history
    where member_id = ? and copy_id = ?;`,
    [member_id,copy_id]);
    return row
};


export const getDueBooks = async (executor = pool) =>{
  const [row] = await executor.query(
    `SELECT
      B.book_name AS title,
      SV.name as borrower,
      SV.studentId as studentId,
      T.due_date as due_date,
      T.copy_id as book_no,
      DATEDIFF(NOW(), T.due_date) AS days_overdue
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
      T.return_date IS NULL
      AND NOW() > T.due_date
    ORDER BY
      days_overdue DESC;`);

  return row;
}

