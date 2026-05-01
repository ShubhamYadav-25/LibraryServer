import * as adminRepository from "../repositories/adminRepository.js";
import ApiError from '../utils/errorHandler.js';



const updateConfig = async (key, value) => {

    if (!key || value === undefined) throw new ApiError(400, "Invalid credentials");
    const result = await adminRepository.updateConfig(key, value);
    if(!result) throw new ApiError(500,"INTERNAL SERVER ERROR");

    return { message: "Config updated successfully"};
};


const getConfig = async(key)=>{
    if(!key) throw new ApiError(400, "Invalid credentials");
    const value =  await adminRepository.getConfig(key);
    if(!value) throw new ApiError(500,"INTERNAL SERVER ERROR");
    return value;
}


const getStats = async()=>{
    const stats = await adminRepository.getStats();
    if(!stats) throw new ApiError(500,"INTERNAL SERVER ERROR");
    return stats;
}


const fetchRecentsActivities = async ()=>{
    return await adminRepository.getRecentActivities();
}


const getallusertransactions = async ({pageNum, limitNum, status})=>{

  const offset = (pageNum - 1) * limitNum;
  const isReturn = status === "active"? true : false;

  const { rows, total } = await adminRepository.getUsertransactions(limitNum, offset, isReturn);
  return {
    data: rows,
    total,
  };
}



export {
    updateConfig,
    getConfig,
    getStats,
    fetchRecentsActivities,
    getallusertransactions,
}