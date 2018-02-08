'use strict'

var map, infoWindow, marker;

// create a route according to user input
function mapRoute(directionsService, directionsDisplay) {

  directionsService.route({
    origin: document.getElementById('from').value,
    destination: document.getElementById('to').value,
    travelMode: 'DRIVING'
  }, function(response, status) {
  	console.log(status);
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });

}


// Get all filter selections
function getDistance() {
	var e = document.getElementById('radius');
	return  parseFloat(e.options[e.selectedIndex].value);
}

function getChargingLevel() {
	return  $('input[name="charging-level"]:checked').val();
}

function getConnectorType() {
	return $('input[name="connector-type"]:checked').val();
}

function getNetwork() {
	var checkArray = new Array(); 
	var items = document.getElementsByClassName('network');

	for (var i = 0; i < items.length; i++){
		if (items[i].checked) checkArray.push(items[i].value);
	}
	return checkArray.join(',');
}

// get ev stations from nrel and map them
function getEVStations(latitude, longitude) {
	var locations = new Array();
	var stationServiceUrl = 'https://developer.nrel.gov/api/alt-fuel-stations/v1/';
	var fuelType = 'ELEC';
	var access = 'public'; 
	var status = 'E';
	var distance = getDistance();
	var connector = getConnectorType();
	var level = getChargingLevel();
	var networks = getNetwork();

	console.log("in getEVStations");

	var urlString = `${stationServiceUrl}nearest.json?api_key=${NREL_API_KEY}
									&latitude=${latitude}&longitude=${longitude}&fuel_type=${fuelType}
									&access=${access}&status=${status}&radius=${distance}&limit=${100}
									&ev_charging_level=${level}&ev_connector_type=${connector}&ev_network=${networks}`;
	
	$.getJSON(urlString,function(json){    
	    var fuel_stations = json.fuel_stations;
	    var index = 0;
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
	}).then(function(){
		var bounds = new google.maps.LatLngBounds();
		map = new google.maps.Map(document.getElementById('map'), {
		  zoom: 5
		});
		var pos = {
      lat: latitude,
      lng: longitude
    };

		infoWindow = new google.maps.InfoWindow();

    for (var i = 0; i < locations.length; i++) { 
    	var position = new google.maps.LatLng(locations[i][1], locations[i][2]);
      bounds.extend(position);
      marker = new google.maps.Marker({
        position: position,
        map: map,
        title: locations[i][0]
      });

      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infoWindow.setContent(locations[i][0]);
      		infoWindow.open(map, marker);
        }
      })(marker, i));
	  }

	  map.fitBounds(bounds);
  });
}


// Initialize app with geolocation
function initMap() {
	console.log("in initMap")

	if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        center: {lat: pos.lat, lng: pos.lng}
      });

      getEVStations(pos.lat, pos.lng);

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

function searchAddress() {
	map = new google.maps.Map(document.getElementById('map'), {
	  zoom: 5
	});

	var geocoder = new google.maps.Geocoder();
	geocodeAddress(geocoder, map);
}

function geocodeAddress(geocoder, resultsMap) {
  var address = document.getElementById('address').value;

  geocoder.geocode({'address': address}, function(results, status) {
    if (status === 'OK') {
    	var pos = results[0].geometry.location;

    	getEVStations(pos.lat(), pos.lng());
   
    } else {
      alert('Geocode was not successful for the following reason: ' + status);
    }
  });
}

function initRoute() {
	var directionsService = new google.maps.DirectionsService();
  var directionsDisplay = new google.maps.DirectionsRenderer();

  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 7
  });

  directionsDisplay.setMap(map);

	var onMapIt = function() {
    mapRoute(directionsService, directionsDisplay);
  };
  document.getElementById('trip-form').addEventListener('submit', onMapIt);
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
  $("#mySidenav")[0].style.width = "250px";
  $("#main")[0].style.marginLeft = "250px";
  $("#main")[0].style.width = "calc(100% - 250px)";
}

// Close Side Navbar menu
function closeNav() {
  $("#mySidenav")[0].style.width = "0";
  $("#main")[0].style.marginLeft= "0";
  $("#main")[0].style.width = "100%";
}

$(document).ready(function() {

	console.log("in the loading function")

	const URL = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
	let scriptNode = $('<script></script>').attr('src', URL);
	
	scriptNode.attr('async', 'async');
	scriptNode.attr('defer', 'defer');
	$('body').append(scriptNode);

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
      // force the 'Enter Key' to implicitly click the submit button
      document.getElementById('submit').click();
    }
  }); 

  initMap();

});