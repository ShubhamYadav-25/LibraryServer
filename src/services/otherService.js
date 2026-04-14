import { getConfig } from "../repositories/adminRepository.js";


export const getBookLoanPeriod = async()=>{
    return getConfig("LOAN_PERIOD_DAYS");
};

export const getMaxBookLimit = async()=>{
    return getConfig("MAX_BOOK_LIMIT");
};