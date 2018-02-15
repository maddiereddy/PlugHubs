'use strict'

var map, infoWindow, marker;

// draw Route according to user input
function drawRoute(response, directionsDisplay) {
  directionsDisplay.setOptions({
    polylineOptions: {
      strokeColor: 'red', 
      strokeWeight: 8,
      strokeOpacity: 0.8
    }
  });
  directionsDisplay.setMap(map);
  directionsDisplay.setDirections(response);

  const leg = response.routes[0].legs[0];
  let [pos1, pos2] = [leg.start_location, leg.end_location];

  mapEVStations(pos1.lat(), pos1.lng(), pos2.lat(), pos2.lng(), true);
}

// create a route according to user input
function mapRoute(directionsService, directionsDisplay) {
  map = new google.maps.Map(document.getElementById('map'), {zoom: 5});
  directionsDisplay.setMap(map);

  directionsService.route({
    origin: $('#from').val(),
    destination: $('#to').val(),
    travelMode: 'DRIVING'
  }, function(response, status) {
    if (status === 'OK') {
      drawRoute(response, directionsDisplay);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}


// Get all filter selections
function getDistance() {
  var e = $('#radius')[0];
  return  parseFloat(e.options[e.selectedIndex].value);
}

function getChargingLevel() {
  return  $('input[name="charging-level"]:checked').val();
}

function getConnectorType() {
  return $('input[name="connector-type"]:checked').val();
}

function getNetworks() {
  var checkArray = new Array(); 

  // look for all checkboxes of class 'network' attached to it and if checked 
  $('.network:checked').each(function() {
    checkArray.push($(this).val());
  });

  return checkArray.join(',');
}

function formatCoords(str) {
  var prefix;
  prefix = parseFloat(str) > 0 ? '+' : '';

  return prefix+str;
}

function getNrelUrlString(bRoute) {
  var stationServiceUrl = 'https://developer.nrel.gov/api/alt-fuel-stations/v1/';
  var fuelType = 'ELEC';
  var access = 'public'; 
  var status = 'E';
  var distance = getDistance();
  var connector = getConnectorType();
  var level = getChargingLevel();
  var networks = getNetworks();
  var limit = 100;

  if (bRoute) {
    distance = 1.0;
    limit = 'all';
  }

  var urlString, queryString;

  queryString = `api_key=${NREL_API_KEY}&fuel_type=${fuelType}
      &access=${access}&status=${status}&radius=${distance}
      &limit=${limit}&ev_charging_level=${level}
      &ev_connector_type=${connector}&ev_network=${networks}`;

  if (!bRoute) {
    urlString = `${stationServiceUrl}nearest.json?`;
  } else {
    urlString = `${stationServiceUrl}nearby-route.json?`;
  }

  return urlString + queryString;
}

function drawMarkers(lat1, lng1, locations) {
  var bounds = new google.maps.LatLngBounds();
    
  var pos = { lat: lat1, lng: lng1 };

  infoWindow = new google.maps.InfoWindow();

  for (var i = 0; i < locations.length; i++) { 
    var position = new google.maps.LatLng(locations[i][1], locations[i][2]);
    // bounds.extend(position);

    marker = new google.maps.Marker({
      position: position,
      map: map,
      title: locations[i][0],
      icon: 'blue-plug.png'
    });

    google.maps.event.addListener(marker, 'click', (function(marker, i) {
      return function() {
        infoWindow.setContent(locations[i][0]);
        infoWindow.open(map, marker);
      }
    })(marker, i));
  }

  // map.fitBounds(bounds);
}

function getStations(locations, results) {
  var fuel_stations = results.fuel_stations;
  var str = `<tr>
              <th>#</th><th>Name</th> <th>Address</th><th>Phone</th>
              <th>Hours of operation</th><th>Distance (miles)</th>
            </tr>`;
  
  $.each(fuel_stations, function(index, station) {
    index++;
    var address = `${station.street_address}, ${station.city}, ${station.state} ${station.zip}`;
    var distance = station.distance.toFixed(2);
    var loc = [];

    loc.push(address);
    loc.push(station.latitude);
    loc.push(station.longitude);
    locations.push(loc);

    str += `<tr>
              <td>${index}</td><td>${station.station_name}</td>
              <td>${address}</td><td>${station.station_phone}</td>
              <td>${station.access_days_time}</td><td>${distance}</td>
            </tr>`
  })

  $('#results').html(str);

  return locations;
}

// get ev stations from nrel and map them
function mapEVStations(lat1, lng1, lat2, lng2, bRoute) {
  var locations = new Array();
  var urlString = getNrelUrlString(bRoute);
  var methodType;

  lat1 = formatCoords(lat1);
  lng1 = formatCoords(lng1);
  lat2 = formatCoords(lat2);
  lng2 = formatCoords(lng2);

  if (!bRoute) {
    urlString += `&latitude=${lat1}&longitude=${lng1}`;
  } else {
    urlString += `&route=LINESTRING(${lng1}${lat1},${lng2}${lat2})`;
  }

  if (!bRoute) methodType = 'GET';
  else methodType = 'POST'; 

  $.ajax({
    url: urlString,
    method: 'GET',
    crossDomain: true,
    success: function(results){    
      locations = getStations(locations, results);
  }}).then(function(){
    drawMarkers(lat1, lng1, locations);
  });
}

function initRoute() {
  var directionsService = new google.maps.DirectionsService();
  var directionsDisplay = new google.maps.DirectionsRenderer();

  //map = new google.maps.Map(document.getElementById('map'), {zoom: 5});

  $('#route').on('click', () => mapRoute(directionsService, directionsDisplay));

  $("#to").bind("keydown", function(event) {
    // track enter key
    var keycode = (event.keyCode ? event.keyCode : (event.which ? event.which : event.charCode));
    if (keycode === 13) { // keycode for enter key
      $('#route').click();// force the 'Enter Key' to implicitly click the submit button
    }
  }); 
}


// Initialize app with geolocation
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12
  });

  infoWindow = new google.maps.InfoWindow;


  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {

      const coords = position.coords;  
      var pos = { lat: coords.latitude, lng: coords.longitude };

      var marker = new google.maps.Marker({
        position: pos,
        map: map,
        title: 'Current Location'
      });

      map.setCenter(pos);
      mapEVStations(pos.lat, pos.lng, 0, 0, false);
      initRoute();

    }, function() {
      handleLocationError(true, infoWindow, map.getCenter());
    });
  } else {
    // Browser doesn't support Geolocation
    handleLocationError(false, infoWindow, map.getCenter());
  }
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(browserHasGeolocation ?
                        'Error: The Geolocation service failed.' :
                        'Error: Your browser doesn\'t support geolocation.');
  infoWindow.open(map);
}

