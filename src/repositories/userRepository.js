import pool from "../config/db.js"


export const getUserbyEmail = async (email, executor = pool) => {
  const [row] = await executor.query(
    `SELECT * FROM users WHERE email = ? LIMIT 1`, [email]);
  return row.length > 0? row[0] : null; 
};

export const getUserId = async (studentId) => {
  const [rows] = await pool.query(`SELECT user_id FROM student where id = ? ;`, [studentId]);
  return rows[0]; 
};

export const getUser = async (user_id, executor = pool)=>{
  const [row] = await executor.execute(
    `SELECT * FROM users WHERE id = ? LIMIT 1`, [user_id]);

  return row.length > 0 ? row[0]:null;
}

export const createUser = async(email, password, executor = pool) =>{
  const [result] = await executor.execute(
  `INSERT INTO users (email, password, created_at)
   VALUES (?, ?, NOW())`,
  [email, password]
);

return result.insertId;
}

export const getStudentSeq = async(startYear, executor = pool)=>{
  const [row] = await executor.execute(
    `SELECT last_seq 
     FROM student_sequence 
     WHERE year = ? 
     FOR UPDATE`, [startYear]);

  if (row.length === 0) {
    const newSeq = 1;

    await executor.execute(
      `INSERT INTO student_sequence (year, last_seq) 
       VALUES (?, ?)`,
      [startYear, newSeq]);

    return newSeq;
  } else{
    return row[0].last_seq + 1;
  }
}

export const updateStudentSeq = async(newSeq, startYear, executor = pool)=>{
  await executor.execute(
    `UPDATE student_sequence 
     SET last_seq = ? 
     WHERE year = ?`,
    [newSeq, startYear]);
}


export const createStudent = async (user_id, id, name, batch, executor = pool)=>{
  const [row] = await executor.execute(
    `INSERT INTO student (user_id, id, name, batch) VALUES (?, ?, ?, ?)`,
    [user_id, id, name, batch]
  );

  return row.insertId;
}

export const getStudentId = async (user_id)=>{
  const [row] = await pool.query(`
    SELECT id FROM student WHERE user_id =? LIMIT 1`, [user_id]);
  return row.length > 0 ? row[0].id:null;
}

export const getStudents = async (search, branch, limit, offset, executor = pool) => {

    const conditions = [];
    const values = [];

    // Department filter
    if (branch) {
      conditions.push('department = ?');
      values.push(branch);
    }

    // Search across name & email
    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ?)');
      values.push(`%${search}%`);
      values.push(`%${search}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const [rows] = await executor.query(
      `SELECT * FROM student_overview
       ${whereClause}
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const [[{ total }]] = await executor.query(
      `SELECT COUNT(*) AS total
       FROM student_overview
       ${whereClause}`,
      values
    );

    return { rows, total };
};

export const getStudent = async(student_id)=>{
  const [row] = await pool.query(
    `SELECT * FROM student_overview WHERE studentId = ?;`,[student_id]);

  return row.length > 0 ? row[0] : null;
};

export const getDepartmentId = async(dep_name, executor = pool) =>{
  const [row] = await executor.execute(`
    SELECT id from departments
    WHERE department_name = ?`,[dep_name]);
  
  return row.length >0? row[0].id: null;
}


export const getDepartment = async(dep_id)=>{
  const [row] = await pool.query(
    `SELECT department_name as branch 
    from departments WHERE id = ?;`,
    [dep_id]
  );
  return row.length > 0 ? row[0].branch : null;
}


export const updateStudent = async ({
  student_id,
  name,
  dep_id,
  contact_no,
  address,
  executor = pool
}) => {

  const fields = [];
  const values = [];

  if (name !== null) {
    fields.push("name = ?");
    values.push(name);
  }

  if (dep_id !== null) {
    fields.push("dep_id = ?");
    values.push(dep_id);
  }

  if (contact_no !== undefined) {
    fields.push("contact_no = ?");
    values.push(contact_no);
  }

  if (address !== undefined) {
    fields.push("address = ?");
    values.push(address);
  }

  if (fields.length === 0) {
    throw new Error("No fields to update");
  }

  values.push(student_id);

  const [result] = await executor.execute(
    `
    UPDATE student
    SET ${fields.join(", ")}
    WHERE id = ?;
    `,
    values
  );

  if (result.affectedRows === 0) {
    throw new Error("Student not found");
  }
};


