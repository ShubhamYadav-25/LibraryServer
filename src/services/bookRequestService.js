import pool from "../config/db.js";
import { getBook } from "../repositories/bookRepository.js";
import { cancelBookRequest, 
  checkBookRequested, 
  checkBookRequestLimit, 
  createBookRequest, 
  deleteBookRequest, 
  getBookRequest, 
  getBookRequests, 
  getBookRequestsbyUser,
 } from "../repositories/bookRequestRepository.js";
import { lockStudentRow } from "../repositories/userRepository.js";
import ApiError from '../utils/errorHandler.js';



export const requestBook = async ({book_id, student_id})=>{
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await lockStudentRow(student_id, connection);
    
    const book = await getBook(book_id);

    if(!book) throw new ApiError(404, "The requested book does not exist.");

    const data = await checkBookRequestLimit(student_id, connection);
    if(data.is_limit_reached > 0) throw new ApiError(403, "You have reached your active book request limit.");

    const requested = await checkBookRequested(book_id, student_id, connection);
    if(requested) throw new ApiError(400, "You have already requested this book.");

    const requestId = await createBookRequest(book_id, student_id, connection);
    await connection.commit();

    if(!requestId) throw new ApiError(500, "Failed to create book request", false);

    return {message: `Book ${book.title} requested successfully`};
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally{
    connection.release();
  }
}

export const fetchRequests = async ({pageNum, limitNum, safemode})=>{

  const safeLimit = (typeof limitNum === 'number' && limitNum > 0 && limitNum < 7) ? limitNum : 7;
  const offset = (pageNum - 1) * safeLimit;

  const {rows, total} = await getBookRequests( safemode, safeLimit, offset);
  return {data: rows, total}
}


export const fetchRequest = async ({student_id, mode, page, limit}) =>{

  const safeLimit = (typeof limit === 'number' && limit > 0 && limit < 7) ? limit : 3;
  const offset = (page - 1) * safeLimit;
  const safemode = mode === 'active' ? 'active' : 'passive';

  return await getBookRequestsbyUser(student_id, safemode, safeLimit, offset);
}


export const cancelRequest = async({request_id}) =>{

  const result = await cancelBookRequest(request_id);  
  return { message : "Request cancelled successfully"};
};


export const deleteRequest = async({request_id})=>{
  
  await deleteBookRequest(request_id);
  return { message : "Request deleted successfully"}
};