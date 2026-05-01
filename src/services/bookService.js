import * as bookRepository from "../repositories/bookRepository.js";
import { attachLikedFlag } from "../utils/attachLikedFlag.js";
import { generateBookCopies } from "../utils/generateBookCopies.js";
import USER_ROLES from "../constants/userRoles.js";
import pool from "../config/db.js";
import { getBookRating, getBookRatingReview } from "../repositories/reviewRepository.js";
import { tr_initializeRating } from "../repositories/triggersRepository.js";
import ApiError from '../utils/errorHandler.js';



export const fetchBooks = async ({user, role, page, limit, searchParams}) => {
  const safeLimit = (typeof limit === 'number' && limit > 0 && limit < 20) ? limit : 10;
  const offset = (page - 1) * safeLimit;

  let booksData = await bookRepository.getBooks(searchParams, safeLimit, offset, role);
  let liked = [];
  if(role === USER_ROLES.STUDENT){
    liked = await bookRepository.getUserLikedBooks(user.student_id);
  }

  const { books, total } = booksData;
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
  const review = student_id !== null ? await getBookRatingReview(book_id, student_id): [];

  const bookRating = await getBookRating(book_id);
  const combined = {
    ...book,
    ...bookRating,
    ...review
  };

  return combined;
};


export const addBook = async(data)=>{
  
  const connection = await pool.getConnection();
  try {

    await connection.beginTransaction();

    const exist = await bookRepository.checkBookExistance(data.ISBN);
    if(exist) throw new ApiError(409, "A book with this ISBN already exists in the system.");

    let cat_id = await bookRepository.getCategoryId(data.genre);
    if(!cat_id){
      cat_id = await bookRepository.addCategory(data.genre);
      if(!cat_id) throw new ApiError(500, "Failed to initialize book metadata", false);
    }

    let author_id = await bookRepository.getAuthorId(data.author);
    if(!author_id){
      author_id = await bookRepository.addAuthor(data.author);
      if(!author_id) throw new ApiError(500, "Failed to initialize book metadata", false);
    }

    const book_id = await bookRepository.addnewBook({
      title: data.title,
      ISBN: data.ISBN,
      author_id,
      cat_id,
      publish_date: data.publish_date,
      description: data.description,
      pages: data.pages,
      language: data.language,
      shelf_location: data.shelf_location
    }, connection);

    if(!book_id) throw new ApiError(500, "Error adding book details", false);

    const rating = await tr_initializeRating(book_id, connection);
    const copies = generateBookCopies(book_id, data.totalCopies || 1)
    const copy = bookRepository.addBookCopies(copies, connection);

    if(!copy) throw new ApiError(500, "Error adding book details", false);
    return { message: `Book added successfully`}

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally{
    connection.release();
  }
};


export const addCopies = async({book_id, totalCopies})=>{

  const last_copie_id = await bookRepository.lastaddedcopy(book_id);

  if(!last_copie_id) throw new ApiError(404, "Cannot add copies to a non-existent book.");

  const parts = last_copie_id.split("-C");
  const p_start_num = Number(parts[1]) + 1;

  if(p_start_num>30) throw new ApiError(400, "Maximum physical copy limit (30) reached for this title.");

  const copies = generateBookCopies(book_id, totalCopies, p_start_num);
  const rows = await bookRepository.addBookCopies(copies)
  if(!rows) throw new ApiError(500, "Error adding book details", false)

  return {message : "Copies added successfully"};
};


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
};


export const toggleBookLike = async ({ student_id, book_id }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // console.log(student_id, book_id);
    const result = await bookRepository.likeUnlikeBook(student_id, book_id, connection);

    await connection.commit();

    return { message: `Book ${result.action} successfully`}
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally{
    connection.release();
  }
};
