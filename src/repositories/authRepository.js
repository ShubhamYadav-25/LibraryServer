import pool from "../config/db.js"; 


export const getRoleId = async (role, executor = pool)=>{
  const [row] = await executor.execute(
    `SELECT id FROM roles WHERE name = ? LIMIT 1;`,
    [role]
  );
  return row.length ? row[0].id : null;;
}


export const assignRole = async (user_id, role_id, executor = pool)=>{
  await executor.execute(
    `INSERT INTO user_roles (user_id, role_id)
    VALUES (?, ?)`,
    [user_id, role_id]
  );
}


export const updateUserPassword = async (userId, Password, executor = pool) => {
    await executor.query("UPDATE users SET password = ? WHERE id = ?",
    [Password, userId]);
};


export const getUserPermissions = async (userId, executor = pool) => {
  const [rows] = await executor.query(`
    SELECT DISTINCT p.code 
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role_id = ?
  `, [userId]);

  return rows.map(r => r.code);
};


export const getUserRole = async (userId, executor = pool) =>{
  const [role] = await executor.query(`
    SELECT * from roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ? LIMIT 1`,[userId]);
  
  return role.length > 0 ? role[0]:null;
};


export const revokeAllUserTokens = async (userId, executor = pool) => {
    await executor.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?`,
        [userId]
    );
};


export const saveRefreshToken = async (user_id, token_id, hash, executor = pool) => {

    await executor.execute(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
        [token_id, user_id, hash]
    );
};


export const getStoredToken = async (token_id, executor = pool)=>{
  const [rows] = await executor.execute(
    `SELECT * FROM refresh_tokens
    WHERE id = ?
    LIMIT 1;`, [token_id]);

  return rows.length > 0 ? rows[0]:null;
};


export const deleteStoredToken = async(token_id, executor = pool)=>{
  await executor.execute(`
    DELETE FROM refresh_tokens
    WHERE id = ? ;`, [token_id]);
}

export const deleteUserRefreshTokens = async(user_id, executor = pool)=>{
  await executor.query(
    `DELETE FROM refresh_tokens WHERE user_id = ?`, [user_id]
  )
};


export const setReadCommitted = async (executor = pool) => {
  await executor.query(
    "SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED"
  );
};


export const linkGoogleAccount = async (user_id, google_id, executor = pool)=>{
  const [row] = await executor.query(`
    UPDATE users
    SET
        google_id = ?,
        auth_provider =
            CASE
                WHEN auth_provider = 'local'
                THEN 'hybrid'
                ELSE auth_provider
            END,
        is_verified = 1
    WHERE id = ?;`,[google_id, user_id]);

  return row.affectedRows;
};


export const createGoogleUser = async({
  email,
  googleId,
  fullName,
}, executor = pool) =>{
  const [row] = await executor.execute(`
    INSERT INTO users (
      email,
      google_id,
      full_name,
      auth_provider,
      is_verified
    )
    VALUES (
      ?, ?, ?, 'google', 1 
    );`,[email, googleId, fullName]);

  return row.insertId;
};


export const createVerificationToken = async(
  {
    userId,
    tokenHash,
    expiresAt
  },
  executor = pool
) =>{
  const [row] = await executor.execute(`
    INSERT INTO  email_verifications(user_id, token_hash, expires_at, verified, created_at)
    value ( ?, ?, ?, 0, NOW());`,
  [userId, tokenHash, expiresAt]);

  return row.insertId;
};


export const deleteUserVerificationTokens = async(user_id, executor = pool)=>{
  const [row] = await executor.execute(`
    DELETE FROM email_verifications
    WHERE user_id = ? ;`,[user_id]);

  return row.affectedRows;
}


export const getRecentVerificationToken = async (userId, executor = pool) => {

    const [rows] = await executor.execute(`
      SELECT id
      FROM email_verifications
      WHERE user_id = ?
      AND created_at >
        DATE_SUB(NOW(), INTERVAL 60 SECOND)
      LIMIT 1
    `,[userId]);

    return rows[0] || null;
};


export const getVerificationToken = async (tokenHash, executor = pool) => {

    const [rows] =
      await executor.execute(`
      SELECT
        id,
        user_id,
        token_hash,
        expires_at,
        verified
      FROM email_verifications
      WHERE token_hash = ?
      LIMIT 1
    `,[tokenHash]);

    return rows[0] || null;
};


export const markUserVerified = async (userId, executor = pool) => {

    const [row] = await connection.execute(`
      UPDATE users
      SET is_verified = 1
      WHERE id = ?
    `,[userId]);

    return row.affectedRows;
};