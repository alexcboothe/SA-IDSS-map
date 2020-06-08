function idssMap() {

	// Las Vegas Default Map Display
	var lon = parseFloat(getUrlParam("lon", -115.14));
	var lat = parseFloat(getUrlParam("lat", 36.17));
	var zoom = parseInt(getUrlParam("zoom", 8));
	var fixMap = getUrlParam("fixed", "false");
	var basemap = getUrlParam("basemap", "NiceGray");


	// Add basemaps
	var mapquestOSM = L.tileLayer("http://{s}.tiles.mapbox.com/v3/am3081.h0po4e8k/{z}/{x}/{y}.png");
	// esri maps
	var topo = L.esri.basemapLayer("Topographic");
	var nationalGeo = L.esri.basemapLayer("NationalGeographic");
	var streets = L.esri.basemapLayer("Streets");

	// default basemap
	var mapquestOSM = L.tileLayer("http://{s}.tiles.mapbox.com/v3/am3081.h0po4e8k/{z}/{x}/{y}.png");
	var defaultBasemap;
	(basemap == "NiceGray") ? defaultBasemap =  mapquestOSM : defaultBasemap = topo;

	// Set basemap options
	var basemapCollection = {
		"Blue & Gray" : mapquestOSM,
		"Topographic": topo,
		"Geographic" : nationalGeo,
		"Street Map" : streets
	};

	// Set Map
	map = L.map("map", {
		center: [lat,lon],
		zoom: zoom,
    minZoom: 4,
    maxZoom: 14,
		layers: mapquestOSM,
		zoomControl: false,
	});

	// Lock map domain
	(fixMap == "true") ? map.dragging.disable() : map.dragging.enable();


	/*////////////////////////////////////////
	// Radar mapping and related functions
	////////////////////////////////////////*/

	// Add Date Control
	var info = L.control();
	info.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'info');
		this.update();
		return this._div;
	};
	// Valid Time Preparation
	let getRoundedDate = (minutes, d=new Date()) => {
		let ms = 1000 * 60 * minutes; // convert minutes to ms
		let roundedDate = new Date(Math.round(d.getTime() / ms) * ms);

		return roundedDate
	}
	// Radar valid time function
	info.update = function (time) {
		var nowDate  = getRoundedDate(5, new Date());
		var vDate = new Date();
		vDate.setMinutes(nowDate.getMinutes()-5);

		for (var j = 0; j < 10; j++) {

			// Set valid time
			var validTime = new Date();
			validTime.setMinutes(vDate.getMinutes()-((time-9)*-5));

			// Insert Valid Time
			if (time < 9 ) this._div.innerHTML = "Valid Time:" + formatDate(validTime);
			if (time == 9) this._div.innerHTML = "Current Composite Radar Mosaic";
		}
	};
	// Add timestep indicator to map
	info.addTo(map);
	console.log("Valid times loaded");
	// Add radar layers to array for loop
	var radarLayers = [];
	for(var hour = 0; hour <= 10; hour++){
		time = (50)-(hour*5);
		// Past radar images (differnt layer identifier)
		if (hour < 10) {
			var layer = 'nexrad-n0r-900913-m'+time+'m';
			radarLayers[hour] = L.tileLayer.wms("http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
				layers: layer,
				format: 'image/png',
				transparent: true,
				opacity: 0.0,
			});
            radarLayers[hour].addTo(map);
		}
		// Latest Radar Image
		if (time == 0) {
			var layer = 'nexrad-n0r-900913';
			radarLayers[hour] = L.tileLayer.wms("http://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi", {
				layers: layer,
				format: 'image/png',
				transparent: true,
				opacity: 0.0,
			});
			radarLayers[hour].addTo(map);
		}
	}
	// Create a radar loop function
	var i = 0;
	function loop() {
		setTimeout(function () {
			radarLayers.map(function(layer){ layer.setOpacity(0)});
			radarLayers[i].setOpacity(0.5);
			info.update(i);

			// Time slider value adjusts to loop
			$('#timeSlider').val(i);          //  your code here
			// Increment the counter
			i++;
			//console.log(i);
			// Loop forever
			if (i < 10) { loop(); } else { i = 0; loop(); }
		}, 500)

		return i;
	}

	// Start radar loop on page load
	loop();

	// Input time slider (html)
	$('#timeSlider').on('change',function(){
		console.log($(this).val());
		radarLayers.map(function(layer){ layer.setOpacity(0)});
		radarLayers[$(this).val()].setOpacity(0.5);
	});


	/*
	  Additional mapping features
	*/

	// Add zoom control button
	map.addControl(new L.Control.ZoomMin());

	// Add GeoSearch
	new L.Control.GeoSearch({
		provider: new L.GeoSearch.Provider.Esri()
	}).addTo(map);

	// Add Locate user
	map.addControl(L.control.locate({
		locateOptions: {
            maxZoom: 10
		}
	}));

	// Add layer control
  var layerControl = L.control.layers(basemapCollection).addTo(map);

	// Add radar to layer control
	var radar = L.layerGroup(radarLayers);
	map.addLayer(radar);
	layerControl.addOverlay(radar, "Radar Mosaic");

	// Call DSS point overlay on page load
	// getActiveDss();

	///////////////////////////////////
	//  Add active fires
	///////////////////////////////////
  var params = {layerControl: layerControl, map: map};
	$.ajax({
			dataType: "json",
			url: "https://opendata.arcgis.com/datasets/68637d248eb24d0d853342cba02d4af7_0.geojson",
			success: activeFires.bind(params)
	}).error(function() {console.log("ERROR: Not able to fetch 'Active Fires'");});

	///////////////////////////////////
	//  Add active IDSS
	///////////////////////////////////
	$.ajax({
			url: "activeDSSpoints.csv",
			success: activeDSS.bind(params)
	}).error(function() {alert("ERROR: Not able to fetch 'Active IDSS'")});

}
////////////////////////////////////////////////////////////////////////////////
// 															END LEAFLET MAPPING														//
////////////////////////////////////////////////////////////////////////////////


