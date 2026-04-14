import { fetchUserIssuedBooks } from "../services/bookIssueService.js"
import { 
    getDepartmentId,
    getStudent, 
    getStudents, 
    getStudentStats, 
    updateStudent,  
    studentActivities ,
    getUserFines
} from "../repositories/userRepository.js";
import pool from "../config/db.js";
import USER_ROLES from "../constants/userRoles.js"

export const fetchStudents = async ({page, limit, search, branch})=>{

    const offset = (page - 1) * limit;
    const { rows, total } = await getStudents(search, branch, limit, offset);

    return {rows, total}
};


export const fetchStudentDetails = async(student_id)=>{

    let student = await getStudent(student_id);
    const books = await fetchUserIssuedBooks({student_id});

    student.books = books.length > 0 ? books : [];
    return student;
};


export const updateStudentDetails = async(student_id, updates)=>{
    let dep_id = null;
    if(updates.branch !== undefined){
        dep_id = await getDepartmentId(updates.branch);
        if (!dep_id) {
            throw new Error("Invalid branch name");
        }
    }
    await updateStudent({
        student_id,
        name : updates.name,
        dep_id,
        contact_no : updates.contact_no,
        address : updates.address
    });

    return {message: "Details updated successfully"}
};


export const getStudentActivities = async({student_id})=>{
    return await studentActivities(student_id);
};


export const getFine = async({student_id, paidFilter , limit, page}) =>{

    const safeLimit = (typeof limit === 'number' && limit > 0 && limit < 7) ? limit : 7;
    const offset = (page - 1) * safeLimit;

    const is_paid = paidFilter === "paid"? 1 : 0;

    const{rows , countResult} = await getUserFines(student_id, is_paid, limit, offset);

    return {records: rows, total: countResult , page, limit};
};


export const payFine = async ({
    fine_id, 
    payment_method, 
    payment_id, 
    amount,
    student_id
}) =>{
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
         const fine = await getFineDetails(fine_id, connection);

        if (!fine) {
          throw new Error("Fine not found or already paid");
        }
    
        const { studentId, fine_amount } = fine;

        if(amount != fine_amount || studentId != student_id){
            throw new Error("Not appropiate amount");
        }

        // 2. Mark fine as paid
        await markFineAsPaid(
          fine_id,
          payment_method,
          payment_id,
          connection
        );
    
        // 3. Update student balance
        await updateStudentFineBalance(
          connection,
          studentId,
          fine_amount
        );
    
        await connection.commit();
        return { message: "Fine paid successfully" };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};


export const fetchStudentStats = async({student_id}) =>{
    const result = await getStudentStats(student_id);
    const issuedBooks = result.books_currently_issued;
    const overdueBooks = result.books_overdue_by_user;
    const requestedBooks = result.total_unfulfilled_requests;
    const availableBooks = result.total_books_count;

    return {
        availableBooks,
        issuedBooks,
        overdueBooks,
        requestedBooks
    }
}

// need changes and modification
export const fetchAdminDetails = async({user_id})=>{
    return user_id;
}


export const fetchUserDetails = async (data)=>{

    if(data.role === USER_ROLES.STUDENT){
        return fetchStudentDetails(data.student_id);
    }
    else{
        return fetchAdminDetails(data.id);
    }
}

export const updateUserDetails  = async(data)=>{
    if(data.role === USER_ROLES.STUDENT){
        return updateStudentDetails(data.student_id);
    }
    else{
        return fetchAdminDetails(data.id);
    }
}