'use strict';

angular.module('myApp.view1', ['ngRoute'])

    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/view1', {
            templateUrl: 'view1/view1.html',
            controller: 'View1Ctrl'
        });
    }])
    .controller('View1Ctrl', ['$scope', 'NgMap', '$timeout', '$log',
        function ($scope, NgMap, $timeout, $log) {
            const
                kilo = 1000,
                radar_radius_m = 20 * kilo,
                centralRussia = {lat: 57.452744, lng: 33.238945},
                eestiCenter = new google.maps.LatLng(58.85, 25.64),
                australia = new google.maps.LatLng(-36.40, 145.33),
                tallin = {lat: 59.41, lng: 24.75},
                tartu = {lat: 58.36, lng: 26.72},
                reutov = {lat: 55.759970, lng: 37.859058},
                places_specification_per_point_quota = 1,
                places_request_delay_ms = 100,
                supported_place_types = ['museum', 'bar', 'restaurant', 'casino'];

            function distance(route) {
                var sum = 0;
                route.legs.forEach(function (leg) {
                    sum += leg.distance.value;
                });
                return sum;
            }

            function isPlaceAlreadyFound(place) {
                // $log.log(place, $scope.foundPlaces);
                for (var i = 0; i < $scope.foundPlaces.length; i++)
                    if ($scope.foundPlaces[i].place_id === place.place_id)
                        return true;
                return false;
            }

            function addMarkerForPlace(place) {
                //mark place on the map
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
                //add place name on the map
                place.mapLabel = new MapLabel({
                    text: place.name.length > 25 ? place.name.substring(0, 25) + '...' : place.name,
                    position: place.geometry.location,
                    map: mapInstance,
                    align: 'right'
                });
            }

            function processPlacesRequestQueue() {
                var request = placesRequestQueue.shift();
                if (request)
                    request();
                // else
                //     clearInterval(processPlacesRequestIntervalId);
            }

            function addToPlacesRequesQueue(request) {
                placesRequestQueue.push(request);
            }

            $scope.cancelVisit = function (place) {
                console.log('cancel ' + place.name);
            };

            //add a waypoint and marker for it
            $scope.visit = function (place) {
                var ind;
                if ((ind = waypoints.indexOf(place.marker)) >= 0) {
                    waypoints.splice(ind, 1);
                    $scope.buildRoute();
                } else {
                    waypoints.splice(1, 0, place.marker);
                    $scope.buildRoute();
                }
            };


            $scope.findPlacesAlongRoute = function () {
                if (!route)
                    return;

                var dist = distance(route);
                var step = Math.ceil((2 * radar_radius_m) / (dist / route.overview_path.length));

                for (var i = 0; i < route.overview_path.length; i += step) {
                    if ($scope.debug) {
                        new google.maps.Circle({
                            strokeColor: '#FF0000',
                            strokeOpacity: 0.8,
                            strokeWeight: 0,
                            fillColor: '#FF0000',
                            fillOpacity: 0.35,
                            map: mapInstance,
                            center: route.overview_path[i],
                            radius: radar_radius_m
                        });
                    }

                    var radarWrapper = function (center) {
                        return function () {
                            placesService.radarSearch({
                                location: center,
                                radius: radar_radius_m,
                                type: $scope.placeTypeForSearch
                            }, function (places, status) {
                                if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                                    setTimeout(radarWrapper(center), places_request_delay_ms);
                                    // $log.error('findPlacesAlongRoute radarSearch ' + status);
                                    return;
                                }

                                if (status !== google.maps.places.PlacesServiceStatus.OK) {
                                    $log.error('findPlacesAlongRoute radarSearch ' + status);
                                    return;
                                }

                                var detailsWrapper = function (place) {
                                    return function () {
                                        placesService.getDetails(place, function (placeDetail, status) {
                                            if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                                                setTimeout(detailsWrapper(place), places_request_delay_ms);
                                                // $log.error('findPlacesAlongRoute radarSearch ' + status);
                                                return;
                                            }

                                            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                                                $log.error('findPlacesAlongRoute getDetails ' + status);
                                                return;
                                            }
                                            addMarkerForPlace(placeDetail);
                                            $scope.foundPlaces.push(placeDetail);
                                            $scope.$apply();
                                        });
                                    }
                                };

                                for (var i = 0, place; i < places.length && i < places_specification_per_point_quota; i++) {
                                    place = places[i];

                                    if (!isPlaceAlreadyFound(place)) {
                                        setTimeout(detailsWrapper(place), places_request_delay_ms);
                                    }
                                }
                            });
                        }
                    };

                    setTimeout(radarWrapper(route.overview_path[i]), places_request_delay_ms);
                }
            };

            $scope.buildRoute = function () {
                if (waypoints.length == 0)
                    return;

                $scope.distance = 0;

                var interpoints = [];

                waypoints.slice(1, waypoints.length - 1).forEach(function (p) {
                    interpoints.push({location: p.getPosition()});
                });

                directionsService.route({
                    origin: waypoints[0].getPosition(),
                    waypoints: interpoints,
                    destination: waypoints[waypoints.length - 1].getPosition(),
                    travelMode: google.maps.TravelMode.DRIVING,
                    optimizeWaypoints: true
                }, function (response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {
                        route = response.routes[0];
                        $scope.distance = Math.round(distance(route) / kilo);
                        directionsDisplay.setDirections(response);
                        $scope.$apply();
                    } else {
                        $log.error('Directions request failed due to ' + status);
                    }
                });
            };

            $scope.markerDrawed = function (marker) {
                if (waypoints.length == 0) {
                    marker.setLabel('A');
                }
                if (waypoints.length >= 1) {
                    if (waypoints.length >= 2) {
                        waypoints[waypoints.length - 1].setLabel(null);
                    }
                    marker.setLabel('B');
                }
                waypoints.push(marker);
            };

            $scope.test = function () {
                waypoints.push((new google.maps.Marker({
                    position: tartu,
                    map: mapInstance,
                    label: 'A'
                })));
                waypoints.push((new google.maps.Marker({
                    position: tallin,
                    map: mapInstance,
                    label: 'B'
                })));
            };

            $scope.clearInput = function () {
                //clear view
                waypoints.forEach(function (marker) {
                    marker.setMap(null);
                    marker = null;
                });
                $scope.foundPlaces.forEach(function (place) {
                    place.marker.setMap(null);
                    place.marker = null;
                    place.mapLabel.setMap(null);
                    place.mapLabel = null;
                });
                directionsDisplay.setDirections({routes: []});
                //clear model
                waypoints = [];
                $scope.foundPlaces = [];
                route = null;
            };

            $scope.debug = false;
            $scope.foundPlaces = [];
            $scope.distance = 0;
            $scope.placeTypeForSearch = supported_place_types[0];
            $scope.supported_place_types = supported_place_types;

            var directionsService = new google.maps.DirectionsService;
            var directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
            var waypoints = [];
            var route;
            var mapInstance;

            var placesService;
            var placesRequestQueue = [];
            var processPlacesRequestIntervalId;

            NgMap.getMap().then(function (map) {
                mapInstance = map;
                map.setCenter(eestiCenter);
                map.setZoom(8);

                directionsDisplay.setMap(map);
                placesService = new google.maps.places.PlacesService(map);
                map.mapDrawingManager['0'].drawingMode = google.maps.drawing.OverlayType.MARKER;

                processPlacesRequestIntervalId = setInterval(processPlacesRequestQueue, places_request_delay_ms);
            });
        }]);



