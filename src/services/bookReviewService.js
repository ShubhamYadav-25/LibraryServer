import { addReview, deleteReview, getBookRating, getReview, getReviewsbyBook } from "../repositories/reviewRepository.js"



export const getComments = async(book_id) =>{
    return await getReviewsbyBook(book_id);
};


export const updateComment = async (comment_id)=>{

}


export const createComment = async (book_id, student_id, rating, comment)=>{
    await addReview(book_id, student_id, rating, comment);
    return { message : 'review created successfully'};
}


export const removeComment = async ({ comment_id, book_id, student_id }) => {
  
    const review = await getReview(comment_id);

    if (!review) {
        throw new Error("Review not found");
    }
    if (review.student_id !== student_id) {
        throw new Error("Unauthorized user");
    }
    if (review.book_id != book_id) {
        console.log(review.book_id, book_id)
        throw new Error("Invalid request: book mismatch");
    }
  
    const affectedRows = await deleteReview(comment_id);
  
    if (affectedRows === 0) {
      throw new Error("Failed to delete review (server error)");
    }
  
    return {
      message: "Review deleted successfully",
    };
};


export const getRating = async(book_id)=>{
    return await getBookRating(book_id);
}