/*////////////////////////////////////////
// Active fire callback
////////////////////////////////////////*/
function activeFires(promisedData) {
	// List of dispatch offices
	var disCent = { // Great Basin
									IDBDC: ["Boise Dispatch",""],
									IDCIC: ["Salmon Dispatch",""],
									IDEIC: ["Idaho Falls Dispatch",""],
									IDPAC: ["Payette National Forest Dispatch",""],
									IDSCC: ["Shoshone Dispatch",""],
									NVCNC: ["Winnemucca Dispatch",""],
									NVECC: ["Ely Dispatch",""],
									NVEIC: ["Elko Dispatch",""],
									NVLIC: ["Las Vegas Dispatch",""],
									NVSFC: ["Sierra Front Dispatch",""],
									UTCDC: ["Color Country Dispatch",""],
									UTMFC: ["Moab Dispatch",""],
									UTNUC: ["Salt Lake City Dispatch",""],
									UTRFC: ["Richfield Dispatch",""],
									UTUBC: ["Uintah Basin Dispatch",""],
									WYTDC: ["Teton Dispatch",""],
									// Southwest
									AZFDC: ["Flagstaff Dispatch",""],
									AZPDC: ["Prescott Dispatch",""],
									AZPHC: ["Phoenix Dispatch",""],
									AZSDC: ["Show Low Dispatch",""],
									AZTDC: ["Tucson Dispatch",""],
									AZWDC: ["Williams Dispatch",""],
									NMABC: ["Albuquerque Dispatch",""],
									NMADC: ["Alamogordo Dispatch",""],
									NMSDC: ["Silver City Dispatch",""],
									NMSFC: ["Santa Fe Dispatch",""],
									NMSWC: ["Southwest Coord Center",""],
									NMTDC: ["Taos Dispatch",""],
									// SoCal Ops
									CAANCC: ["Angeles Comms Center",""],
									CACCCC: ["Central Cal Comms Center",""],
									CALPCC: ["Los Padres Dispatch",""],
									CAMVIC: ["Monte Vista Dispatch",""],
									CAOSCC: ["Southern Cal Coord Center",""],
									CAOVCC: ["Owens Valley Dispatch",""],
									CASBCC: ["San Bernardino Dispatch",""],
									CASICC: ["Sierra Dispatch",""],
									CASTCC: ["Sonora Dispatch",""],
									// NorCal Ops
									CACICC: ["Camino Interagency ECC",""],
									CAFICC: ["Fortuna Interagency ECC",""],
									CAGVCC: ["Grass Valley Interagency ECC",""],
									CAMICC: ["Modoc Interagency ECC",""],
									CAMNFC: ["Mendocino NFCC",""],
									CAONCC: ["Operations, Northern California",""],
									CAPNFC: ["Plumas NFCC",""],
									CARICC: ["Redding Interagency ECC",""],
									CASIFC: ["Susanville Interagency ECC",""],
									CAYICC: ["Yreka Interagency ECC",""]
								};

	// create custom icon
	var fireIcon = L.icon({
			iconUrl: 'fireIcon.png',
			iconSize: [14, 14], // size of the icon
	});

	// Loop through ALL active fires
	var numLocalFires = 0;
	var fireLayer = [];
	for (var i = 0; i < promisedData.features.length-1; i++) {
		var fire = promisedData.features[i];
		var lon = fire.geometry.coordinates[0];
		var lat = fire.geometry.coordinates[1];
		var incidentName = fire.properties.IncidentName;
		var dispatchOffice = fire.properties.POODispatchCenterID;
		var updateTime = fire.properties.ModifiedOnDateTime;
		var originCounty = fire.properties.POOCounty;
		var incidentType, containment, primaryFuel, activePersonel;
		(fire.properties.IncidentTypeCategory       == "WF")   ? incidentType = "Wild Fire" : incidentType   = "Perscribed Burn";
		(fire.properties.PercentContained           == null) ? containment    = "N/A"       : containment    = fire.properties.PercentContained + "%";
		(fire.properties.PrimaryFuelModel           == null) ? primaryFuel    = "N/A"       : primaryFuel    = fire.properties.PrimaryFuelModel;
		(fire.properties.TotalIncidentPersonnel     == null) ? activePersonel = "N/A"       : activePersonel = fire.properties.TotalIncidentPersonnel;

		// Define Local Dispatch by long name
		var dispatch = Object.keys(disCent);
		dispatch.forEach(function(key) {
			if (key == dispatchOffice) {
				var dispatchFullname = disCent[key][0];
				fireLayer.push(L.marker([String(lat),String(lon)], {icon : fireIcon})
						.bindPopup(
								// header
								"<table style='width:100%;'>" +
								"<tr><td style='text-align:center;font-size:20px;color:#ed4d18;'>" + incidentName + "</td></tr>" +
								"<tr><td style='text-align:center;font-size:14px;color:#ed4d18;'><b>" + dispatchFullname + "</b></td></tr>" +
								"<tr><td style='text-align:center;font-size:10px;color:#ed4d18'>[" + incidentType   + "]</td></tr>" +
								"</table>" +
								// content
								"<table>" +
								"<tr><td style='vertical-align:middle;font-size:12px;'><em><b> Updated:</b></em></td>        <td style='padding-left:5px;vertical-align:middle;font-size:15px;'>" + convertTimetoDate(updateTime) + "</td></tr>" +
								"<tr><td style='vertical-align:middle;font-size:12px;'><em><b> Active Personel:</b></em></td><td style='padding-left:5px;vertical-align:middle;font-size:15px;'>"  + activePersonel + "</td></tr>" +
								"<tr><td style='vertical-align:middle;font-size:12px;'><em><b> Containment:</b></em></td>    <td style='padding-left:5px;vertical-align:middle;font-size:15px;'>" + containment + "</td></tr>" +
								"<tr><td style='vertical-align:middle;font-size:12px;'><em><b> Fuel Type:</b></em></td>      <td style='padding-left:5px;vertical-align:middle;font-size:15px;'>" + primaryFuel + "</td></tr>" +
								"</table>"
						));
			} //if end
		}); //foreach end
	} //forLoop end

	// Add active fires to map & layer contol
	var fires = L.layerGroup(fireLayer);
	this.map.addLayer(fires);
	this.layerControl.addOverlay(fires, "Active Fires");
	console.log("active fire layer available")
}


