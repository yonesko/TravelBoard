var directionsService;
var directionsDisplay
var map;
var radar_radius = 10000;
var max_radar_searches = 10;
var markers = [];
var centralRussia = {lat: 57.452744, lng: 33.238945};
var reutov;
var placesService;
var infoWindow;

function initMap() {
    infoWindow = new google.maps.InfoWindow();
    reutov = new google.maps.LatLng(55.759970, 37.859058);
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

    google.maps.event.addListener(drawingManager, 'markercomplete', function (marker) {
        var lastChar = markers.length == 0 ? String.fromCharCode(65) : String.fromCharCode(markers[markers.length - 1].getLabel().charCodeAt(0) + 1);
        marker.setLabel(lastChar);
        markers.push(marker);
    });

    document.getElementById('submit').addEventListener('click', function () {
        calculateAndDisplayRoute(directionsService, directionsDisplay);
    });

    directionsDisplay.setMap(map);
    drawingManager.setMap(map);
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
            document.getElementById('distance').innerHTML = getSumDistance(route) / 1000;
            radarAlongRoute(route);
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}

function radarAlongRoute(route) {
    var step = Math.ceil(route.overview_path.length / max_radar_searches);
    var cou = 0;
    for (var i = 0; i < route.overview_path.length; i += step) {
        cou++;
        // new google.maps.Marker({
        //     position: route.overview_path[i],
        //     map: map
        // });


        placesService.radarSearch({
                location: route.overview_path[i],
                radius: radar_radius,
                type: 'museum'
            }, (function (center) {
                return function (places, status) {
                    console.log(status)
                    if (status !== google.maps.places.PlacesServiceStatus.OK) {
                        console.log('radarAlongRoute' + status);
                        return;
                    }
                    for (var i = 0, place; place = places[i]; i++) {
                        addPlaceMarker(place);
                    }

                    console.log('CIRCLE')
                    new google.maps.Circle({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.8,
                        strokeWeight: 2,
                        fillColor: '#FF0000',
                        fillOpacity: 0.35,
                        map: map,
                        center: center,
                        radius: radar_radius
                    });
                }
            })(route.overview_path[i])
        );


        // window.setTimeout(placesService.radaradarSearch,
        //     (1000 / max_radar_searches) * cou,
        //     {
        //         location: route.overview_path[i],
        //         radius: radar_radius,
        //         type: 'museum'
        //     },
        //     function (places, status) {
        //         console.log(status)
        //         if (status !== google.maps.places.PlacesServiceStatus.OK) {
        //             console.log('radarAlongRoute' + status);
        //             return;
        //         }
        //         for (var i = 0, result; result = places[i]; i++) {
        //             addMarker(result);
        //         }
        //     }
        // );
    }
    console.log(cou);
}

function getSumDistance(route) {
    var sum = 0;
    route.legs.forEach(function (leg) {
        sum += leg.distance.value;
    });
    return sum;
}

