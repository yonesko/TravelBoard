'use strict';

angular.module('myApp', [
    'ngRoute',
    'myApp.view1',
    'myApp.view2',
    'myApp.version',
    'uiGmapgoogle-maps'
]).config(['$locationProvider', '$routeProvider', 'uiGmapGoogleMapApiProvider',
    function ($locationProvider, $routeProvider, uiGmapGoogleMapApiProvider) {
        $locationProvider.hashPrefix('!');

        $routeProvider.otherwise({redirectTo: '/view1'});

        uiGmapGoogleMapApiProvider.configure({
               key: 'AIzaSyDq1B4jeCLpaVT7KrzDC2G0XmMcuwUYo_g',
            v: '3.20', //defaults to latest 3.X anyhow
            libraries: 'weather,geometry,visualization'
        });
    }]);
