import pool from "../config/db.js";
import {
    addhelpful,
    deleteReview, 
    getBookRating, 
    getBookRatingReview, 
    getReviewsbyBook, 
    rateBook, 
    removeBookRating, 
    removehelpful, 
    updateReview 
} from "../repositories/reviewRepository.js"
import { tr_addLikeonComment, tr_removeLikeonComment, tr_updateRatingAfterReviewDelete, tr_updateRatingAfterReviewInsert } from "../repositories/triggersRepository.js";
import ApiError from '../utils/errorHandler.js';



export const getComments = async({book_id}) =>{

    return await getReviewsbyBook(book_id);
};


export const updateComment = async ({student_id, comment_id, comment})=>{

    const updated = await updateReview({student_id, comment_id, comment});
    if(!updated) throw new ApiError(404, "Comment doesn't exist");
    return {message: "Review updated successfully"};
};


export const createComment = async ({book_id, student_id, comment})=>{

    const review = await getBookRatingReview(book_id, student_id);
    if(!review) throw new ApiError(400, "Please rate the book before adding a written review.");

    const comment_id = review.review_id;
    await updateComment({student_id, comment_id, comment});
    return { message : 'review created successfully'};
};


export const removeComment = async ({ comment_id, student_id, book_id }) => {

    const affectedRows = await deleteReview(comment_id, student_id, book_id);
    if (affectedRows === 0) throw new ApiError(404, "Review not found.");
  
    return { message: "Review deleted successfully"};
};


export const getRating = async(book_id)=>{

    return await getBookRating(book_id);
};


export const addRating = async({book_id, student_id, rating})=>{
    
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const review = await getBookRatingReview(book_id, student_id, connection);
        if(review) throw new ApiError(500, "Internal error user already rated book", false);
    
        const review_id = await rateBook(book_id, student_id, rating, connection);
        if(!review_id) throw new ApiError(500, "Internal error unable to rate book", false);
    
        const result = await tr_updateRatingAfterReviewInsert(book_id, rating, connection)
        if(!result) throw new ApiError(500, "Internal error updating book rating", false);
        
        return { message: "Book rated successfully"};
            
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally{
        connection.release();
    }
};


export const removeRating = async({book_id, student_id})=>{

    const connection = await pool.getConnection();
    try {

        await connection.beginTransaction();
        const review = await getBookRatingReview(book_id, student_id, connection);
        if(!review) throw new ApiError(500, "Internal error rating doesn't exist", false);
    
        const row = await removeBookRating(review.review_id, connection);
        if(!row) throw new ApiError(500, "Internal error unable to delete rating", false);
    
        const result = await tr_updateRatingAfterReviewDelete(book_id, review.my_rating, connection)
        if(!result) throw new ApiError(500, "Internal error updating book rating", false);
        
        return { message: "Book unrated successfully"};
            
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally{
        connection.release();
    }
};


export const likeUnlikeComment = async({student_id, comment_id})=>{

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const liked = await removehelpful(student_id, comment_id, connection);
        if(!liked){
            const row = await addhelpful(student_id, comment_id, connection);
            if(!row) throw new ApiError(500, "Internal error adding like on comment", false);

            const result = await tr_addLikeonComment(comment_id, connection)
            if(!result) throw new ApiError(500, "Internal error updating like on comment", false);

            return {message: "comment liked successfully"}
        }

        const result = await tr_removeLikeonComment(comment_id, connection)
        if(!result) throw new ApiError(500, "Internal error updating like on comment", false);
        
        return {message: "comment unliked successfully"}
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally{
        connection.release();
    }
};