/*////////////////////////////////////////
// active DSS point Callback
////////////////////////////////////////*/

function activeDSS(promisedIDSS) {
	// create custom icon
  var customIcon = L.icon({
      iconUrl: 'https://www.weather.gov/images/vef/icons/infoRed.png',
      iconSize: [30, 30], // size of the icon
  });

	var data = [];
	data = promisedIDSS.split('\n');
	console.log("There are " + String(data.length-2)+ " active IDSS events.");

	// Handle point itteration
	var idss = [];
	var rangeRings = [];
	var radius = 16100; // Range ring radius...in meters
	for (var i = 1; i < data.length-1; i++) {
		var bits = data[i].split(",");
		idss.push(L.marker([bits[0],bits[1]], {icon : customIcon})
				.bindPopup("<span style='font-size:18px;color:#059efc;'><b>" + bits[2] + "</b></span>" +
								 		"<table>" +
								 		"<tr><td style='padding:10px;width:27%;font-size:13px;'><em><b> Duration: </b></em></td>"  + "<td>" + bits[3] + "</td></tr>" +
								 		"<tr><td style='padding:10px;width:27%;font-size:13px;'><em><b> POC: </b></em></td>"       + "<td>" + bits[4] + "</td></tr>" +
								 		"<tr><td style='padding:10px;width:27%;font-size:13px;'><em><b> Concerns: </b></em></td>"  + "<td>" + bits[5] + "</td></tr>" +
								 		"</table>")
		);
		// Create range ring
		var latlng = L.latLng(bits[0], bits[1]);
		rangeRings.push(L.circle(latlng, radius, {color: 'red', fillOpacity: 0.05}));
	} //end forLoop

	// Add active fires to map & layer contol
	var idssLayer = L.layerGroup(idss);
	var idssRings = L.layerGroup(rangeRings);
	this.map.addLayer(idssLayer);
	this.map.addLayer(idssRings);
	this.layerControl.addOverlay(idssLayer, "Active IDSS");
	this.layerControl.addOverlay(idssRings, "IDSS Range Rings");
	console.log("active IDSS points available")
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// function getActiveDss(promisedIDSS) {
//   $.ajax({url: "activeDSSpoints.csv",
// 	success: function(result){
//
// 		// create custom icon
//     var customIcon = L.icon({
//         iconUrl: 'https://www.weather.gov/images/vef/icons/infoRed.png',
//         iconSize: [30, 30], // size of the icon
//         });
//
// 		var data = [];
// 		data = result.split('\n');
// 		console.log("There are " + String(data.length-2)+ " active IDSS events.");
//
// 		// Handle point itteration
// 		var radius = 16100; // Range ring radius...in meters
// 		for (var i = 1; i < data.length-1; i++) {
// 			var bits = data[i].split(",");
// 			L.marker([bits[0],bits[1]], {icon : customIcon})
// 					.addTo(map)
// 					.bindPopup("<span style='font-size:18px;color:#059efc;'><b>" + bits[2] + "</b></span>" +
// 									 		"<table>" +
// 									 		"<tr><td style='padding:10px;width:27%;font-size:13px;'><em><b> Duration: </b></em></td>"  + "<td>" + bits[3] + "</td></tr>" +
// 									 		"<tr><td style='padding:10px;width:27%;font-size:13px;'><em><b> POC: </b></em></td>"       + "<td>" + bits[4] + "</td></tr>" +
// 									 		"<tr><td style='padding:10px;width:27%;font-size:13px;'><em><b> Concerns: </b></em></td>"  + "<td>" + bits[5] + "</td></tr>" +
// 									 		"</table>");
// 			// Create range ring
// 			var latlng = L.latLng(bits[0], bits[1]);
// 			L.circle(latlng, radius, {color: 'red', fillOpacity: 0.05})
// 					.addTo(map);
//   	}
//   }
// 	});
// }

/*////////////////////////////////////////
// Utility Functions.
////////////////////////////////////////*/
// Format date & time
function formatDate(date) {
	// Month dic
	var monthNames = [
			"Jan", "Feb", "Mar",
			"Apr", "May", "Jun",
			"Jul", "Aug", "Sep",
			"Oct", "Nov", "Dec"
	];

	// Extract date time vals
	var day = date.getDate();
	var monthIndex = date.getMonth();
	var year = date.getFullYear();
	var hour = date.getHours();
	var min  = date.getMinutes();

	// padding with zero
	if (min < 10) min = '0' + min;
	if (hour >= 12) {
		(hour == 24) ? ampm = 'am' : ampm = 'pm';
		(hour == 12) ? hour = hour : hour = hour-12;
	} else {
		ampm = 'am';
	}

	// return formatted time
	return hour + ':' + min + ' ' + ampm + '  ' + monthNames[monthIndex] + '. ' + day + ', ' + year;
}

// Format time to date
function convertTimetoDate(timestamp) {
	var date = new Date(timestamp);
	var mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUNE", "JULY", "AUG", "SEP", "OCT", "NOV", "DEC"];
	var month = mon[date.getMonth()];
	var day   = date.getDate();
	var hours;
	if (12 < date.getHours()) {
		var hours = date.getHours()-12;
		var amppm = "pm"
	}	else {
		var hours = date.getHours();
		var amppm = "am"
	}
	var minutes = "0" + date.getMinutes();
	var formattedDateTime = month + ', ' + day + '  |  ' + hours + ':' + minutes.substr(-2); // + ampm;

	return formattedDateTime;
}

	function getUrlVars() {
		var vars = {};
		var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
			vars[key] = value;
		});
		return vars;
	}


	function getUrlParam(parameter, defaultvalue){
		var urlparameter = defaultvalue;
		if(window.location.href.indexOf(parameter) > -1){
			urlparameter = getUrlVars()[parameter];
			}
		return urlparameter;
	}
