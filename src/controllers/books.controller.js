import { getBookLoanPeriod } from "../services/otherService.js";
import { requestBook } from "../services/bookRequestService.js";
import { issueBook, returnBook, 
  fetchUserIssuedBooks,
  fetchDuebooks,
  renewBook,
} from "../services/bookIssueService.js";
import { fetchBooks, fetchBook, 
  getNewArrivals, getTrendingBooks, 
  toggleBookLike, getPopularBooks,
  addBook,
  addCopies
} from "../services/bookService.js";
import { addRating, createComment, getComments, getRating, likeUnlikeComment, removeComment, removeRating, updateComment } from "../services/bookReviewService.js";
import { catchAsync } from "../utils/errorHandler.js";



export const get_books = catchAsync(async (req, res) => {

    const user = req.user || null;
    const role = req.user?.role || "Guest"; 

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
});


export const get_book = catchAsync(async (req,res) =>{

    const book_id = req.params?.bookId;
    const user = req.user || null;
    const role = req.user?.role || "Guest";

    const book = await fetchBook({book_id, role, user});
    res.status(200).json(book);
});


export const add_book = catchAsync(async(req,res)=>{
    const data = req.body;

    const result = await addBook(data);

    res.status(200).json({
      message: result.message
    })
});


export const add_copies = catchAsync(async(req,res)=>{

    const book_id = req.params.bookId;
    const {totalCopies} = req.body;
    const message = await addCopies({book_id, totalCopies});

    res.status(200).json(message);
});


export const renew_book = catchAsync(async(req,res) =>{
    const { bookId, copyId} = req.params;
    const student_id = req.user.student_id;

    const message = await renewBook({copyId, student_id});

    res.status(200).json(message);
});


export const issue_book = catchAsync(async (req, res) => {

    const data = req.body;
    const staff_id = req.user.id;
    const loan_period = await getBookLoanPeriod();

    await issueBook(
      data.studentId, 
      data.book_id, 
      loan_period ? loan_period:12, 
      staff_id,
      data.request_id ? data.request_id:null
    );
    res.json({
      message: "book issued successfully"
    });
});


export const return_book = catchAsync(async (req,res) =>{

    const book = req.body;
    const student_id = req.user.student_id;

    const copy_id = book?.copy_id;
    const Returndetails = await returnBook({copy_id, student_id});
   
    // need to improve paymentDays: Returndetails.daysOverdue, 
    if(Returndetails?.fineId){
      res.status(201).json({
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
});


export const request_book = catchAsync(async (req,res) =>{

    const student_id = req.user.student_id;
    const  book_id = req.params.bookId;

    const message = await requestBook({ book_id, student_id});
    res.status(200).json(message);
});


export const new_arrivals = catchAsync(async (req, res) => {

    const user = req?.user || null;
    const { page, limit } = req.query;

    const books = await getNewArrivals({
      user,
      page,
      limit
    });
    res.status(200).json({ books });
});


export const trending_books = catchAsync(async (req, res) => {

    const user = req?.user || null;
    const { page, limit } = req.query;

    const books = await getTrendingBooks({
      user,
      page,
      limit
    });
    res.status(200).json({ books });
});


export const popular_books = catchAsync(async(req,res)=>{

    const { page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 3;

    const books = await getPopularBooks({
      page: pageNum, 
      limit: limitNum
    });
    res.status(200).json(books);
});


export const like_dislike_book = catchAsync(async (req, res) => {

    const student_id = req.user?.student_id || null;
    const book_id = req.params.bookId || null;

    const result = await toggleBookLike({student_id, book_id});
    return res.status(200).json(result);
});


export const get_user_issued_books = catchAsync(async (req, res) => {

    const student_id = req.user.student_id;
    const books = await fetchUserIssuedBooks({ student_id });
    return res.status(200).json(books);
});


export const get_overdue_books = catchAsync(async (req,res) =>{

    const books = await fetchDuebooks();
    res.status(200).json(books);
});


export const get_comments = catchAsync(async(req, res)=>{

    const book_id = req.params.bookId;
    const comments = await getComments({book_id});
    res.status(200).json({comments});
});


export const write_comment = catchAsync(async (req, res) =>{

    const book_id = req.params.bookId;
    const student_id = req.user.student_id;
    const { comment } = req.body;

    const message = await createComment({book_id, student_id, comment});
    res.status(200).json(message);
});


export const update_comment = catchAsync(async(req,res) =>{
    const student_id = req.user.student_id;
    const comment_id = req.params.commentId;
    const { comment } = req.body;

    const message = await updateComment({student_id, comment_id, comment});
    res.status(200).json(message);
});


export const delete_comment = catchAsync(async (req, res) =>{

    const student_id = req.user.student_id;
    const comment_id = req.params.commentId;
    const book_id = req.params.bookId;

    const message = await removeComment({comment_id, student_id, book_id});
    res.status(200).json(message);
});


export const get_book_rating = catchAsync(async (req,res) =>{

    const book_id = req.params.bookId;
    const ratings = await getRating(book_id);
    res.status(200).json(ratings);
});


export const rate_book = catchAsync(async(req, res)=>{

    const book_id = req.params.bookId;
    const student_id = req.user.student_id;
    const { rating } = req.body;

    const result = await addRating({book_id, student_id, rating});
    res.status(200).json(result);
});


export const unrate_book = catchAsync(async(req, res)=>{

    const book_id = req.params.bookId;
    const student_id = req.user.student_id;

    const result = await removeRating({book_id, student_id});
    res.status(200).json(result);
});


export const like_unlike_comment = catchAsync(async(req, res)=>{

    const student_id = req.user.student_id;
    const comment_id = req.params.commentId;

    const message = await likeUnlikeComment({comment_id, student_id})
    res.status(200).json(message);
});