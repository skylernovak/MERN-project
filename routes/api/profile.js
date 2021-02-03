
const { req, res } = require('express');
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator'); // requires to express-validator/check are deprecated, just use require("express-validator")
const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);        // Do i need this? think the issue is resolved in config/db.js
const request = require('request');
const config = require('config');

const Profile = require('../../models/Profile');
const User = require('../../models/UserData');
const Posts = require('../../models/Posts');



// @route       GET api/profile/me
// @desc        Get current users profile
// @access      Private
router.get('/me', auth, async (req, res) => {
    try {
        const profile = await Profile
            .findOne({ user: req.user.id })
            .populate('user', 
                ['name', 'avatar']);
        
                if (!profile) {
            return res.status(400).json( {msg: 'There is no profile for this user'} );
        }

        res.json(profile);

    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route       POST api/profile
// @desc        Create or update user profile
// @access      Private
router.post('/', 
    [
        auth, 
        [
            check('status', 'Status is required')
                .not()
                .isEmpty(),
            check('skills', 'Skills is required')
                .not()
                .isEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            company,
            website,
            location,
            bio,
            status,
            githubusername, 
            skills,
            youtube,
            facebook,
            twitter,
            instagram, 
            linkedin
        } = req.body;

        // Build profile object
        const profileFields = {};
        profileFields.user = req.user.id;
        if (company) profileFields.company = company;
        if (website) profileFields.website = website;
        if (location) profileFields.location = location;
        if (bio) profileFields.bio = bio;
        if (status) profileFields.status = status;
        if (githubusername) profileFields.githubusername = githubusername;
        if (skills) {
            profileFields.skills = skills.split(',').map(skill => skill.trim()); // trims whitespace before commas in comma separated lists.  create data uniformity  // split turns a string into an array, using ',' as a deliminator
        }

        // debugging
        //console.log(profileFields.skills);
        //res.send('Hello');

        // build social object
        profileFields.social = {}
        if(youtube) profileFields.social.youtube = youtube;
        if(facebook) profileFields.social.facebook = facebook;
        if(twitter) profileFields.social.twitter = twitter;
        if(instagram) profileFields.social.instagram = instagram;
        if(linkedin) profileFields.social.linkedin = linkedin;

        // REMEMBER, since we are using a async/await, anytime we use a mongoose method we must use await, because it returns a promise.

        try {
            let profile = await Profile.findOne({ user: req.user.id }); // user is object id, matches req.user.id, which comes from the token

            // if profile exists, update it
            if(profile) {
                //Update
                //Profile.set('userFindAndModify', false);  // I was getting mongoose decpreciation warnings, unless I added this line. The warnings seem to have disappeared now however. I'm not sure of the cause. Perhaps after fixing the error on the next line, it supressed the warning. 
                profile = await Profile.findOneAndUpdate(   // !!! I had an error in my code. It wasn't returning the json profile. I was missing await on this line and it fixed it. 
                    { user: req.user.id }, 
                    { $set: profileFields },
                    { new: true }
                );

                return res.json(profile);
            }

            // if profile does not exist, create it
            profile = new Profile(profileFields);

            await profile.save();
            res.json(profile);
        } catch(err) {
            console.error(err.mesage);
            res.status(500).send('Server Error');
        }
    } 
);

// @route       GET api/profile
// @desc        Get all profiles
// @access      Public
router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', ['name', 'avatar']);
        res.json(profiles);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route       GET api/profile/user/:user_id
// @desc        Get profile by user ID
// @access      Public
router.get('/user/:user_id', async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar']);
        
        if (!profile) {
            return res.status(400).json({ msg: 'Profile not found'});
        }

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        if(err.kind == 'ObjectId') {
            return res.status(400).json({ msg: 'Profile not found'});
        }
        res.status(500).send('Server Error');
    }
});

// @route       DELETE api/profile
// @desc        Delete profile, user, and posts
// @access      Private
router.delete('/', auth, async (req, res) => {
    try {
        // Remove user posts
        await Posts.deleteMany({ user: req.user.id });
        // remove profile
        await Profile.findOneAndRemove({ user: req.user.id });
        // Remove user
        await User.findOneAndRemove({ _id: req.user.id });

        
        res.json({msg: 'User deleted'});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
}); 

// @route       PUT api/profile/experience
// @desc        Add profile experience
// @access      Private
router.put(
    '/experience', 
    [
        auth, 
        [
            check('title', 'Title is required')
                .not()
                .isEmpty(),
            check('company', 'Company is required')
                .not()
                .isEmpty(),
            check('from', 'From Date is required')
                .not()
                .isEmpty(),
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            title,
            company,
            location,
            from, 
            to,
            current,
            description
        } = req.body;

        const newExp = {
            title,
            company,
            location,
            from, 
            to,
            current,
            description
        }

    try {
        const profile = await Profile.findOne({ user: req.user.id });

        profile.experience.unshift(newExp); // push new entries onto the expereience array. unshift() is the same as pushing, but adds it to the front, not the back

        await profile.save();

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
})

// @route       DELETE api/profile/experience/:exp_id
// @desc        delete experience from profile
// @access      Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });                               // get user ID

        // get remove index
        const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);     // find index of experience we want to remove by getting param in URI

        profile.experience.splice(removeIndex, 1);                                                  // remove said experience

        await profile.save();                                                                       // save it

        res.json(profile);                                                                          // return profile
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
})

// @route       PUT api/profile/education
// @desc        Add profile education
// @access      Private
router.put(
    '/education', 
    [
        auth, 
        [
            check('school', 'School is required')
                .not()
                .isEmpty(),
            check('degree', 'Degree is required')
                .not()
                .isEmpty(),
            check('fieldofstudy', 'Field of Study is required')
                .not()
                .isEmpty(),
            check('from', 'From Date is required')
                .not()
                .isEmpty(),
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            school,
            degree,
            fieldofstudy,
            from, 
            to,
            current,
            description
        } = req.body;

        const newEdu = {
            school,
            degree,
            fieldofstudy,
            from, 
            to,
            current,
            description
        }

    try {
        const profile = await Profile.findOne({ user: req.user.id });

        profile.education.unshift(newEdu); // push new entries onto the expereience array. unshift() is the same as pushing, but adds it to the front, not the back

        await profile.save();

        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
})

// @route       DELETE api/profile/education/:edu_id
// @desc        delete education from profile
// @access      Private
router.delete('/education/:edu_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });                               // get user ID

        // get remove index
        const removeIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);     // find index of education we want to remove by getting param in URI

        profile.education.splice(removeIndex, 1);                                                  // remove said education

        await profile.save();                                                                       // save it

        res.json(profile);                                                                          // return profile
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
})

// @route       GET api/profile/github/:username
// @desc        Get user''s repos from Github
// @access      Public
router.get('/github/:username', (req, res) => {
    try {
        const options = {
            uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`,
            method: 'GET',
            headers: { 'user-agent': 'node.js' }
        };

        request(options, (error, response, body) => {
            if(error) console.error(error);

            if(response.statusCode !== 200) {
                return res.status(404).json({ msg: 'No Github profile found' });
            }

            res.json(JSON.parse(body));
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
})

module.exports = router;