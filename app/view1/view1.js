'use strict';

angular.module('myApp.view1', ['ngRoute'])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/view1', {
            templateUrl: 'view1/view1.html',
            controller: 'View1Ctrl'
        });
    }])

    .controller('View1Ctrl', ['$scope', 'NgMap', function ($scope, NgMap) {
        $scope.test = function (map) {
            new google.maps.Marker({
                position: $scope.tartu,
                map: map
            });
            new google.maps.Marker({
                position: $scope.tallin,
                map: map
            });
        };

        $scope.eestiCenter = {lat: 58.85, lng: 25.64};
        $scope.tallin = {lat: 59.41, lng: 24.75};
        $scope.tartu = {lat: 58.36, lng: 26.72};

        NgMap.getMap().then(function (map) {
            map.setCenter($scope.eestiCenter);
            map.setZoom(8);


        });
    }]);

