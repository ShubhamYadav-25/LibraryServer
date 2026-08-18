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
    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 7;

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


export const get_report_table = catchAsync(async(req,res) =>{

    const { page, limit, from, to, range} = req.query;
    const reportType = req.params.reportType;
    const pageNum = Number.parseInt(page, 10) || 1;
    const limitNum = Number.parseInt(limit, 10) || 20;

    const data = await adminServices.getTableData({
        from, to, range, page: pageNum, limit: limitNum, reportType
    });
    console.log(data)
    res.status(200).json({
        data,
        limit : limitNum,
        page : pageNum
    });
});


export const get_report_chart = catchAsync(async(req, res)=>{
    
    const { from, to, range} = req.query;
    const reportType = req.params.reportType;
    const data = await adminServices.getChartData({from, to, range, reportType});
    console.log(data)
    res.status(200).json(data);
});

export const sync_recommendation_model = catchAsync(async (req, res) => {
    const { force } = req.body || {};
    const { syncRecommendationModel } = await import("../recommendation/SyncRecommendationModel.js");
    const result = await syncRecommendationModel({ force: Boolean(force) });
    res.status(200).json(result);
});