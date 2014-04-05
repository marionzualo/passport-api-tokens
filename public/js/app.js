'use strict';

/**********************************************************************
 * Angular Application
 **********************************************************************/
var app = angular.module('app', ['ngResource', 'ngRoute'])
    .config(function($routeProvider, $locationProvider, $httpProvider) {


        //================================================
        // Add an interceptor for AJAX errors
        //================================================
        $httpProvider.responseInterceptors.push(function($q, $location) {
            return function(promise) {
                return promise.then(
                    // Success: just return the response
                    function(response){
                        return response;
                    },
                    // Error: check the error status to get only the 401
                    function(response) {
                        if (response.status === 401)
                            $location.url('/login');
                        return $q.reject(response);
                    }
                );
            }
        });

        //================================================
        // Define all the routes
        //================================================
        $routeProvider
            .when('/', {
                templateUrl: '/views/register.html',
                controller: 'RegisterCtrl'
            })
            .when('/welcome', {
                templateUrl: 'views/welcome.html',
                controller: 'WelcomeCtrl'
            })
            .when('/login', {
                templateUrl: 'views/login.html',
                controller: 'LoginCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });
        //================================================
    })// end of config()
    .run(function($rootScope, $http){
        window.Store = {
            user: null,
            setUser: function(user) {
                this.user = user;
            },
            getUser: function() {
                return this.user;
            },
            getToken: function() {
                return this.user ? this.getUser().token : null;
            },
            removeUser: function() {
                delete this.user;
            }
        };

        $rootScope.message = '';

        // Logout function is available in any pages
        $rootScope.logout = function(){
            $rootScope.message = 'Logged out.';
            $http.post('/logout');
        };
    });

/**********************************************************************
 * Register controller
 **********************************************************************/
app.controller('RegisterCtrl', function($scope, $rootScope, $http, $location) {
    // This object will be filled by the form
    $scope.user = {};

    // Register the login() function
    $scope.register = function(){
        $http.post('/register', {
            fullname: $scope.user.fullname,
            email: $scope.user.email,
            password: $scope.user.password
        })
            .success(function(data){
                // No error: registration OK
                $rootScope.message = data.message;
                $location.url('/login');
            })
            .error(function(){
                // Error: registration failed
                $rootScope.message = 'Registration failed.';
                $location.url('/');
            });
    };
});

/**********************************************************************
 * Login controller
 **********************************************************************/
app.controller('LoginCtrl', function($scope, $rootScope, $http, $location) {
    // This object will be filled by the form
    $scope.user = {};

    // Register the login() function
    $scope.login = function(){
        $http.post('/token/', {
            email: $scope.user.email,
            password: $scope.user.password
        })
            .success(function(data){
                // No error: authentication OK
                $rootScope.message = 'Authentication successful!';
                $location.url('/welcome');
                Store.setUser({email: $scope.user.email, token: data.token});
                console.log("Finished setting user: " + $scope.user.email + ", Token: " + data.token);
            })
            .error(function(){
                // Error: authentication failed
                $rootScope.message = 'Authentication failed.';
                $location.url('/login');
            });
    };
});

/**********************************************************************
 * WelcomePage controller
 **********************************************************************/
app.controller('WelcomeCtrl', function($scope, $rootScope, $http, $location) {
    // Register the login() function
    $scope.logout = function(){
        var token = Store.getToken();
        Store.removeUser();

        $http.post('/logout', {
            email: $scope.user.email,
            password: $scope.user.password
        })
            .success(function(data){
                // No error: authentication OK
                $rootScope.message = 'Authentication successful!';
                $location.url('/welcome');
                Store.setUser({email: $scope.user.email, token: data.token});
                console.log("Finished setting user: " + $scope.user.email + ", Token: " + data.token);
            })
            .error(function(){
                // Error: authentication failed
                $rootScope.message = 'Authentication failed.';
                $location.url('/login');
            });
    };

});
