import pool from "../config/db.js";
import { getMaxBookLimit } from "./otherService.js";
import { calculateLateFine } from "../utils/calculateFine.js";
import * as issueBookRepository from "../repositories/bookIssueRepository.js"
import { setReadCommitted } from "../repositories/authRepository.js";
import { lockStudentRow } from "../repositories/userRepository.js";
import { changedueDate, getActivetransaction, getConfig } from "../repositories/adminRepository.js";


export const issueBook = async (student_id, book_id, loan_period_days,
  issued_by_staff_id,
  request_id) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await setReadCommitted(connection);

    const MAX_LIMIT = await getMaxBookLimit();

    await lockStudentRow(student_id, connection);

    // 1️⃣ Check active loans
    const activeLoans = await issueBookRepository.getActiveLoans(
      student_id, connection);

    if (activeLoans >= MAX_LIMIT) {
      throw new Error("Borrowing limit reached");
    }

    // 2️⃣ Get available copy (LOCKED)
    const copy = await issueBookRepository.getAvailableCopyForUpdate(
      book_id, connection);

    if (!copy) {
      throw new Error("No copies available");
    }

    const copy_id = copy.copy_id;

    // 3️⃣ Issue book
    const transactionId = await issueBookRepository.insertTransaction(
      {
        copy_id,
        student_id,
        loan_period_days,
        issued_by_staff_id
      },
      connection
    );

    // 4️⃣ Mark copy unavailable
    await issueBookRepository.updateBookAvailability(
        0, copy_id, connection);

    // 5️⃣ Optional request fulfillment
    if (request_id) {
      await issueBookRepository.fulfillRequest(
        request_id,
        book_id,
        connection
      );
    }

    await connection.commit();

    return {
      transaction_id: transactionId,
      copy_id
    };

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
};


export const returnBook = async ({ copy_id, student_id}) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let fineId = null;
    let daysOverdue = 0;
    let totalFine = 0.0;

    // 1️⃣ Get active transaction (LOCK row to prevent race condition)
    const row = await issueBookRepository.getUserIssuedBook( copy_id, student_id, connection);

    if (row === null) {
      throw new Error("Active transaction not found");
    }

    const { transaction_id, due_date } = row;
    const returnDate = new Date();

    // 2️⃣ Update return date
    const Transac_result = await issueBookRepository.updateBookTransaction( returnDate, transaction_id, connection);

    if(!Transac_result) throw new Error("Server Side Error");

    // Update book availability
    const book_result = await issueBookRepository.updateBookAvailability(
      1, copy_id, connection);

    console.log(book_result);
    if(!book_result) throw new Error("Server Side Issue occured");

    ({daysOverdue, totalFine} = calculateLateFine(due_date));

    if(daysOverdue == 0){
      return {message: "Returned on time"}
    }

    // 5️⃣ Insert fine record
    fineId = await issueBookRepository.createFineRecord(
      {
        student_id,
        transaction_id,
        returnDate,
        totalFine,
        daysOverdue
      },
      connection
    );

    if(!fineId) throw new Error("Fine not generated");

    // 6️⃣ Update student fine balance
    await issueBookRepository.updateStudentFineBalance(
      totalFine, 
      student_id,
      connection
    )

    await connection.commit();

    return { fineId, daysOverdue, totalFine};

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};


export const renewBook = async({copyId, student_id})=>{
  const period = await getConfig("LOAN_PERIOD_DAYS");
  const row = await getActivetransaction(copyId, student_id);

  if(!row) throw new Error("Transaction not Found");

  const IssueDate = new Date(row.issue_date);
  const dueDate = new Date(row.due_date);

  const diffMs = dueDate - IssueDate;

  const diffDaysExact = diffMs / (1000 * 60 * 60 * 24);

  if(diffDaysExact > period) throw new Error("Can't Renew this Book Know");

  dueDate.setDate(dueDate.getDate() + period);
  const result = await changedueDate(row.transaction_id, dueDate);
  if(!result) throw new Error("Can't Renew this Book Know");

  return {message: "Book renewed successfully"};
}


export const fetchUserIssuedBooks = async ({ student_id }) => {
  const { rows } = await issueBookRepository.getUserIssuedBooks(student_id);

  const booksWithPenalty = rows.map((book) => {
    const { daysOverdue, totalFine } = calculateLateFine(book.dueDate);
  
    return {
      ...book,
      penalty: {
        amount: totalFine,
        days: daysOverdue
      }
    };
  });

  return booksWithPenalty;
};


export const fetchDuebooks = async () => {
  const connection = await pool.getConnection();

  try {
    // ✅ Set isolation FIRST
    await setReadCommitted(connection);

    // ✅ Then start transaction
    await connection.beginTransaction();

    const books = await issueBookRepository.getDueBooks(connection);

    await connection.commit();
    return books;

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
};