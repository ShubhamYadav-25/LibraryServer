import * as adminServices from "../services/adminService.js";
import { catchAsync } from "../utils/errorHandler.js";



export const update_config = catchAsync(async (req, res) => {

    const { key, value } = req.body;

    const message = await adminServices.updateConfig(key, value);
    res.status(200).json(message);
});


export const get_config = catchAsync(async (req, res) =>{

    const {key} = req.query;

    const value = await adminServices.getConfig(key);
    res.status(200).json({value});
});


export const dashboard_stats = catchAsync(async (req, res) =>{

    const stats = await adminServices.getStats();
    res.status(200).json(stats);
});


export const get_all_activities = catchAsync(async(req, res)=>{

    const activities = await adminServices.fetchRecentsActivities();
    res.status(200).json({activities});
});


export const get_transactions = catchAsync(async(req,res) =>{

    const { page, limit, status } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 7;

    const safestatus = status !== undefined? String(status): undefined
    const {data, total} = await adminServices.getallusertransactions({
        pageNum,
        limitNum,
        status: safestatus
    });

    res.status(200).json({
        data,
        total,
        limit : limitNum,
        page : pageNum
    });
});