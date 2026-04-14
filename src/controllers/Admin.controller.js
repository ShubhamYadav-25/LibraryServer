import * as adminServices from "../services/adminService.js";




export const update_config = async (req, res) => {
    try {
        const { key, value } = req.body;

        if (!key || value === undefined) {
            return res.status(400).json({
                error: "Key and value are required"
            });
        }

        const result = await adminServices.updateConfig(key, value);

        res.status(200).json({
            message: "Config updated successfully",
            affectedRows: result
        });

    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({
            error: error.message || "Server error"
        });
    }
};

export const get_config = async (req, res) =>{
    try {
        const {key} = req.body;
        if(!key) throw new Error("Invalid Input");

        const value = await adminServices.getConfig(key);

        res.status(200).json({value});

    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({
            error: error.message || "Server error"
        });
    }
}

export const dashboard_stats = async (req, res) =>{
    try {

        const stats = await adminServices.getStats();
        res.status(200).json(stats);

    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({
            error: error.message || "Server error"
        });
    }
}

export const get_all_activities = async(req, res)=>{
    try {

        const activities = await adminServices.fetchRecentsActivities();
        
        res.status(200).json({activities});
        
    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({
            error: error.message || "Server error"
        });
    }
}

export const get_transactions = async(req,res) =>{
    try {
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
        
    } catch (error) {
        console.error("Error updating config:", error);
        res.status(500).json({
            error: error.message || "Server error"
        });
    }
}