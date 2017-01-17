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
                places_specification_per_point_quota = 1;

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
                            type: placeTypesForSearch
                        }, function (places, status) {
                            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                                console.log('findPlacesAlongRoute ' + status);
                                return;
                            }

                            var delay_ms = (second_ms / radar_second_qouta) * 1.1;
                            for (var i = 0, place; i < places.length && i < places_specification_per_point_quota; i++) {
                                place = places[i];
                                $timeout(function (place) {
                                    return function () {
                                        placesService.getDetails(place, function (placeDetail, status) {
                                            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                                                console.log('getDetails ' + status);
                                                return;
                                            }
                                            addMarkerForPlace(placeDetail);
                                            $scope.placesList.push(placeDetail);
                                        })
                                    };
                                }(place), i * delay_ms);
                            }
                        }
                    )
                }
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
                    title: place.name
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

            function calculateAndDisplayRoute() {
                var waypoitns = [];

                markers.slice(1, markers.length - 1).forEach(function (e) {
                    waypoitns.push({location: e.getPosition()});
                });

                directionsService.route({
                    origin: markers[0].getPosition(),
                    waypoints: waypoitns,
                    destination: markers[markers.length - 1].getPosition(),
                    travelMode: google.maps.TravelMode.DRIVING
                }, function (response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {
                        var route = response.routes[0];
                        $scope.distance = distance(route) / kilo;
                        directionsDisplay.setDirections(response);
                        findPlacesAlongRoute(route);
                    } else {
                        window.alert('Directions request failed due to ' + status);
                    }
                });
            }

            $scope.test = function () {
                markers.push(new google.maps.Marker({
                    position: tartu,
                    map: mapInstance
                }));
                markers.push(new google.maps.Marker({
                    position: tallin,
                    map: mapInstance
                }));

                calculateAndDisplayRoute();
            };

            $scope.placesList = [];
            $scope.distance = 0;

            var placesService;
            var directionsService = new google.maps.DirectionsService;
            var directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
            var markers = [];
            var mapInstance;
            var debug = false;
            var placeTypesForSearch = 'museum';

            NgMap.getMap().then(function (map) {
                mapInstance = map;
                map.setCenter(eestiCenter);
                map.setZoom(8);

                directionsDisplay.setMap(map);
                placesService = new google.maps.places.PlacesService(map);
            });
        }]);



