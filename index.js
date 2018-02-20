'use strict'

let map, infoWindow, marker, bounds;
let applyMap, isInitial;

/** 
 * Draws the Route using the DirectionsRenderer and its polyline option
 */
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

/** 
 * Map the Route using the DirectionsService and DirectionsRenderer
 */
function mapRoute(directionsService, directionsDisplay) {
  map = new google.maps.Map(document.getElementById('map'), {zoom: 10});
  bounds = new google.maps.LatLngBounds();
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


/** 
 * Get all filter selections
 */
function getDistance() {
  let e = $('#radius')[0];
  return  parseFloat(e.options[e.selectedIndex].value);
}

function getChargingLevel() {
  return  $('input[name="charging-level"]:checked').val();
}

function getConnectorType() {
  return $('input[name="connector-type"]:checked').val();
}

function getNetworks() {
  let checkArray = new Array(); 

  $('.network:checked').each(function() {
    checkArray.push($(this).val());
  });

  return checkArray.join(',');
}

function formatCoords(str) {
  let prefix;
  prefix = parseFloat(str) > 0 ? '+' : '';

  return (`${prefix}${str}`);
}

/** 
 * Creates urlString based on filter selections and if map or route needed
 */
function getNrelUrlString(bRoute) {
  let stationServiceUrl = 'https://developer.nrel.gov/api/alt-fuel-stations/v1/';
  let fuelType = 'ELEC';
  let access = 'public'; 
  let status = 'E';
  let distance = getDistance();
  let connector = getConnectorType();
  let level = getChargingLevel();
  let networks = getNetworks();
  let limit = 100;

  if (bRoute) {
    distance = 1.0;
    limit = 'all';
  }

  let urlString, queryString;

  queryString = `api_key=${NREL_API_KEY}&fuel_type=${fuelType}
      &access=${access}&status=${status}&radius=${distance}
      &limit=${limit}&ev_charging_level=${level}
      &ev_connector_type=${connector}&ev_network=${networks}`;

  if (!bRoute) {
    urlString = `${stationServiceUrl}nearest.json?`;
  } else {
    urlString = `${stationServiceUrl}nearby-route.json?`;
  }

  return (`${urlString}${queryString}`);
}

/** 
 * Draws all the ev-station markers on map based on the locations array passed in
 * Adds click event listener to each of the marker to display an infoWindow
 */
function drawMarkers(lat1, lng1, locations) {
  let pos = { lat: lat1, lng: lng1 };

  infoWindow = new google.maps.InfoWindow();

  for (let i = 0; i < locations.length; i++) { 
    let position = new google.maps.LatLng(locations[i][1], locations[i][2]);
    bounds.extend(position);

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

  map.fitBounds(bounds);
}

/** 
 * Creates an array of ev station locations and
 * also creates a list of all ev-stations in current search
 */
function getStations(locations, results) {
  let fuel_stations = results.fuel_stations;
  let str = `<thead><tr>
              <th>#</th><th>Name</th> <th>Address</th><th>Phone</th>
              <th>Hours of operation</th><th>Distance (miles)</th>
            </tr></thead><tbody>`;
  let data = [];
  data.push(str);
  
  $.each(fuel_stations, function(index, station) {
    index++;
    let address = `${station.street_address}, ${station.city}, ${station.state} ${station.zip}`;
    let distance = station.distance.toFixed(2);
    let loc = [];

    loc.push(address);
    loc.push(station.latitude);
    loc.push(station.longitude);
    locations.push(loc);

    data.push(`<tr>
              <td>${index}</td><td>${station.station_name}</td>
              <td>${address}</td><td>${station.station_phone}</td>
              <td>${station.access_days_time}</td><td>${distance}</td>
            </tr>`);
  })

  data.push();
  $('#results').html(`</tbody>${data}`);

  return locations;
}

/** 
 * Makes call to the NREL API to get json data of all resulting ev stations
 */
function mapEVStations(lat1, lng1, lat2, lng2, bRoute) {
  let locations = new Array();
  let nrelString = getNrelUrlString(bRoute);
  let coordString, urlString;
  let methodType;

  lat1 = formatCoords(lat1);
  lng1 = formatCoords(lng1);
  lat2 = formatCoords(lat2);
  lng2 = formatCoords(lng2);

  if (!bRoute) {
    coordString = `&latitude=${lat1}&longitude=${lng1}`;
  } else {
    coordString = `&route=LINESTRING(${lng1}${lat1},${lng2}${lat2})`;
  }

  if (!bRoute) methodType = 'GET';
  else methodType = 'POST'; 

  urlString = `${nrelString}${coordString}`;

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

/** 
 * Initializes variables used to create route map
 * and also create click event listeners 
 */
function initRoute() {
  let directionsService = new google.maps.DirectionsService();
  let directionsDisplay = new google.maps.DirectionsRenderer();

  $('#route').on('click', () => {
    isInitial = false;
    applyMap = false;
    mapRoute(directionsService, directionsDisplay)
  });

  $("#to").bind("keydown", function(event) {
    // track enter key
    let keycode = (event.keyCode ? event.keyCode : (event.which ? event.which : event.charCode));
    if (keycode === 13) {  // keycode for enter key
      $('#route').click(); // force the 'Enter Key' to implicitly click the submit button
    }
  }); 
}

/** 
 * Initializes variables used to create initial map using geolocation
 * and also handles errors 
 */
function initMap() {
  applyMap = true;

  map = new google.maps.Map(document.getElementById('map'), { zoom: 10 });
  bounds = new google.maps.LatLngBounds();
  infoWindow = new google.maps.InfoWindow;


  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {

      const coords = position.coords;  
      let pos = { lat: coords.latitude, lng: coords.longitude };

      bounds.extend(pos);

      let marker = new google.maps.Marker({
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

/** 
 * Draws map given coordinates and create location marker
 */
function drawMap(results) {
  let pos = results[0].geometry.location;

  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 10
  });

  bounds = new google.maps.LatLngBounds();
  bounds.extend(pos);

  infoWindow = new google.maps.InfoWindow;

  let marker = new google.maps.Marker({
    position: pos,
    map: map
  });

  map.setCenter(pos);
  mapEVStations(pos.lat(), pos.lng(), 0, 0, false);  
}

/** 
 * In response in search click event, this function gets geocode coords
 */
function searchAddress() {
  let address = $('#address').val();
  let geocoder = new google.maps.Geocoder();

  geocoder.geocode({'address': address}, function(results, status) {
    if (status === 'OK') {
      drawMap(results);
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

/** 
 * Open corresponding view (map or list)
 */
function openPage(pageName) {
  if (pageName === 'map') {
    $('#results').addClass('hidden');
    $('#map').removeClass('hidden');
  } else {
    $('#map').addClass('hidden');
    $('#results').removeClass('hidden');
  }
}

/** 
 * Open Side Navbar menu
 */
function openNav() {
  $("#my-sidenav")[0].style.width = "250px";
  $("#page-container")[0].style.marginLeft = "250px";
  $("#page-container")[0].style.width = "calc(100% - 250px)";
}

/** 
 * Close Side Navbar menu
 */
function closeNav() {
  $("#my-sidenav")[0].style.width = "0";
  $("#page-container")[0].style.marginLeft= "0";
  $("#page-container")[0].style.width = "100%";
}

/** 
 * Populate filter selection tabs
 */
function popDistance() {
  let data = [];
  let dist = DISTANCE;

  $(dist).map(function(i, item) {
   data.push(`<option value="${item}">${item} mile</option>`);
   });

  $('#radius').append(data);
}

function popConnectorType() {
  let data = [];
  let connector = CONNECTOR_TYPE;
  let strChecked = "";

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
  let data = [];
  let network = NETWORK;

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
  let data = [];
  let charging = CHARGING_LEVEL;
  let strChecked = "";

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

/** 
 * On window load
 */
$(function() {
  isInitial = true;

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
  $('#search').on('click', () => {
    isInitial = false;
    applyMap = true;
    searchAddress()
  });

  // add on click listener to search button to search address
  $('#apply-filter').on('click', () => {
    if (isInitial) {
      initMap();
    } else {
      if (applyMap) {
        $('#search').click();
      } else {
        $('#route').click();
      }
    }
  });

  // show and hide divs accordion style
  let links = $('.sidebar-links > div');

  links.on('click', function () {
    links.removeClass('selected');
    $(this).addClass('selected');
  });

  // to capture 'enter' or 'return' keystroke and force submit button
  $("#address").bind("keydown", function(event) {
    // track enter key
    let keycode = (event.keyCode ? event.keyCode : (event.which ? event.which : event.charCode));
    if (keycode === 13) { // keycode for enter key
      $('#search').click(); // force the 'Enter Key' to implicitly click the submit button
    }
  }); 

  // open up map view first
  $('#map-view').click();
});