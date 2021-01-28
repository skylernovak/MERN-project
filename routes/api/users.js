const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

const User = require('../../models/UserData');

// @route       POST api/users
// @desc        register user
// @access      Public
router.post('/',[
    check('name', 'Name is required')
        .not()
        .isEmpty(),
    check('email', 'Please include a valid email')
        .isEmail(),
    check('password', 'Please enter a password with 6 or more characters')
        .isLength({ min: 6})
],
 async (req, res) => {
     const errors = validationResult(req);
     if (!errors.isEmpty()) {   // if errors exist
         return res.status(400).json({ errors: errors.array() });
     }

     const { name, email, password } = req.body;

     // see if user exisists
     // if user does exisist, send error. only 1 acct
     // get user gravatar
     // encrypt password
     // return json web token
     try {
         let user = await User.findOne({email});
         if(user) { // if user doesn't exist, send error
             return res.status(400).json({ errors: [ {msg: 'User already exists'}] });
         }

         const avatar = gravatar.url(email, {
             s: '200',  // size
             r: 'pg',   // only PG images (no nudes!)
             d: 'mm'    // ? default img?
         })

         // create new instance of User object. need to encrypt password before saving
         user = new User({
             name,
             email,
             avatar,
             password
         });

         const salt = await bcrypt.genSalt(10); // 10 rounds, doc recommened. More rounds, harder to crack. takes longer. salt used to hash password

         user.password = await bcrypt.hash(password, salt);

         // await note: returns a promise. anything that returns a promise needs await, as we are using async/await
         await user.save();

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