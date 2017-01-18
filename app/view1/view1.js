'use strict';

angular.module('myApp.view1', ['ngRoute'])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/view1', {
            templateUrl: 'view1/view1.html',
            controller: 'View1Ctrl'
        });
    }])
    .controller('View1Ctrl', ['$scope', 'NgMap', '$timeout',
        function ($scope, NgMap, $timeout) {
            const
                kilo = 1000,
                second_ms = 1000,
                radar_radius_m = 20 * kilo,
                radar_second_qouta = 2,
                centralRussia = {lat: 57.452744, lng: 33.238945},
                eestiCenter = new google.maps.LatLng(58.85, 25.64),
                tallin = {lat: 59.41, lng: 24.75},
                tartu = {lat: 58.36, lng: 26.72},
                reutov = {lat: 55.759970, lng: 37.859058},
                places_specification_per_point_quota = 1,
                supported_place_types = ['museum', 'bar', 'restaurant', 'casino'];

            function distance(route) {
                var sum = 0;
                route.legs.forEach(function (leg) {
                    sum += leg.distance.value;
                });
                return sum;
            }

            function radar(center) {
                return function () {
                    if (debug) {
                        new google.maps.Circle({
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.8,
                            strokeWeight: 0,
                            fillColor: '#FF0000',
                            fillOpacity: 0.35,
                            map: mapInstance,
                            center: center,
                            radius: radar_radius_m
                        });
                    }

                    placesService.radarSearch({
                            location: center,
                            radius: radar_radius_m,
                            type: $scope.placeTypeForSearch
                        }, function (places, status) {
                            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                                console.log('findPlacesAlongRoute ' + status);
                                return;
                            }

                            var delay_ms = (second_ms / radar_second_qouta) * 1.1;
                            for (var i = 0, place; i < places.length && i < places_specification_per_point_quota; i++) {
                                place = places[i];

                                if (isPlaceAlreadyFound(place))
                                    continue;

                                $timeout(function (place) {
                                    return function () {
                                        placesService.getDetails(place, function (placeDetail, status) {
                                            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                                                console.log('getDetails ' + status);
                                                return;
                                            }
                                            addMarkerForPlace(placeDetail);
                                            $scope.foundPlaces.push(placeDetail);
                                            // console.log($scope.foundPlaces)
                                        })
                                    };
                                }(place), i * delay_ms);
                            }
                        }
                    )
                }
            }

            function isPlaceAlreadyFound(place) {
                for (var i in $scope.foundPlaces)
                    if ($scope.foundPlaces[i].place_id == place.place_id)
                        return true;
                return false;
            }

            function addMarkerForPlace(place) {
                place.marker = new google.maps.Marker({
                    map: mapInstance,
                    position: place.geometry.location,
                    icon: {
                        url: place.icon,
                        anchor: new google.maps.Point(10, 10),
                        scaledSize: new google.maps.Size(20, 34)
                    },
                    title: place.name,
                    clickable: false
                });
                place.denotionMarker = new google.maps.Marker({
                    map: mapInstance,
                    position: place.geometry.location,
                    visible: false
                });

                new MapLabel({
                    text: place.name,
                    position: place.geometry.location,
                    map: mapInstance,
                    align: 'right'
                });

            }

            function findPlacesAlongRoute(route) {
                var dist = distance(route);
                var step = Math.ceil((2 * radar_radius_m) / (dist / route.overview_path.length));
                var delay_ms = (second_ms / radar_second_qouta) * 1.1;

                for (var i = 0, cou = 0; i < route.overview_path.length; i += step, cou++) {
                    $timeout(radar(route.overview_path[i]), cou * delay_ms);
                }
                $timeout(radar(route.overview_path[route.overview_path.length - 1]), cou * delay_ms);
            }

            $scope.calculateAndDisplayRoute = function () {
                $scope.distance = 0;

                if (waypoitns.length == 0)
                    return;

                var interpoints = [];

                waypoitns.slice(1, waypoitns.length - 1).forEach(function (e) {
                    interpoints.push({location: e.getPosition()});
                });

                directionsService.route({
                    origin: waypoitns[0].getPosition(),
                    waypoints: interpoints,
                    destination: waypoitns[waypoitns.length - 1].getPosition(),
                    travelMode: google.maps.TravelMode.DRIVING
                }, function (response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {
                        var route = response.routes[0];
                        $scope.distance = Math.round(distance(route) / kilo);
                        directionsDisplay.setDirections(response);
                        findPlacesAlongRoute(route);
                    } else {
                        window.alert('Directions request failed due to ' + status);
                    }
                });
            };

            $scope.markerDrawed = function (marker) {
                waypoitns.push(marker);
            };
            $scope.test = function () {
                waypoitns.push(new google.maps.Marker({
                    position: tartu,
                    map: mapInstance
                }));
                waypoitns.push(new google.maps.Marker({
                    position: tallin,
                    map: mapInstance
                }));

                $scope.calculateAndDisplayRoute();
            };

            $scope.foundPlaces = [];
            $scope.distance = 0;
            $scope.placeTypeForSearch = supported_place_types[0];
            $scope.supported_place_types = supported_place_types;

            var placesService;
            var directionsService = new google.maps.DirectionsService;
            var directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
            var waypoitns = [];
            var mapInstance;
            var debug = false;

            NgMap.getMap().then(function (map) {
                mapInstance = map;
                map.setCenter(eestiCenter);
                map.setZoom(8);

                directionsDisplay.setMap(map);
                placesService = new google.maps.places.PlacesService(map);
            });
        }]);



