const Node = require("../models/Nodes");
const Employee = require("../models/Employees");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

exports.createNode = async (req, res) => {
    const {
        name,
        path,
        icon,
        allowedRoles,
        allowedDesignations
    } = req.body;
    const existingNode = await Node.findOne({ path });

    if (existingNode) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.NODE.PATH_EXISTS);
    }
    const node = await Node.create({
        name,
        path,
        icon,
        allowedRoles,
        allowedDesignations
    });
    return sendSuccess(res, STATUS.CREATED, MESSAGES.NODE.CREATED, {
        node
    });
};
exports.updateNode = async (req, res) => {
    const {
        name,
        path,
        icon,
        allowedRoles,
        allowedDesignations
    } = req.body;
    const updateData = {};
    if (name !== undefined) {
        updateData.name = name;
    }

    if (path !== undefined) {
        updateData.path = path;
    }

    if (icon !== undefined) {
        updateData.icon = icon;
    }

    if (allowedRoles !== undefined) {
        updateData.allowedRoles = allowedRoles;
    }

    if (allowedDesignations !== undefined) {
        updateData.allowedDesignations = allowedDesignations;
    }

    const updatedNode = await Node.findOneAndUpdate(
        {
            nodeId: req.params.nodeId
        },

        updateData,

        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedNode) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.NODE.NOT_FOUND);
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.NODE.UPDATED, {
        node: updatedNode
    });
};

exports.deleteNode = async (req, res) => {

    const deletedNode =
        await Node.findOneAndDelete({
            nodeId: req.params.nodeId
        });

    if (!deletedNode) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.NODE.NOT_FOUND);
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.NODE.DELETED);
};

exports.getMyNodes = async (req, res) => {

    const employee = await Employee.findOne({
        employeeCode: req.user.employeeCode
    });

    if (!employee) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    const designation = employee.designation;

    const nodes = await Node.find({

        allowedDesignations: designation

    })
        .select("-_id -__v")
        .sort({ created_at: 1 });

    return sendSuccess(res, STATUS.OK, MESSAGES.NODE.LIST_RETRIEVED, {
        totalNodes: nodes.length,
        nodes
    });
};