export const lockStudentRow = async (student_id, executor = pool)=>{
  await executor.execute(`SELECT * FROM student WHERE id = ? FOR UPDATE;`,
    [student_id]
  )
}


export const studentActivities = async(studentId)=>{

    const [rows] = await pool.query(
      `SELECT
        B.book_name AS title,
        T.issue_date,
        T.due_date,
        T.return_date
    FROM
        TRANSACTION_HISTORY T
    JOIN
        BOOK_COPY C ON T.copy_id = C.copy_id
    JOIN
        BOOK B ON C.book_id = B.book_id
    WHERE
        T.student_id = ?
        AND (
            T.issue_date >= NOW() - INTERVAL 7 DAY
            OR T.return_date >= NOW() - INTERVAL 7 DAY
        )
    ORDER BY
        COALESCE(T.return_date, T.issue_date) DESC
    LIMIT 4;`,[studentId]);

    return rows.length > 0 ? rows : null;
}


export const getStudentStats = async(student_id)=>{
  
  const query = `
    SELECT
      (SELECT COUNT(T.copy_id) FROM transaction_history T 
      WHERE T.student_id = ? AND T.return_date IS NULL) as books_currently_issued,
      (SELECT COUNT(T.copy_id) FROM transaction_history T 
      WHERE T.student_id = ? AND T.return_date IS NULL AND T.due_date < CURDATE()) 
      as books_overdue_by_user,
      (SELECT COUNT(request_id) FROM book_request 
      WHERE student_id = ? AND is_fulfilled = FALSE) as total_unfulfilled_requests,
      (SELECT COUNT(book_id) FROM book) as total_books_count`;

    const [rows] = await pool.query(query, [student_id, student_id, student_id]);
    return rows[0];
};


export const getUserFines = async (
  student_id,
  is_paid,
  limit = 10,
  offset = 0
) => {
  let selectQuery = `
    SELECT 
      f.id,
      f.fine_date AS date,
      f.fine_amount AS amount,
      f.reason,
      f.is_paid,
      b.title,
      b.ISBN,
      b.genre
  `;

  // Include payment fields only for paid fines
  if (is_paid === 1) {
    selectQuery += `,
      f.payment_method AS method,
      f.payment_reference AS paymentId
    `;
  }

  let query = `
    ${selectQuery}
    FROM fine_record f
    JOIN vw_books b ON f.book_id = b.book_id
    WHERE f.student_id = ?
  `;

  const params = [student_id];

  // Optional filter
  if (is_paid !== undefined) {
    query += ` AND f.is_paid = ?`;
    params.push(is_paid);
  }

  // Add sorting (important for pagination consistency)
  query += ` ORDER BY f.fine_date DESC`;

  // Add pagination
  query += ` LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.query(query, params);
  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM fine_record WHERE student_id = ? ${is_paid !== undefined ? "AND is_paid = ?" : ""}`,
    is_paid !== undefined ? [student_id, is_paid] : [student_id]
  );

  return {rows, countResult};
};

export const getFineDetails = async (fineId, executor = pool) => {
  const query = `
    SELECT 
      f.id,
      f.fine_date AS date,
      f.fine_amount AS amount,
      f.reason,
      f.is_paid,
      f.payment_method AS method,
      f.payment_reference AS paymentId,
      b.title,
      b.ISBN,
      b.genre,
      s.name,
      s.studentId,
      s.department
    FROM fine_record f
    JOIN vw_books b on f.book_id = b.book_id
    JOIN student_overview s on f.student_id = s.studentId
    WHERE f.id = ? LIMIT 1;
  `;
  const [row] = await executor.execute(query, [fineId]);
  return row.length > 0? row[0]:null;
};

export const markFineAsPaid = async (
  fine_id,
  payment_method,
  payment_id, 
  executor = pool
) => {
  const query = `
    UPDATE fine_record
    SET 
      is_paid = 1,
      payment_method = ?,
      payment_reference = ?
    WHERE id = ?
  `;

  await executor.execute(query, [payment_method, payment_id, fine_id]);
};

export const updateStudentFineBalance = async (
  studentId,
  fineAmount,
  executor = pool
) => {
  const query = `
    UPDATE student
    SET 
      fine_balance = fine_balance - ?,
      updated_at = NOW()
    WHERE id = ?
  `;

  await executor.execute(query, [fineAmount, studentId]);
};