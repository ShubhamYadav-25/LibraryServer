import { getBookLoanPeriod } from "../services/otherService.js";
import { requestBook } from "../services/bookRequestService.js";
import { issueBook, returnBook, 
  fetchUserIssuedBooks,
  fetchDuebooks,
} from "../services/bookIssueService.js";
import { fetchBooks, fetchBook, 
  getNewArrivals, getTrendingBooks, 
  toggleBookLike, getPopularBooks
} from "../services/bookService.js";
import { createComment, getComments, getRating, removeComment } from "../services/bookReviewService.js";


export const get_books = async (req, res) => {
  try {
    const user = req.user || null;
    const role = req.user?.role || "Guest"; 

    console.log(user);
    const { page, limit, bookName, genre } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;

    const searchParams = { bookName, genre };

    const data = await fetchBooks({
      user,
      role, 
      page: pageNum,
      limit: limitNum,
      searchParams,
    });

    return res.status(200).json(data);

  } catch (error) {
    console.error("Error fetching books:", error);
    return res.status(500).json({ error: "Server side error" });
  }
};


export const get_book = async (req,res) =>{
  try {
    const book_id = req.params?.bookId;
    const user = req.user || null;
    const role = req.user?.role || "Guest";
    
    if (!book_id) throw new Error("Invalid book");

    const book = await fetchBook({book_id, role, user});

    res.status(200).json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    return res.status(500).json({ error: "Server side error" });
  }
};


export const issue_book = async (req, res) => {
  try {
    const { requestbook,  userId} = req.body;
    const staff_id = req.user.id;
    const loan_period = await getBookLoanPeriod();
    
    await issueBook(
      userId, 
      requestbook.book_id, 
      loan_period?loan_period:12, 
      staff_id,
      requestbook.request_id?requestbook.request_id:null
    );
    res.json({
      message: "book issued successfully"
    });
  } catch (err) {
    console.error("Error issuing book:", err);
    res.status(500).json({ error: "Server side error" });
  }
};


export const return_book = async (req,res) =>{
  try {
    const book = req.body;
    const student_id = req.user.student_id;

    const copy_id = book?.copy_id
    if (!copy_id) throw new Error("Invalid book");

    const Returndetails = await returnBook({copy_id, student_id});
    
    // need to improve paymentDays: Returndetails.daysOverdue, 
    if(Returndetails?.fineId){
      res.status(200).json({
        message: `Book '${book?.title || ''}' returned successfully.`,
        paymentAmount: Returndetails.totalFine,
        daysOverdue: Returndetails.daysOverdue, 
        paymentId: Returndetails.fineId
      });
    }else{
      res.status(200).json({
        message: `Book '${book?.title || ''}' returned successfully.`,
      });
    }

  } catch (error) {
    console.error("Error issuing book:", error);
    res.status(500).json({ error: "Server side error" });
  }
};


export const request_book = async (req,res) =>{
  try {
    const student_id = req.user.student_id;
    const { book_id, studentId } = req.body;

    if (!book_id || studentId !== student_id) throw new Error("Invalid book");

    const message = await requestBook({ book_id, student_id});

    res.status(200).json(message);
  } catch (error) {
    console.error("Error requesting book:", error);
    res.status(500).json({ error: "Server side error" });
  }
};


export const new_arrivals = async (req, res) => {
  try {
    const user = req?.user || null;
    const { page, limit } = req.query;

    const books = await getNewArrivals({
      user,
      page,
      limit
    });

    res.status(200).json({ books });

  } catch (error) {
    console.error("Error fetching new arrivals:", error);
    res.status(500).json({ error: "Server side error" });
  }
};


export const trending_books = async (req, res) => {
  try {
    const user = req?.user || null;
    const { page, limit } = req.query;

    const books = await getTrendingBooks({
      user,
      page,
      limit
    });

    res.status(200).json({ books });

  } catch (error) {
    console.error("Error fetching trending books:", error);
    res.status(500).json({ error: "Server side error" });
  }
};


export const popular_books = async(req,res)=>{
  try {

    const { page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 3;

    const books = await getPopularBooks({
      page: pageNum, 
      limit: limitNum
    });

    res.status(200).json(books);

  } catch (error) {
    console.error("Error updating config:", error);
    res.status(500).json({
      error: error.message || "Server error"
    });
  }
}

export const like_dislike_book = async (req, res) => {
  try {
    const student_id = req.user?.student_id || null;
    const book_id = req.params.bookId || null;
    
    if (!book_id || !student_id) throw new Error("Invalid book");

    const result = await toggleBookLike({student_id, book_id});

    return res.status(200).json(result);

  } catch (error) {
    console.error("Error toggling book like:", error);
    res.status(500).json({ error: "Server side error" });
  }
};


export const get_user_issued_books = async (req, res) => {
  try {
    const student_id = req.user.student_id;

    const books = await fetchUserIssuedBooks({ student_id });

    return res.status(200).json(books);

  } catch (error) {
    console.error("Error fetching issued books:", error);
    res.status(500).json({ error: "Server side error" });
  }
};


export const get_overdue_books = async (req,res) =>{
  try {
    
    const books = await fetchDuebooks();

    res.status(200).json(books);
  } catch (error) {
    console.error("Error fetching duebooks:", error);
    res.status(500).json({ error: "Server side error" });
  }
};


export const get_comments = async(req, res)=>{
  try {
    const book_id = req.params?.bookId || null;

    if (!book_id) throw new Error("Invalid book");

    const comments = await getComments(book_id);
    
    res.status(200).json({comments});
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Server side error" });
  }
};


export const write_comment = async (req, res) =>{
  try {
    const book_id = req.params.bookId || null;
    const student_id = req.user?.student_id || null;
    const {rating, comment} = req.body;

    if (!book_id || ! student_id) throw new Error("Invalid book");

    const message = await createComment(book_id, student_id, rating, comment);
    res.status(200).json(message);

  } catch (error) {
    console.error("Error saving comments:", error);
    res.status(500).json({ error: "Server side error" });
  }
}


export const delete_comment = async (req, res) =>{
  try {
    const book_id = req.params.bookId;
    const student_id = req.user.student_id;
    const comment_id = req.params.commentId;

    if (!book_id || !comment_id) throw new Error("Invalid book");

    const message = await removeComment({comment_id, book_id, student_id});
    res.status(200).json(message)
  } catch (error) {
    console.error("Error removing comments:", error);
    res.status(500).json({ error: "Server side error" });
  }
}


export const get_book_rating = async (req,res) =>{
  try {
    const book_id = req.params.bookId;

    if(!book_id) throw new Error("Invalid book");

    const ratings = await getRating(book_id);

    res.status(200).json(ratings);
    
  } catch (error) {
    console.error("Error fetching rating:", error);
    res.status(500).json({ error: "Server side error" });
  }
}
