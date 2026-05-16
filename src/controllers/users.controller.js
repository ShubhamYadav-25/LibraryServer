import { cancelRequest, deleteRequest, fetchRequest, fetchRequests } from "../services/bookRequestService.js";
import {  
  fetchStudents, 
  fetchStudentStats, 
  fetchUserDetails,
  getFine, 
  getStudentActivities, 
  payFine, 
  payFines, 
  updateStudentDetails,  
} from "../services/userService.js";
import { catchAsync } from "../utils/errorHandler.js";



export const get_students = catchAsync(async (req,res) =>{

    const { page, limit, search, department } = req.query;

    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const limitNum = Number(limit) > 0 ? Number(limit) : 7;
    
    const normalizedSearch = search?.trim() || null;
    const branch = department?.trim() || null;

    const data = await fetchStudents({
        page: pageNum,
        limit: limitNum,
        search: normalizedSearch,
        branch
    });

    res.status(200).json({
        data: data.rows,
        total: data.total,
        page: pageNum,
        limit: limitNum
    });
});


export const get_user_detail = catchAsync(async (req,res) =>{

    const user = req.user;
    const data = await fetchUserDetails(user);
    res.status(200).json({user : data});
});


export const update_student = catchAsync(async (req,res) =>{
 
    const user = req.user;
    const {name, department, phone, address} = req.body;
    const updates = {
        name,
        branch: department,
        contact_no: phone,
        address
    };
    const message = await updateStudentDetails(user, updates);
    res.status(200).json(message);
});

// pending need to complete
// export const delete_user = async (req,res) =>{
  
//     const {student_id} = String(req.params.studentId);
//     if (String(student_id) !== req.user.student_id) {
//         return res.status(403).json({ error: "Unauthorized access" });
//     }
 
// }

// pending need to complete
// export const user_notification = async (req,res) =>{

// }


export const get_fines = catchAsync(async (req, res) => {
 
    const student_id  = req.user.student_id;
    const { status, limit, page } = req.query;
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 7, 1), 50);
    const paidFilter = status !== undefined ? String(status) : "unpaid";

    const result = await getFine({
        student_id,
        paidFilter,
        limit: limitNum,
        page: pageNum
    });
    return res.status(200).json(result);
});


export const pay_fine = catchAsync(async (req,res) =>{
 
    const { fine_id, payment_method, payment_id, amount} = req.body;
    const student_id = req.user.student_id;

    const message = await payFine({fine_id, payment_method, payment_id, amount, student_id});
    res.status(200).json(message);
});


export const pay_fines = catchAsync(async(req, res)=>{
  
    const student_id = req.user.student_id;
    const { payment_method, payment_id, amount} = req.body;

    const message = await payFines({student_id, payment_method, payment_id, amount});
    res.status(200).json(message);
});


export const get_student_activities = catchAsync(async (req,res) =>{
 
    const student_id = req.user.student_id;
    const activities = await getStudentActivities({student_id});
    res.status(200).json({activities})
});


export const get_student_stats = catchAsync(async (req, res) =>{
 
    const student_id = req.user.student_id;
    const data = await fetchStudentStats({student_id});
    res.status(200).json(data);
});


export const get_all_requests = catchAsync(async (req, res) =>{

    const {page, limit, mode} = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 7;
    const safemode = mode !== undefined? String(mode): 'passive';
    const { data, total} = await fetchRequests({pageNum, limitNum, safemode});

    res.status(200).json({ 
        data, 
        total,
        page: pageNum,
        limit: limitNum
    });
});


export const get_requests = catchAsync(async (req, res) =>{

    const student_id = req.user.student_id;
    const {page, limit, mode}  = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 7;

    const data = await fetchRequest({
        student_id, 
        mode, 
        page: pageNum, 
        limit: limitNum
    });
    res.status(200).json(data);
});


export const cancel_request = catchAsync(async (req, res) =>{

    const request_id  = req.params.requestId;
    const message = await cancelRequest({request_id});
    res.status(200).json(message);
});


export const delete_requests = catchAsync(async (req, res) =>{

    const  request_id  = Number(req.params.requestId);
    const  student_id  = String(req.params.studentId);
    const message = deleteRequest({request_id, student_id});
    res.status(200).json(message);
});