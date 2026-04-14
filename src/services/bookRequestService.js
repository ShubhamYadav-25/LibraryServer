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


export const requestBook = async ({book_id, student_id})=>{

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const book = await getBook(book_id);
        
    if(!book) throw new Error("Invalid Book number");

    const data = await checkBookRequestLimit(student_id, connection);
    if(data.is_limit_reached) throw new Error("Request Limit Reached");

    const requested = await checkBookRequested(book_id, student_id, connection);
    if(requested){
      throw new Error("Book Already Requested");
    } 

    const requestId = await createBookRequest(book_id, student_id, connection);
    await connection.commit();

    if(!requestId) throw new Error("Request not made");

    return {message: `Book ${book.title} requested successfully`};
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally{
    connection.release();
  }
}

export const fetchRequests = async ({pageNum, limitNum, safemode})=>{

  const safeLimit = (typeof limitNum === 'number' && limitNum > 0 && limitNum < 7) ? limitNum : 3;
  const offset = (pageNum - 1) * safeLimit;

  const is_fullfilled = safemode === 'active' ? 0 : 1;

  const {rows, total} = await getBookRequests( is_fullfilled, safeLimit, offset);
  return {data: rows, total}
}


export const fetchRequest = async ({student_id, mode, page, limit}) =>{

  const safeLimit = (typeof limit === 'number' && limit > 0 && limit < 7) ? limit : 3;
  const offset = (page - 1) * safeLimit;

  const safemode = mode === 'active' ? 'active' : 'passive';

  console.log(student_id, safemode, safeLimit, offset);
  return await getBookRequestsbyUser(student_id, safemode, safeLimit, offset);
}


export const cancelRequest = async({request_id}) =>{

  console.log(request_id);
  const data = await getBookRequest(request_id);
  if(!data) throw new Error("Invalid Request Id");

  const result = await cancelBookRequest(data.request_id);
  if(!result) throw new Error("Request Already Served");
  
  return { message : "Request cancelled successfully"};
  
}


export const deleteRequest = async({request_id})=>{
  await deleteBookRequest(request_id);
  return { message : "Request deleted successfully"}
}