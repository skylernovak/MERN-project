const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

const User = require('../../models/UserData');

// @route       GET api/auth
// @desc        Test route
// @access      Public
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route       POST api/auth
// @desc        Authenticate user and get token
// @access      Public
router.post(
    '/',
    [
        check('email', 'Please include a valid email')
            .isEmail(),
        check('password', 'PAssword is required')
            .exists()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {   // if errors exist
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // see if user exisists
        // if user does exisist, send error. only 1 acct
        // get user gravatar
        // encrypt password
        // return json web token
        try {
            let user = await User.findOne({email});
            if(!user) { // if user doesn't exist, send error
                return res.status(400).json({ errors: [ {msg: 'Invalid credentials'}] });
            }

            const isMatch = await bcrypt.compare(password, user.password); // (plaintext password, encrypted password)

            if (!isMatch) {
                return res.status(400).json({ errors: [ {msg: 'Invalid credentials'}] });
            }

            const payload = {
                user: {
                    id: user.id
                }
            }

            jwt.sign(
                payload,  
                config.get('jwtSecret'),
                { expiresIn: 360000},  // 3600 = 1 hr, reduce to this number before deploy. for debugging keep it high
                (err, token) => {
                    if(err) throw err;
                    res.json({token});
                });
        } catch (err) {
            console.err(err.message);
            res.status(500).send('Server error');
        }
});

module.exports = router;