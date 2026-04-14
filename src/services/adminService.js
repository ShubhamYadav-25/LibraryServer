import * as adminRepository from "../repositories/adminRepository.js";


const updateConfig = async (key, value) => {
    const result = await adminRepository.updateConfig(key, value);
    if(!result) throw new Error("Database Error");
};

const getConfig = async(key)=>{
    const value =  await adminRepository.getConfig(key)
    if(!value) throw new Error("Database Error");
    return value;
}

const getStats = async()=>{
    const stats = await adminRepository.getStats();
    if(!stats) throw new Error("Database Error");
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