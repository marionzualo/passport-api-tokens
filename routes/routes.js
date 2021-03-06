'use strict';

var path = require('path');
var config = require(path.join(__dirname, '..', '/config/config.js'));
var Account = require(path.join(__dirname, '..', '/models/account'));
var Token = require(path.join(__dirname, '..', '/models/account')).Token;
var flash = require(path.join(__dirname, '..', '/include/utils')).flash;

/**
* @module Routes
*/

module.exports = function (app, passport) {
    /**
    * Default route for app, currently displays signup form.
    *
    * @param {Object} req the request object
    * @param {Object} res the response object
    */
    app.get('/', function (req, res) {
        res.render('index', {info: null, err: null});
    });


    /**
    * Post method to register a new user
    *
    * @param {Object} req the request object
    * @param {Object} res the response object
    */
    app.post('/register', function(req, res) {
        var name = req.body.fullname;
        var email = req.body.email;
        var password = req.body.password;
        var user = new Account({full_name: name,email: email});
        var message;

        Account.register(user, password, function(error, account) {
            if (error) {
                if (error.name === 'BadRequesterroror' && error.message && error.message.indexOf('exists') > -1) {
                    message = flash(null, 'Sorry. That email already exists. Try again.');
                }
                else if (error.name === 'BadRequesterroror' && error.message && error.message.indexOf('argument not set')) {
                    message =  flash (null, 'It looks like you\'re missing a required argument. Try again.');
                }
                else {
                    message = flash(null, 'Sorry. There was an error processing your request. Please try again or contact technical support.');
                }

                res.send(401, message);
            }
            else {
                //Successfully registered user
                res.json({message: "Thanks for registering"});
            }
        });
    });

    //Route that authenticates the user
    app.post('/token/', passport.authenticate('local', {session: false}), function(req, res) {
        if (req.user) {
            Account.createUserToken(req.user.email, function(err, usersToken) {
                // console.log('token generated: ' +usersToken);
                // console.log(err);
                if (err) {
                    console.log('Issue generating token');
                    console.log(err);
                    res.send(401, 'Authentication error');
                } else {
                    res.json({token : usersToken});
                }
            });
        } else {
            res.send(401, 'Authentication error');
        }
    });

    function isAuthenticated(token, cb) {
        if(token === undefined){
            cb(false);
            return;
        }
        var tokenDecoded = Account.decode(token);

        if (tokenDecoded && tokenDecoded.email) {
            Account.findUser(tokenDecoded.email, token, function(err, user) {
                if (err) {
                    console.log(err);
                    cb(false);
                    return;
                } else {
                    if (Token.hasExpired(user.token.date_created)) {
                        console.log("Token expired.");
                        cb(false);
                        return;
                    } else {
                        cb(true);
                        return;
                    }
                }
            });
        }
    };

    // Define a middleware function to be used for every secured routes
    var auth = function(req, res, next){
        var token = req.headers.token;
        isAuthenticated(token, function(isLoggedIn){
           if(isLoggedIn){
               next();
           } else{
               res.send(401);
           }
        });
    };

    // route to test if the user is logged in or not
    app.get('/loggedin', auth, function(req, res) {
        res.json({authenticated: true});
    });

    app.get('/welcome', auth, function(req, res) {
        //Authentication is done through the middleware
        res.json({message: 'Hello World!'})
    });

    app.get('/logout(\\?)?', function(req, res) {
        var incomingToken = req.headers.token;
        console.log('LOGOUT: incomingToken: ' + incomingToken);
        if (incomingToken) {
            var decoded = Account.decode(incomingToken);
            if (decoded && decoded.email) {
                console.log("past first check...invalidating next...")
                Account.invalidateUserToken(decoded.email, function(err, user) {
                    console.log('Err: ', err);
                    console.log('user: ', user);
                    if (err) {
                        console.log(err);
                        res.send(401, 'Issue finding user (in unsuccessful attempt to invalidate token).');
                    } else {
                        console.log("sending 200")
                        res.json({message: 'logged out'});
                    }
                });
            } else {
                console.log('Whoa! Couldn\'t even decode incoming token!');
                res.send(401, 'Issue decoding incoming token.');
            }
        }
    });

};
