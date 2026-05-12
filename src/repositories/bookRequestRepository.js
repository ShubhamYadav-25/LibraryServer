import pool from "../config/db.js"; 


export const getBookRequests = async(safemode, limit, offset, executor = pool)=>{

  let whereClause = ``;
  let is_fulfilled = 0;
  if(safemode === 'active'){
    whereClause = ` WHERE br.is_fulfilled= ? `;
    is_fulfilled = 0;
  }
  else if (safemode === 'cancelled') {
    whereClause = ` WHERE br.is_fulfilled= ? AND br.cancellation_date IS NOT NULL `;
    is_fulfilled = 1;
  } else {
    whereClause = ` WHERE br.is_fulfilled= ? `;
    is_fulfilled = 1;
  }
    const [rows] = await executor.query(`
      SELECT br.request_id, br.student_id as studentId, br.book_id, 
      vb.title as bookTitle, vb.ISBN as isbn, vb.genre, 
      vb.status as status, sv.name as studentName, sv.department 
      FROM book_request br JOIN vw_books vb ON br.book_id = vb.book_id 
      JOIN student_overview sv ON br.student_id = sv.studentId 
      ${whereClause}
      LIMIT ? OFFSET ?;`,[is_fulfilled, limit, offset]);
    
    const [[{ total }]] = await executor.query(`
      SELECT COUNT(*) AS total
      FROM book_request br
      ${whereClause};`, [is_fulfilled]);

    return { rows, total };
}


export const getBookRequestsbyUser = async(student_id, mode, limit, offset, executor = pool)=>{

  const conditions = [];
  const params = [];

  // Base query (always same)
  let query = `
    SELECT
      br.request_id,
      br.book_id,
      br.request_date,
      vb.title AS bookTitle,
      vb.ISBN AS isbn,
      vb.genre,
      CASE 
        WHEN br.is_fulfilled = 1 THEN 'ISSUED'
        WHEN br.cancellation_date IS NOT NULL THEN 'CANCELED'
        ELSE 'ACTIVE'
      END AS status
    FROM book_request br
    JOIN vw_books vb ON br.book_id = vb.book_id
  `;

  // 🔹 Mandatory filter
  conditions.push(`br.student_id = ?`);
  params.push(student_id);

  // 🔹 Mode-based filtering
  if (mode === 'active') {
    conditions.push(`br.is_fulfilled = 0`);
    conditions.push(`br.cancellation_date IS NULL`);
  }

  if (mode === 'passive') {
    conditions.push(`(br.is_fulfilled = 1 OR br.cancellation_date IS NOT NULL)`);
  }

  // 🔹 Attach WHERE clause safely
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  // 🔹 Pagination
  query += ` LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const [rows] = await executor.query(query, params);

  return rows;
};

export const getBookRequest = async(request_id, executor = pool)=>{
  const [row] = await executor.query(`
    SELECT * from book_request WHERE request_id = ?;`,[request_id]);
  
  return row.length > 0 ? row[0]: null;
}

export const createBookRequest = async(book_id, student_id, executor = pool)=>{
  const [row] = await executor.query(
    `INSERT INTO book_request (book_id, student_id, request_date, is_fulfilled)
     VALUES (? , ?, NOW(), 0);`,[book_id, student_id]
  );
  
  return row.insertId;
};


export const cancelBookRequest = async(request_id, executor = pool)=>{

  const [row] =  await executor.query(`
      UPDATE book_request 
      SET cancellation_date = NOW(), is_fulfilled = 1
      where request_id = ? AND is_fulfilled = 0
      AND cancellation_date IS NULL;`, [request_id]);

  return row?.affectedRows;
};


export const deleteBookRequest = async(request_id, executor = pool)=>{
  await executor.query(
    `DELETE FROM book_request WHERE request_id = ?;`,[request_id]);
};


export const checkBookRequestLimit = async(student_id, executor = pool)=>{
  const [row] = await executor.query(`
    SELECT 
        COUNT(*) AS active_requests,
    
        MAX(sc.config_value) AS max_limit,
    
        CASE 
            WHEN COUNT(*) >= MAX(sc.config_value)
                THEN 1
            ELSE 0
        END AS is_limit_reached
    
    FROM book_request br
    
    JOIN system_config sc
        ON sc.config_key = 'MAX_BOOK_LIMIT'
    
    WHERE br.is_fulfilled = 0
      AND br.student_id = ?;`, [student_id]);

  return row.length > 0 ? row[0] : 0;
}

export const checkBookRequested = async(book_id, student_id, executor = pool)=>{
  const [row] = await executor.execute(`
    SELECT EXISTS (
      SELECT 1 
      FROM book_request
      WHERE student_id = ?
        AND book_id = ?
        AND is_fulfilled = 0
    ) AS already_requested;`,[student_id, book_id]);

    return row[0].already_requested;
  
}