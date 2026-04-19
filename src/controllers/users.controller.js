import { cancelRequest, deleteRequest, fetchRequest, fetchRequests } from "../services/bookRequestService.js";
import {  
  fetchStudents, 
  fetchStudentStats, 
  fetchUserDetails,
  getFine, 
  getStudentActivities, 
  payFine, 
  updateStudentDetails,  
} from "../services/userService.js";



export const get_students = async (req,res) =>{
  try {
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

    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}


export const get_user_detail = async (req,res) =>{
    try {
        const data = req.user;
        if(!data) throw new Error("Invalid User");

        const user = await fetchUserDetails(data);

        res.status(200).json(user);
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}


export const update_student = async (req,res) =>{
  try {
    const student_id = req.user.student_id;

    let {name, branch, contact_no, address} = req.body;
    const updates = {
      name: name ?? null,
      branch,
      contact_no,
      address
    };

    const message = await updateStudentDetails(student_id, updates);
    
    res.status(200).json(message);

  } catch (error) {
    console.error("Error updating student details:", error);

    if (error.message === "Invalid user" || error.message === "Invalid branch name") {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

// pending need to complete
export const delete_user = async (req,res) =>{
    try {
        const {student_id} = String(req.params.studentId);
        if (String(student_id) !== req.user.student_id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}

// pending need to complete
export const user_notification = async (req,res) =>{
    try {
        
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}


export const get_fines = async (req, res) => {
    try {
        const student_id  = req.user.student_id;

        const { status, limit, page } = req.query;

        const pageNum = Math.max(Number(page) || 1, 1);
        const limitNum = Math.min(Math.max(Number(limit) || 7, 1), 50);

        if (student_id !== req.user.student_id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        const paidFilter = status !== undefined ? String(status) : "unpaid";

        const result = await getFine({
            student_id,
            paidFilter,
            limit: limitNum,
            page: pageNum
        });

        return res.status(200).json(result);

    } catch (error) {
        console.error("Error fetching fines:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};


export const pay_fine = async (req,res) =>{
    try {
        const { fine_id, payment_method, payment_id, amount} = req.body;
        const { student_id} = String(req.params.studentId);

        if (student_id !== req.user.student_id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        const message = await payFine({ fine_id, payment_method, payment_id, amount, student_id});

        res.status(200).json({ message});

    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}


export const get_student_activities = async (req,res) =>{
    try {

        const student_id = req.user.student_id;
        const activities = await getStudentActivities({student_id});

        res.status(200).json({activities})
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}


export const get_student_stats = async (req, res) =>{
    try {
        // const {student_id} = String(req.params.studentId);
        // if(student_id != req.user.student_id){
        //     throw new Error("Invalid User")
        // }

        const student_id = req.user.student_id;

        const data = await fetchStudentStats({student_id});

        res.status(200).json(data);
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}


export const get_all_requests = async (req, res) =>{
    try {
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
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}


export const get_requests = async (req, res) =>{
    try {
        const student_id = req.user.student_id;
        const {page, limit, mode}  = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 7;

        console.log(page, limit, mode, pageNum, limitNum);
        const data = await fetchRequest({
            student_id, 
            mode, 
            page: pageNum, 
            limit: limitNum
        });
        res.status(200).json(data);
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}


export const cancel_request = async (req, res) =>{
    try {
        const request_id  = req.params.requestId;
        const message = await cancelRequest({request_id});

        res.status(200).json(message);
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({message: error.message});
    }
}


export const delete_requests = async (req, res) =>{
    try {
        const { request_id } = Number(req.params.requestId);
        const { student_id } = String(req.params.studentId);
        const message = deleteRequest({request_id, student_id});

        res.status(200).json(message);
    } catch (error) {
        console.error("Error fetching books:", error);
        return res.status(500).json({ error: "Server side error" });
    }
}