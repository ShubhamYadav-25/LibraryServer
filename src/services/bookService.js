import * as bookRepository from "../repositories/bookRepository.js";
import { attachLikedFlag } from "../utils/attachLikedFlag.js";
import USER_ROLES from "../constants/userRoles.js";
import pool from "../config/db.js";
import { getBookRating } from "../repositories/reviewRepository.js";


export const fetchBooks = async ({user, role, page, limit, searchParams}) => {
  const safeLimit = (typeof limit === 'number' && limit > 0 && limit < 20) ? limit : 10;
  const offset = (page - 1) * safeLimit;

  let booksData = await bookRepository.getBooks(searchParams, safeLimit, offset, role);
  let liked = [];
  if(role === USER_ROLES.STUDENT){

    liked = await bookRepository.getUserLikedBooks(user.student_id);
  }

  const { books, total } = booksData;

  // Create liked set only if needed
  const result =
    role === USER_ROLES.STUDENT
      ? attachLikedFlag(books, liked)
      : books; // skip unnecessary processing

  return {
    page,
    limit: safeLimit,
    totalBooks: total,
    books: result,
  };
};


export const fetchBook = async({book_id, role, user = null})=>{

  const student_id = user?.student_id || null;
  const book = await bookRepository.getBook(book_id, role, student_id);
  const bookRating = await getBookRating(book_id);
  const combined = {
    ...book,
    ...bookRating
  };
  return combined;

}


export const getNewArrivals = async ({ user, page, limit }) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 12;
  const offset = (pageNum - 1) * limitNum;

  const newBooks = await bookRepository.newbookArrivals(limitNum, offset);
  if(user?.student_id){
    const liked = await bookRepository.getUserLikedBooks(user.student_id);
    return attachLikedFlag(newBooks, liked);
  }

  return newBooks;
};


export const getTrendingBooks = async ({ user, page, limit }) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 12;
  const offset = (pageNum - 1) * limitNum;

  const trendingBooks = await bookRepository.getTrending(limitNum, offset);
  if(user?.student_id){
    const liked = await bookRepository.getUserLikedBooks(user.student_id);
    return attachLikedFlag(trendingBooks, liked);
  }

  return trendingBooks;
};


export const getPopularBooks = async({page, limit})=>{

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 3;
  const offset = (pageNum - 1) * limitNum;

    const books = await bookRepository.popularThisMonth(limitNum, offset);
    if (!books || books.length === 0) {
        return await bookRepository.getMostRatedBooks(limitNum, offset);
    }
    return books;
}

export const toggleBookLike = async ({ student_id, book_id }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // console.log(student_id, book_id);
    const result = await bookRepository.likeUnlikeBook(student_id, book_id, connection);

    await connection.commit();

    return{ message: `Book ${result.action} successfully`}
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally{
    connection.release();
  }
};
