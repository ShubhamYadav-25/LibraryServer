import * as adminRepository from "../repositories/adminRepository.js";
import * as reportRepository from "../repositories/reportRepository.js";
import getDateRange from "../utils/getRangeDate.js";
import { REPORT_TYPES } from "../constants/reportTypes.js"
import ApiError from '../utils/errorHandler.js';



const chartRepositories = {
    
    [REPORT_TYPES.CIRCULATION]:
        reportRepository.getCirculationChart,

    [REPORT_TYPES.OVERDUE]:
        reportRepository.getOverdueChart,

    [REPORT_TYPES.POPULAR_BOOKS]:
        reportRepository.getPopularBooksChart,

    [REPORT_TYPES.INVENTORY]:
        reportRepository.getInventoryChart,

    [REPORT_TYPES.COLLECTION]:
        reportRepository.getCollectionChart,

    [REPORT_TYPES.USER_ACTIVITY]:
        reportRepository.getUserActivityChart,

    [REPORT_TYPES.FINE_COLLECTION]:
        reportRepository.getFineCollectionChart,

    [REPORT_TYPES.DAILY_ACTIVITY]:
        reportRepository.getDailyActivityChart,
};

const TableRepositories = {

    [REPORT_TYPES.CIRCULATION]:
        reportRepository.getCirculationTable,

    [REPORT_TYPES.OVERDUE]:
        reportRepository.getOverdueTable,

    [REPORT_TYPES.POPULAR_BOOKS]:
        reportRepository.getPopularBooksTable,

    [REPORT_TYPES.INVENTORY]:
        reportRepository.getInventoryTable,

    [REPORT_TYPES.COLLECTION]:
        reportRepository.getCollectionTable,

    [REPORT_TYPES.USER_ACTIVITY]:
        reportRepository.getUserActivityTable,

    [REPORT_TYPES.FINE_COLLECTION]:
        reportRepository.getFineCollectionTable,

    [REPORT_TYPES.DAILY_ACTIVITY]:
        reportRepository.getDailyActivityTable,
};


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
};


const getChartData = async({from, to, range, reportType})=>{
    const {start, end} = getDateRange(range, from, to)
    const repo = chartRepositories[reportType];
    if( !repo){
        return []
    }
    const chartData = await repo(start, end);

    return chartData;
};


const getTableData = async({from, to, range, page, limit, reportType})=>{
    const offset = (page-1)*limit;
    const {start, end} = getDateRange(range, from, to);
    const repo = TableRepositories[reportType];
    if( !repo){
        return []
    }
    const tableData = await repo(start, end, limit, offset);

    return tableData;
};

export {
    updateConfig,
    getConfig,
    getStats,
    fetchRecentsActivities,
    getallusertransactions,
    getChartData,
    getTableData,
}