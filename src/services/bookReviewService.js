import {
    deleteReview, 
    getBookRating, 
    getBookRatingReview, 
    getReviewsbyBook, 
    rateBook, 
    updateReview 
} from "../repositories/reviewRepository.js"



export const getComments = async({book_id}) =>{
    return await getReviewsbyBook(book_id);
};


export const updateComment = async ({student_id, comment_id, comment})=>{
    const updated = await updateReview({student_id, comment_id, comment});

    if(!updated) throw new Error("Invalid Comment Update");

    return {message: "Review updated successfully"};
}


export const createComment = async ({book_id, student_id, comment})=>{
    const review = await getBookRatingReview(book_id, student_id);
    if(!review) throw new Error("Rate the book first");

    const comment_id = review.review_id;
    await updateComment({student_id, comment_id, comment});
    return { message : 'review created successfully'};
}


export const removeComment = async ({ comment_id, student_id }) => {
  
    const affectedRows = await deleteReview(comment_id, student_id);
  
    if (affectedRows === 0) {
      throw new Error("Failed to delete review");
    }
  
    return {
      message: "Review deleted successfully",
    };
};


export const getRating = async(book_id)=>{
    return await getBookRating(book_id);
}


export const addRating = async({book_id, student_id, rating})=>{
    const review = await getBookRatingReview(book_id, student_id);

    if(review) throw new Error("Book already rated");

    const result = await rateBook(book_id, student_id, rating);

    if(!result) throw new Error("Failed to rate book");

    return { message: "Book rated successfully"};
}