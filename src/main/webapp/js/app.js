angular.module('exampleApp', ['ngRoute', 'ngCookies', 'exampleApp.services'])
//配置
    .config(
        ['$routeProvider', '$locationProvider', '$httpProvider', function ($routeProvider, $locationProvider, $httpProvider) {

            /******配置路由*****/
            $routeProvider.when('/create', {
                templateUrl: 'partials/create.html',
                controller: CreateController
            });

            $routeProvider.when('/edit/:id', {
                templateUrl: 'partials/edit.html',
                controller: EditController
            });

            $routeProvider.when('/login', {
                templateUrl: 'partials/login.html',
                controller: LoginController
            });

            $routeProvider.otherwise({
                templateUrl: 'partials/index.html',
                controller: IndexController
            });

            $locationProvider.hashPrefix('!');

            /*
            配置拦截器(错误拦截器)
            Register error provider that shows message on failed requests or redirects to login page on
             * unauthenticated requests */
            $httpProvider.interceptors.push(function ($q, $rootScope, $location) {
                    return {
                        'responseError': function (rejection) {
                            var status = rejection.status;
                            var config = rejection.config;
                            var method = config.method;
                            var url = config.url;

                            if (status == 401) {
                                $location.path("/login");
                            } else {
                                $rootScope.error = method + " on " + url + " failed with status " + status;
                            }

                            return $q.reject(rejection);
                        }
                    };
                }
            );

            /*
            配置拦截器（token拦截器）
            Registers auth token interceptor, auth token is either passed by header or by query parameter
             * as soon as there is an authenticated user */
            $httpProvider.interceptors.push(function ($q, $rootScope, $location) {
                    return {
                        'request': function (config) {
                            //判断是否rest请求
                            var isRestCall = config.url.indexOf('rest') == 0;

                            //加入accessToken
                            if (isRestCall && angular.isDefined($rootScope.accessToken)) {
                                var accessToken = $rootScope.accessToken;
                                if (exampleAppConfig.useAccessTokenHeader) {
                                    config.headers['X-Access-Token'] = accessToken;
                                } else {
                                    config.url = config.url + "?token=" + accessToken;
                                }
                            }
                            return config || $q.when(config);
                        }
                    };
                }
            );

        }]
    )
    //启动
    .run(function ($rootScope, $location, $cookieStore, UserService) {

        /* Reset error when a new view is loaded */
        $rootScope.$on('$viewContentLoaded', function () {
            delete $rootScope.error;
        });

        //hasRole(role)
        $rootScope.hasRole = function (role) {
            if ($rootScope.user === undefined) {
                return false;
            }

            if ($rootScope.user.roles[role] === undefined) {
                return false;
            }

            return $rootScope.user.roles[role];
        };

        //logout
        $rootScope.logout = function () {
            delete $rootScope.user;
            delete $rootScope.accessToken;
            $cookieStore.remove('accessToken');
            $location.path("/login");
        };

        /* 尝试从cookie中取得用户或者跳转到登录页
        Try getting valid user from cookie or go to login page */
        var originalPath = $location.path();
        $location.path("/login");

        var accessToken = $cookieStore.get('accessToken');
        if (accessToken !== undefined) {
            $rootScope.accessToken = accessToken;
            UserService.get(function (user) {
                $rootScope.user = user;
                $location.path(originalPath);
            });
        }

        //标识初始化成功
        $rootScope.initialized = true;
    });
/*******************************************控制器************************************/

/**
 * IndexController
 *
 * @param $scope
 * @param BlogPostService
 * @constructor
 */
function IndexController($scope, BlogPostService) {
    //查询所有文章
    $scope.blogPosts = BlogPostService.query();
    //
    $scope.deletePost = function (blogPost) {
        blogPost.$remove(function () {
            $scope.blogPosts = BlogPostService.query();
        });
    };
}

/**
 * EditController
 *
 * @param $scope
 * @param $routeParams
 * @param $location
 * @param BlogPostService
 * @constructor
 */
function EditController($scope, $routeParams, $location, BlogPostService) {

    //当前文章
    $scope.blogPost = BlogPostService.get({id: $routeParams.id});

    $scope.save = function () {
        $scope.blogPost.$save(function () {
            $location.path('/');
        });
    };
}

/**
 * CreateController
 *
 * @param $scope
 * @param $location
 * @param BlogPostService
 * @constructor
 */
function CreateController($scope, $location, BlogPostService) {
    $scope.blogPost = new BlogPostService();

    $scope.save = function () {
        $scope.blogPost.$save(function () {
            $location.path('/');
        });
    };
};

/**
 *
 *
 * @param $scope
 * @param $rootScope
 * @param $location
 * @param $cookieStore
 * @param UserService
 * @constructor
 */
function LoginController($scope, $rootScope, $location, $cookieStore, UserService) {

    $scope.rememberMe = false;

    $scope.login = function () {
        UserService.authenticate($.param({
            username: $scope.username,
            password: $scope.password
        }), function (authenticationResult) {
            var accessToken = authenticationResult.token;
            $rootScope.accessToken = accessToken;
            if ($scope.rememberMe) {
                $cookieStore.put('accessToken', accessToken);
            }
            UserService.get(function (user) {
                $rootScope.user = user;
                $location.path("/");
            });
        });
    };
};

/**************************************************************************************************************/
//业务模块
var services = angular.module('exampleApp.services', ['ngResource']);


/**
 * UserService
 */
services.factory('UserService', function ($resource) {
    return $resource('rest/user/:action', {},
        {
            authenticate: {
                method: 'POST',
                params: {'action': 'authenticate'},
                headers: {'Content-Type': 'application/x-www-form-urlencoded'}
            }
        }
    );
});

/**
 * BlogPostService
 *
 */
services.factory('BlogPostService', function ($resource) {
    return $resource('rest/blogposts/:id', {id: '@id'});
});