function drawMap(results) {
  var pos = results[0].geometry.location;

  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12
  });

  infoWindow = new google.maps.InfoWindow;

  var marker = new google.maps.Marker({
    position: pos,
    map: map
  });

  map.setCenter(pos);
  mapEVStations(pos.lat(), pos.lng(), 0, 0, false);  
}

function searchAddress() {
  var address = $('#address').val();
  var geocoder = new google.maps.Geocoder();

  geocoder.geocode({'address': address}, function(results, status) {
    if (status === 'OK') {
      drawMap(results);
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

// work the tabs according to user selection
function openPage(pageName) {
  if (pageName === 'map') {
    $('#results').addClass('hidden');
    $('#map').removeClass('hidden');
  } else {
    $('#map').addClass('hidden');
    $('#results').removeClass('hidden');
  }
}

// Open Side Navbar menu
function openNav() {
  $("#my-sidenav")[0].style.width = "250px";
  $("#main")[0].style.marginLeft = "250px";
  $("#main")[0].style.width = "calc(100% - 250px)";
}

// Close Side Navbar menu
function closeNav() {
  $("#my-sidenav")[0].style.width = "0";
  $("#main")[0].style.marginLeft= "0";
  $("#main")[0].style.width = "100%";
}

function popDistance() {
  var data = [];
  var dist = DISTANCE;

  $(dist).map(function(i, item) {
   data.push(`<option value="${item}">${item} mile</option>`);
   });

  $('#radius').append(data);
}

function popConnectorType() {
  var data = [];
  var connector = CONNECTOR_TYPE;
  var strChecked = "";

  $(connector).map(function(i, item) {
    
    if (i === 0) {
      strChecked = "checked";
    } else {
      strChecked = "";
    }

    data.push(`
      <li>
        <input type="radio" id="${item.id}" value="${item.value}" name="connector-type" ${strChecked}>
        <label for="${item.id}">${item.text}</label>
      </li> `);
    });

  $('#connector').append(data);
}

function popNetworks() {
  var data = [];
  var network = NETWORK;

  $(network).map(function(i, item) {
    data.push(`
      <li>
        <input type="checkbox" id="${item.id}" value="${item.value}" name="network" checked>
        <label for="${item.id}">${item.value}</label>
      </li> `);
    });

  $('#networks').append(data);
}

function popChargingLevels() {
  var data = [];
  var charging = CHARGING_LEVEL;
  var strChecked = "";

  $(charging).map(function(i, item) {
    
    if (i === 0) {
      strChecked = "checked";
    } else {
      strChecked = "";
    }

    data.push(`
      <li>
        <input type="radio" id="${item.id}" value="${item.value}" name="charging-level" ${strChecked}>
        <label for="${item.id}">${item.text}</label>
      </li> `);
    });

  $('#charging').append(data);
}

$(function() {

  const URL = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`;
  let scriptNode = $('<script></script>').attr('src', URL);
  
  scriptNode.attr('async', 'async');
  scriptNode.attr('defer', 'defer');
  $('body').append(scriptNode);

  // populate sidebar elements
  popDistance();
  popConnectorType();
  popNetworks();
  popChargingLevels();

  // add onclick listeners to buttons 'map view' and 'list view'
  $('#map-view').on('click', () => openPage('map'));
  $('#list-view').on('click', () => openPage('results'));

  // add on click listener to menu to open and close sidenav
  $('#open-menu').on('click', () => openNav());
  $('#close-menu').on('click', () => closeNav());

  // add on click listener to search button to search address
  $('#search').on('click', () => searchAddress());

  // show and hide divs accordion style
  var links = $('.sidebar-links > div');

  links.on('click', function () {
    links.removeClass('selected');
    $(this).addClass('selected');
  });

  // to capture 'enter' or 'return' keystroke and force submit button
  $("#address").bind("keydown", function(event) {
    // track enter key
    var keycode = (event.keyCode ? event.keyCode : (event.which ? event.which : event.charCode));
    if (keycode === 13) { // keycode for enter key
      $('#search').click(); // force the 'Enter Key' to implicitly click the submit button
    }
  }); 

  // open up map view first
  $('#map-view').click();
});