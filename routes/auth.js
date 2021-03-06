const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/user");
const transporter = require("../mailer/mailer");
var createError = require('http-errors');
var jwt = require('jsonwebtoken');

router.post("/signup", (req,res)=> {
    User.findOne({$or: [{username: req.body.username, email: req.body.email}]})
        .then((user)=> {
            if(user) res.send("User with this email or username already exists")
            else {
                bcrypt.hash(req.body.password, 10, function(err, hash) {
                    if(err) res.send(err.message)
                    else {
                        User.create({
                            username: req.body.username,
                            password: hash,
                            email: req.body.email,
                            firstname: req.body.firstname,
                            lastname: req.body.lastname
                        })
                        .then((user)=> {

                            transporter.sendMail({
                                from: '"Fred Foo 👻" <IronhackDemo2@gmail.com>', // sender address
                                to: user.email, // list of receivers
                                subject: 'Welcome to this crappy app! ✔', // Subject line
                                text: 'Hello world?', // plain text body
                                html: `<b>Hello, ${user.firstname}, thank you for signing up.</b>` // html body
                            })
                            .then((info)=> {
                                res.redirect("/auth/login")
                            })
                            .catch((error)=> {
                                res.send("ERROR ERROR")
                            })
                        })
                        .catch((err)=> {
                            res.send(err.message)
                        })
                    }
                })
            }
        })
    })   

router.get("/signup", (req,res)=> {
    res.render("auth/signup");
})

router.post("/login", (req,res)=> {
    User.findOne({username: req.body.username})
        .then((user)=> {
            if(!user) res.json({loggedIn: false}) // this is different
            else {
                bcrypt.compare(req.body.password, user.password, function(err, equal) {
                    if(err) res.send(err);
                    else if(!equal) res.json({loggedIn: false}); // this is different
                    else {
                        req.session.user = user;
                        res.json({loggedIn: true}); // this is different
                    }
                });
            }
        })
        .catch(err=> {
            res.send("error erropr", err);
        })
})

router.get("/login", (req,res)=> {
    res.render("auth/login");
})

router.get("/logout", (req, res)=> {
    req.session.destroy();
    res.redirect("/");
})

router.post("/email-availability", (req,res)=> {
    User.findOne({email: req.body.email})
        .then((user)=> {
            if(user)res.json({available: false})
            else res.json({available: true})
        })
})

router.get("/send-reset", (req,res)=> {
    res.render("auth/send-reset")
})

router.post("/send-reset", (req,res)=> {
    jwt.sign({email: req.body.email}, process.env.jwtSecret, { expiresIn: 60 * 60 }, function(err, token){
        transporter.sendMail({
            from: '"Fred Foo 👻" <IronhackDemo2@gmail.com>', // sender address
            to: req.body.email, // list of receivers
            subject: 'Reset your password ✔', // Subject line
            text: 'Hello world?', // plain text body
            html: `<b>Password reset for crappy app: <a href="http://localhost:3000/auth/reset-password?token=${token}">Reset your password</a></b>` // html body
        })
        .then((result)=> {
            res.send("Email send")
        })
        .catch((err)=> {
            res.next(createError(400))
        })
    })
})

router.get("/reset-password", (req,res)=> {
    res.render("auth/reset-password", {token: req.query.token})
})

router.post("/reset-password", (req,res)=> {
    jwt.verify(req.body.token, process.env.jwtSecret, function(err, token){
        if(err) res.send(err)
        bcrypt.hash(req.body.password, 10, function(err, hash){
            if(err) res.send(err)
            else {
                User.findOneAndUpdate({email: token.email}, {password: hash})
                .then((result)=> {
                    res.redirect("/auth/login")
                })
                .catch((err)=> {
                    res.send(err)
                })
            }
        })
    })
})

module.exports = router;