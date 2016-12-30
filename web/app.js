const
    kilo = 1000,
    second_ms = 1000,
    radar_radius_m = 20 * kilo,
    radar_second_qouta = 2,
    centralRussia = {lat: 57.452744, lng: 33.238945},
    reutov = {lat: 55.759970, lng: 37.859058},
    places_detail_per_point_quota = 1;

var map;
var directionsService;
var directionsDisplay;
var placesService;
var infoWindow;
var markers = [];

function initMap() {
    infoWindow = new google.maps.InfoWindow();
    directionsService = new google.maps.DirectionsService;
    directionsDisplay = new google.maps.DirectionsRenderer({suppressMarkers: true});
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        center: centralRussia
    });
    placesService = new google.maps.places.PlacesService(map);
    var drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.MARKER,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
                google.maps.drawing.OverlayType.MARKER
            ]
        },
        markerOptions: {editable: true}
    });

    directionsDisplay.setMap(map);
    drawingManager.setMap(map);

    google.maps.event.addListener(drawingManager, 'markercomplete', function (marker) {
        var lastChar = markers.length == 0 ? String.fromCharCode(65) : String.fromCharCode(markers[markers.length - 1].getLabel().charCodeAt(0) + 1);
        marker.setLabel(lastChar);
        markers.push(marker);
    });

    document.getElementById('submit').addEventListener('click', function () {
        calculateAndDisplayRoute(directionsService, directionsDisplay);
    });
}
function addPlaceMarker(place) {
    var marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        icon: {
            url: 'http://maps.gstatic.com/mapfiles/circle.png',
            anchor: new google.maps.Point(10, 10),
            scaledSize: new google.maps.Size(20, 34)
        }
    });

    google.maps.event.addListener(marker, 'click', function () {
        placesService.getDetails(place, function (result, status) {
            if (status !== google.maps.places.PlacesServiceStatus.OK) {
                alert('getDetails' + status);
                return;
            }
            infoWindow.setContent(result.name);
            infoWindow.open(map, marker);
        });
    });
}


function calculateAndDisplayRoute(directionsService, directionsDisplay) {
    var waypoitns = [];

    markers.slice(1, markers.length - 1).forEach(function (e) {
        waypoitns.push({location: e.getPosition()});
    });

    directionsService.route({
        origin: markers[0].getPosition(),
        waypoints: waypoitns,
//            optimizeWaypoints: true,
        destination: markers[markers.length - 1].getPosition(),
        travelMode: google.maps.TravelMode.DRIVING
    }, function (response, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(response);
            var route = response.routes[0];
            document.getElementById('distance').innerHTML = 'distance=' + distance(route) / 1000 + ' км.';
            findPlacesAlongRoute(route);
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}

function radar(center) {
    return function () {
        new google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 0,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: map,
            center: center,
            radius: radar_radius_m
        });

        placesService.radarSearch({
                location: center,
                radius: radar_radius_m,
                type: 'museum'
            }, function (places, status) {
                if (status !== google.maps.places.PlacesServiceStatus.OK) {
                    console.log('findPlacesAlongRoute' + status);
                    return;
                }

                var delay_ms = (second_ms / radar_second_qouta) * 1.1;
                places.forEach(addPlaceMarker);
                for (var i = 0, place; i < places.length && i < places_detail_per_point_quota; i++) {
                    place = places[i];
                    addPlaceMarker(place);
                    window.setTimeout(
                        function (place) {
                            return function () {
                                placesService.getDetails(place, function (placeDetail, status) {
                                    if (status !== google.maps.places.PlacesServiceStatus.OK) {
                                        console.log('getDetails' + status);
                                        return;
                                    }
                                    document.getElementById("found_places_list").innerHTML += placeDetail.name + '<br>';
                                })
                            };
                        }(place),
                        i * delay_ms);
                }
            }
        )
    }
}

function Test() {
    var tver = {lat: 56.51, lng: 35.55};
    var torzok = {lat: 57.02, lng: 34.58};

    markers.push(new google.maps.Marker({
        map: map,
        position: tver
    }));
    markers.push(new google.maps.Marker({
        map: map,
        position: torzok
    }));

    calculateAndDisplayRoute(directionsService, directionsDisplay);
}

function findPlacesAlongRoute(route) {
    var dist = distance(route);
    var step = Math.ceil((2 * radar_radius_m) / (dist / route.overview_path.length));
    var delay_ms = (second_ms / radar_second_qouta) * 1.1;

    for (var i = 0, cou = 0; i < route.overview_path.length; i += step, cou++) {
        window.setTimeout(
            radar(route.overview_path[i]),
            cou * delay_ms
        );
    }
    window.setTimeout(
        radar(route.overview_path[route.overview_path.length - 1]),
        cou * delay_ms
    );
}
function distance(route) {
    var sum = 0;
    route.legs.forEach(function (leg) {
        sum += leg.distance.value;
    });
    return sum;
}

