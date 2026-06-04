const express = require("express");
const router = express.Router();

const { signupValidation } = require('../validators/authValidator');
const { loginValidation } = require('../validators/authValidator');
const validate = require('../middleware/validate')
const { signup, login, me, verifyEmail } = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

router.post("/signup", signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);
router.get("/me", auth, me);
router.get("/verify-email/:token", verifyEmail);

module.exports = router;