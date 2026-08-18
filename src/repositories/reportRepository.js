import pool from "../config/db.js"; 


export const getCirculationTable = async(from, to, limit, offset, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT 
            th.transaction_id,
            s.studentId,
            s.name AS student_name,
            b.book_id,
            b.book_name AS book_title,
            bc.copy_id,
            th.issue_date,
            th.due_date,
            th.return_date,
            CASE 
                WHEN th.return_date IS NULL THEN 'Issued'
                ELSE 'Returned'
            END AS status
        FROM transaction_history th
        JOIN student_overview s ON th.student_id = s.studentId
        JOIN book_copy bc ON th.copy_id = bc.copy_id
        JOIN book b ON bc.book_id = b.book_id
        WHERE th.issue_date BETWEEN ? AND ?
        ORDER BY th.issue_date DESC
        LIMIT ? OFFSET ?;`,[from, to, limit, offset]);

    return rows;
}

export const getCirculationChart = async(from, to, executor = pool)=>{
    const [rows] = await executor.execute(`
        SELECT
            DATE_FORMAT(issue_date,'%Y-%m') AS period,
            COUNT(*) AS issued_books,
            SUM(
                CASE
                    WHEN return_date IS NOT NULL THEN 1
                    ELSE 0
                END
            ) AS returned_books
        FROM transaction_history
        WHERE issue_date BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(issue_date,'%Y-%m')
        ORDER BY period;`,[from, to]);
    return rows;
}


export const getOverdueTable = async(from, to, limit, offset, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT 
            s.studentId,
            s.name AS student_name,
            s.email,
            b.book_name AS book_title,
            bc.copy_id,
            th.issue_date,
            th.due_date,
            DATEDIFF(th.return_date, th.due_date) AS overdue_days,
            f.fine_amount
        FROM
            transaction_history th
                JOIN
            student_overview s ON th.student_id = s.studentId
                JOIN
            fine_record f ON th.transaction_id = f.transaction_id
                JOIN
            book_copy bc ON th.copy_id = bc.copy_id
                JOIN
            book b ON bc.book_id = b.book_id
        WHERE
            th.return_date IS NOT NULL
                AND th.return_date > th.due_date
                AND th.due_date BETWEEN ? AND ?
        ORDER BY overdue_days DESC
        LIMIT ? OFFSET ?;`,[from, to, limit, offset]);

    return rows;
}


export const getOverdueChart = async(from, to, executor = pool)=>{
    const [rows] = await executor.execute(`
        SELECT
            DATE_FORMAT(due_date,'%Y-%m') period,
            COUNT(*) overdue_books,
            SUM(f.fine_amount) total_fine
        FROM transaction_history th
        JOIN fine_record f
        ON f.transaction_id=th.transaction_id
        WHERE
        th.return_date>th.due_date
        AND th.due_date BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(due_date,'%Y-%m')
        ORDER BY period;`,[from, to]);

    return rows;
}


export const getPopularBooksTable = async(from, to, limit, offset, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT 
            b.book_id,
            b.title,
            b.author,
            COUNT(th.transaction_id) AS borrow_count
        FROM transaction_history th
        JOIN book_copy bc ON th.copy_id = bc.copy_id
        JOIN vw_books b ON bc.book_id = b.book_id
        WHERE th.issue_date BETWEEN ? AND ?
        GROUP BY b.book_id, b.title, b.author
        ORDER BY borrow_count DESC
        LIMIT ? OFFSET ?;`,[from, to, limit, offset]);

    return rows;
}


export const getPopularBooksChart = async(from, to, executor = pool)=>{
    const [rows] = await executor.execute(`
        SELECT
            b.title,
            COUNT(*) borrow_count
        FROM transaction_history th
        JOIN book_copy bc
        ON th.copy_id=bc.copy_id
        JOIN vw_books b
        ON bc.book_id=b.book_id
        WHERE issue_date BETWEEN ? AND ?
        GROUP BY b.book_id,b.title
        ORDER BY borrow_count DESC
        LIMIT 10;`,[from, to]);
    
    return rows;
}


export const getCollectionTable = async(from, to, limit, offset, executor = pool)=>{
    const [rows] = await executor.query(`
        SELECT
            genre,
            COUNT(DISTINCT book_id) total_titles,
            SUM(total_copy) total_copies,
            SUM(issued_copy) issued_copies,
            SUM(total_copy-issued_copy) available_copies
        FROM vw_books
        GROUP BY genre
        ORDER BY genre
        LIMIT ? OFFSET ?;`,[limit, offset]);
    return rows;
}


export const getCollectionChart = async(from, to, executor = pool)=>{
    const [rows] = await executor.execute(
        `SELECT
          genre,
          COUNT(DISTINCT book_id) AS total_titles,
          SUM(total_copy) AS total_copies,
          SUM(issued_copy) AS issued_copies
        FROM vw_books 
        GROUP BY genre
        ORDER BY total_titles DESC;`);
    return rows;
}



export const getInventoryTable = async(from, to, limit, offset, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT 
            b.book_id,
            b.title,
            b.author,
            COUNT(bc.copy_id) AS total_copies,
            SUM(bc.is_available) AS available_copies,
            SUM(b.issued_copy) AS issued_copies,
            SUM(CASE WHEN bc.condition_status IN ('Lost', 'Damaged') THEN 1 ELSE 0 END) AS missing_copies
        FROM vw_books b
        LEFT JOIN book_copy bc ON b.book_id = bc.book_id
        GROUP BY b.book_id, b.title, b.author
        ORDER BY b.title
        LIMIT ? OFFSET ?;`,[limit, offset]);

    return rows;
}


