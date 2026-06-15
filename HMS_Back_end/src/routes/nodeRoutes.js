const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRolesMiddleware");
const controller = require("../controllers/nodeController");
const { STAFF_DESIGNATIONS, RESTRICTED_ROLES } = require("../constants/domain");

router.use(auth);

const createNodeValidation = [
    body("name")
        .notEmpty()
        .withMessage("Node name is required"),
    body("path")
        .notEmpty()
        .withMessage("Node path is required")
        .matches(/^\/.*/)
        .withMessage("Path must start with /"),
    body("allowedDesignations")
        .isArray({ min: 1 })
        .withMessage("At least one allowed designation is required"),
    body("allowedDesignations.*")
        .isIn([...STAFF_DESIGNATIONS, ...RESTRICTED_ROLES])
        .withMessage("Valid designation is required")
];

const updateNodeValidation = [
    param("nodeId")
        .notEmpty()
        .withMessage("Node ID is required"),
    body("name")
        .optional()
        .notEmpty()
        .withMessage("Node name cannot be empty"),
    body("path")
        .optional()
        .notEmpty()
        .withMessage("Node path cannot be empty")
        .matches(/^\/.*/)
        .withMessage("Path must start with /"),
    body("allowedDesignations")
        .optional()
        .isArray({ min: 1 })
        .withMessage(
            "At least one allowed designation is required"
        ),

    body("allowedDesignations.*")
        .optional()
        .isIn([...STAFF_DESIGNATIONS, ...RESTRICTED_ROLES])
        .withMessage("Valid designation is required")
];
const nodeIdValidation = [

    param("nodeId")
        .notEmpty()
        .withMessage("Node ID is required")
];

router.post(
    "/create-node",
    authorizeRoles("ADMIN", "OWNER"),
    createNodeValidation,
    validate,
    controller.createNode
);

router.put(
    "/update-node/:nodeId",
    authorizeRoles("ADMIN", "OWNER"),
    updateNodeValidation,
    validate,
    controller.updateNode
);

router.delete(
    "/delete-node/:nodeId",
    authorizeRoles("ADMIN", "OWNER"),
    nodeIdValidation,
    validate,
    controller.deleteNode
);

router.get(
    "/my-nodes",
    controller.getMyNodes
);

module.exports = router;
