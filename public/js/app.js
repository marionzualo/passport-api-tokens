'use strict';

/**********************************************************************
 * Angular Application
 **********************************************************************/
var app = angular.module('app', ['ngResource', 'ngRoute'])
    .config(function($routeProvider, $locationProvider, $httpProvider) {

        //================================================
        // Check if the user is connected
        //================================================
        var checkLoggedin = function($q, $timeout, $http, $location, $rootScope){
            // Initialize a new promise
            var deferred = $q.defer();

            // Make an AJAX call to check if the user is logged in
            $http.get('/loggedin').success(function(data){
                // Authenticated
                if (data.authenticated){
                    $timeout(deferred.resolve, 0);
                }
                // Not Authenticated
                else {
                    $rootScope.message = 'You need to log in.';
                    $timeout(function(){deferred.reject();}, 0);
                    $location.url('/login');
                }
            });

            return deferred.promise;
        };


        //================================================
        // Add an interceptor for AJAX errors
        //================================================
        $httpProvider.interceptors.push('authInterceptor');

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
                controller: 'WelcomeCtrl',
                resolve: {
                    loggedin: checkLoggedin
                }
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
        $rootScope.isAuthenticated = false;

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
app.controller('LoginCtrl', function($scope, $rootScope, $http, $location, $window) {
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
                $window.sessionStorage.token = data.token;
                $rootScope.isAuthenticated = true;
                $location.url('/welcome');


                console.log("Finished setting user: " + $scope.user.email + ", Token: " + data.token);
            })
            .error(function(){
                // Error: authentication failed

                // Erase the token if the user fails to log in
                delete $window.sessionStorage.token;
                $scope.isAuthenticated = false;


                $rootScope.message = 'Authentication failed.';
                $location.url('/login');
            });
    };
});

/**********************************************************************
 * WelcomePage controller
 **********************************************************************/
app.controller('WelcomeCtrl', function($scope, $rootScope, $http, $location, $window) {
    // Register the login() function
    $scope.logout = function(){
        var token = Store.getToken();
        Store.removeUser();

        $http.get('/logout')
            .success(function(data){
                // No error: logout OK
                $rootScope.isAuthenticated = false;
                delete $window.sessionStorage.token;

                $rootScope.message = 'Logout successful!';

                $location.url('/login');

            })
            .error(function(){
                // Error: logout failed
                $rootScope.isAuthenticated = false;
                delete $window.sessionStorage.token;
                $rootScope.message = 'Logout failed.';
                $location.url('/login');
            });
    };

});


app.factory('authInterceptor', function ($rootScope, $q, $location, $window) {
    return {
        request: function (config) {
            config.headers = config.headers || {};
            if ($window.sessionStorage.token) {
                config.headers.token = $window.sessionStorage.token;
            }
            return config;
        },
        responseError: function (rejection) {
            if (rejection.status === 401) {
                // handle the case where the user is not authenticated
                $location.url('/login');
            }
            return $q.reject(rejection);
        }
    };
});