export const getInventoryChart = async(from, to, executor = pool)=>{
    const [rows] = await executor.execute(`
        SELECT
            SUM(is_available) available,
            SUM(CASE WHEN is_available=0 THEN 1 ELSE 0 END) issued,
            SUM(CASE
                    WHEN condition_status='Lost'
                    THEN 1
                    ELSE 0
                END) lost,
            SUM(CASE
                    WHEN condition_status='Damaged'
                    THEN 1
                    ELSE 0
                END) damaged
        FROM book_copy;`);
    return rows;
}


export const getUserActivityTable = async(from, to, limit, offset, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT 
            s.studentId,
            s.name,
            s.email,
            s.department,
            s.joinDate AS created_at,
            COUNT(th.transaction_id) AS total_books_issued,
            SUM(CASE
                WHEN
                    th.return_date IS NULL
                        AND th.issue_date IS NOT NULL
                THEN
                    1
                ELSE 0
            END) AS currently_issued,
            SUM(CASE
                WHEN th.return_date IS NOT NULL THEN 1
                ELSE 0
            END) AS returned_books,
            SUM(CASE
                WHEN
                    th.due_date < CURDATE()
                        AND th.return_date IS NULL
                THEN
                    1
                ELSE 0
            END) AS overdue_books
        FROM
            student_overview s
                LEFT JOIN
            transaction_history th ON s.studentId = th.student_id
                AND th.issue_date BETWEEN ? AND ?
        GROUP BY s.studentId , s.name , s.email , s.department , created_at
        ORDER BY total_books_issued DESC
        LIMIT ? OFFSET ?;`,[from, to, limit, offset]);

    return rows;
}


export const getUserActivityChart = async(from, to, executor = pool)=>{
    const [rows] = await executor.execute(
        `SELECT 
            DATE_FORMAT(th.issue_date, '%Y-%m') AS period,
            COUNT(DISTINCT th.student_id) AS active_users,
            COUNT(th.transaction_id) AS total_issues
        FROM transaction_history th
        WHERE th.issue_date BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(th.issue_date, '%Y-%m')
        ORDER BY period;`,[from, to]);

    return rows;
}


export const getFineCollectionChart = async(from, to, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT 
            DATE_FORMAT(th.return_date, '%Y-%m') AS period,
            SUM(f.fine_amount) AS total_fine_collected,
            COUNT(th.transaction_id) AS fine_transactions
        FROM transaction_history th
        join fine_record f on f.transaction_id = th.transaction_id
        WHERE th.return_date BETWEEN ? AND ?
          AND f.fine_amount > 0
        GROUP BY DATE_FORMAT(th.return_date, '%Y-%m')
        ORDER BY period;`,[from, to]);
    
    return rows;
}


export const getFineCollectionTable = async(from, to, limit, offset, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT
            s.studentId,
            s.name AS student_name,
            s.email,
            COUNT(f.transaction_id) AS fine_count,
            SUM(f.fine_amount) AS total_fine
        FROM fine_record f
        JOIN student_overview s ON f.student_id = s.studentId
        WHERE f.fine_date BETWEEN ? AND ?
        GROUP BY s.studentId, s.name, s.email
        ORDER BY total_fine DESC
        limit ? offset ?;`,[from, to, limit, offset]);
    
    return rows;
}


export const getDailyActivityTable = async(from, to, limit, offset, executor = pool)=>{
    const [rows] = await executor.query(
        `SELECT 
            activity_date,
            SUM(issues) AS issues,
            SUM(returns) AS returns,
            SUM(new_registrations) AS new_registrations
        FROM
            (SELECT 
                DATE(issue_date) AS activity_date,
                    COUNT(*) AS issues,
                    0 AS returns,
                    0 AS new_registrations
            FROM
                transaction_history
            WHERE
                issue_date BETWEEN @from_date AND @to_date
            GROUP BY DATE(issue_date) UNION ALL SELECT 
                DATE(return_date) AS activity_date,
                    0 AS issues,
                    COUNT(*) AS returns,
                    0 AS new_registrations
            FROM
                transaction_history
            WHERE
                return_date BETWEEN @from_date AND @to_date
            GROUP BY DATE(return_date) UNION ALL SELECT 
                DATE(created_at) AS activity_date,
                    0 AS issues,
                    0 AS returns,
                    COUNT(*) AS new_registrations
            FROM
                users
            WHERE
                created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at)) activity
        GROUP BY activity_date
        ORDER BY activity_date
        LIMIT ? OFFSET ?;`,[from, to, limit, offset]);
    
    return rows;
};


export const getDailyActivityChart = async(from, to, executor = pool)=>{
    const [rows] = await executor.execute(`
        SELECT 
            activity_date,
            SUM(issues) AS issues,
            SUM(returns) AS returns,
            SUM(new_registrations) AS new_registrations
        FROM
            (SELECT 
                DATE(issue_date) AS activity_date,
                    COUNT(*) AS issues,
                    0 AS returns,
                    0 AS new_registrations
            FROM
                transaction_history
            WHERE
                issue_date BETWEEN @from_date AND @to_date
            GROUP BY DATE(issue_date) UNION ALL SELECT 
                DATE(return_date) AS activity_date,
                    0 AS issues,
                    COUNT(*) AS returns,
                    0 AS new_registrations
            FROM
                transaction_history
            WHERE
                return_date BETWEEN @from_date AND @to_date
            GROUP BY DATE(return_date) UNION ALL SELECT 
                DATE(created_at) AS activity_date,
                    0 AS issues,
                    0 AS returns,
                    COUNT(*) AS new_registrations
            FROM
                users
            WHERE
                created_at BETWEEN ? AND ?
            GROUP BY DATE(created_at)) activity
        GROUP BY activity_date
        ORDER BY activity_date;`,[from, to]);
    return rows;
}