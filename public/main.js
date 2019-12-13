let app = angular.module('schedulerLogViewer', []);

app.directive('fileOnChange', function() {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      let onChangeHandler = scope.$eval(attrs.fileOnChange);
      element.bind('change', onChangeHandler);
    }
  };
});

app.directive('googleMap', ['$timeout', function($timeout) {
  return {
    restrict: 'E',
    templateUrl: 'google-map.html',
    link: function ($scope, element) {

      $timeout(function(){

        $scope.googleMap = new google.maps.Map(element[0], {
          center: {lat: 33.446, lng: -112.359},
          zoom: 11
        });

        google.maps.event.addDomListener(window, 'resize', function() {
          $timeout(function() {
            let center = $scope.googleMap.getCenter();
            google.maps.event.trigger($scope.googleMap, 'resize');
            $scope.googleMap.setCenter(center);
          });
        });

        $scope.directionsRenderers = [];
      });
    }
  };
}]);

app.directive('numericParser', function() {
  return {
    restrict: 'A',
    require: '?ngModel',
    link: function (scope, element, attrs, modelCtrl) {
      modelCtrl.$parsers.push(function (inputValue) {
        let defaultValue = '1';
        if (inputValue === undefined) return defaultValue;

        if (/[^0-9]/g.test(inputValue)) {
          modelCtrl.$setViewValue(defaultValue);
          modelCtrl.$render();
          return defaultValue;
        } else {
          return inputValue;
        }
      });
    }
  };
});

app.controller('mainController', ['$scope','$timeout', '$http',
  function($scope, $timeout, $http) {
    let letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    let colors = [
      '#f68b2a',
      '#fcdc07',
      '#abd261',
      '#01a798',
      '#73c4ee',
      '#0062a6',
      '#994395',
      '#f6abcb',
      '#f15c48',
      '#a87d50',
      '#c57027',
      '#c2ac29',
      '#7a9f49',
      '#01837b',
      '#4da0c6',
      '#1b397e',
      '#6d357e',
      '#bd849e',
      '#c74c36',
      '#896740',
      '#a25b13',
      '#a49203',
      '#688b40',
      '#00726a',
      '#3c81a1'
    ];

    let directionsRenderers = [];
    let markers = [];
    $scope.run = {};
    $scope.currentSolution = 0;
    $scope.incrementSize = 1;
    $scope.totalSolutions = 0;
    $scope.googleMapsError = '';
    $scope.loadingRoutes = false;
    $scope.serviceOrderSelectedMap = {};
    $scope.serviceOrderInfoMap = {};
    $scope.serviceOrderMarkerMap = {};


    $scope.$watch('currentSolution', function () {
      displaySolution();
    });

    $scope.fileSelected =  function(event) {
      console.log('File selected.');

      $scope.currentSolution = 0;
      $scope.run = {};

      readFile(event.target.files[0]);
    };

    $scope.incrementSolution = function() {

      if($scope.currentSolution <= $scope.run.iterations.length) {
        $scope.currentSolution += parseInt($scope.incrementSize);
      }

      if($scope.currentSolution > $scope.run.iterations.length) {
        $scope.currentSolution = $scope.run.iterations.length;
      }
    };

    $scope.decrementSolution = function() {

      if($scope.currentSolution > 1) {
        $scope.currentSolution -= parseInt($scope.incrementSize);
      }

      if($scope.currentSolution < 1) {
        $scope.currentSolution = 1;
      }
    };

    $scope.serviceOrderClicked = function(id) {
      $scope.serviceOrderSelectedMap[id] = !$scope.serviceOrderSelectedMap[id];

      let infoWindow = $scope.serviceOrderInfoMap[id];
      let marker = $scope.serviceOrderMarkerMap[id];
      
      if (infoWindow.getMap()) {
        infoWindow.close();
      } else {
        infoWindow.open($scope.googleMap, marker);
      }
    };

    $scope.serviceOrderHover = function() {
    };

    function readFile(file) {
    
      let reader = new FileReader();

      reader.onload = function() {

        let text = reader.result;
        console.log('File read.');

        let run = JSON.parse(text);
        console.log('File parsed.');

        $scope.run = run;

        $scope.$apply(function() {
          $scope.totalSolutions = $scope.run.iterations.length;
          $scope.currentSolution = $scope.totalSolutions;
          console.log('Read ' + $scope.totalSolutions + ' solutions from log file.');
        });
      };

      console.log('Reading file ' + file.name);
      reader.readAsText(file);
    }

    function getRouteLetter(routeNumber){
      let label = '';

      do {
        routeNumber -= 1;
        label = letters[routeNumber % 26] + label;
        routeNumber = (routeNumber / 26) >> 0;
      } while(routeNumber > 0);
  
      return label;
    }
 
    function callDirectionsService(directionRequest) {
      return new Promise(function(resolve, reject) {
        $http.post('/directions', directionRequest).then(function(response) {

          // create directionsResult
          let directionsResult = {
            geocoded_waypoints: [],
            routes: [],
            request: {
              travelMode: 'DRIVING'
            }
          };

          response.data.routes.forEach(function(responseRoute) {
            let route = {
              legs: []
            };

            responseRoute.legs.forEach(function(responseLeg) {
              let leg = {
                distance: {
                  value: responseLeg.distance
                },
                duration: {
                  value: responseLeg.duration
                },
                steps: []
              };

              responseLeg.steps.forEach(function(responseStep) {
                let step = {
                  distance: {
                    value: responseStep.distance
                  },
                  duration: {
                    value: responseStep.duration
                  },
                  path: google.maps.geometry.encoding.decodePath(responseStep.geometry),
                  travel_mode: 'DRIVING'
                };

                leg.steps.push(step);
              });

              route.legs.push(leg);
            });

            directionsResult.routes.push(route);
          });
          resolve(directionsResult);
        }).catch(function(err) {
          reject(err);
        });
      });
    }

    function stringToCoord(coordString) {
      let locationCoords = coordString.split(',');
      return {lat: Number(locationCoords[0]), lon: Number(locationCoords[1]), lng: Number(locationCoords[1])};
    }

    function displaySolution() {
      console.log('In displaySolution()');
    
      let index = $scope.currentSolution - 1;
      if(!$scope.run.iterations || $scope.run.iterations.length <= index || $scope.loadingRoutes) {
        return;
      }

      $scope.loadingRoutes = true;

      // fix for input type=range not updating
      $timeout(function () {
        document.querySelector('#slider').value = $scope.currentSolution;
      });

      let solution = $scope.run.iterations[index];
    
      $scope.remainingRoutes = solution.routes.length;

      // clear all directions
      directionsRenderers.forEach(function(renderer) {
        renderer.setMap(null);
      });

      directionsRenderers = [];

      // clear all markers
      markers.forEach(function(marker){
        marker.setMap(null);
      });

      markers = [];

      let routePromises = [];
      solution.routes.forEach(function(route, routeIndex) {
        routePromises.push(new Promise(function(resolve, reject){
        
          let directionRequest = {
            waypoints: [stringToCoord(route.startLocation)]
          };

          route.serviceOrders.forEach((serviceOrder) => {
            directionRequest.waypoints.push(stringToCoord(serviceOrder.serviceLocation));
          });

          directionRequest.waypoints.push(stringToCoord(route.endLocation));

          let color = colors[routeIndex % colors.length];
          let serviceOrderIndex = 1;
          route.serviceOrders.forEach(function(serviceOrder) {

            let routeLabel = getRouteLetter(routeIndex + 1) + (serviceOrderIndex);

            let marker = new google.maps.Marker({
              position: stringToCoord(serviceOrder.serviceLocation),
              label: routeLabel,
              icon: {
                labelOrigin: new google.maps.Point(0, -30),
                path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z M -2,-30 a 2,2 0 1,1 4,0 2,2 0 1,1 -4,0',
                strokeColor: color,
                fillColor: color,
                fillOpacity: 1,
                scale: 1.25
              },
              map: $scope.googleMap
            });

            var infoContent = 
            '<div class="map-popup">' +
              '<div>ID: ' + serviceOrder.id + '</div>' +
              '<div>Service Location: ' + serviceOrder.serviceLocation + '</div>' +
              '<div>Duration (minutes): ' + serviceOrder.duration + '</div>' +
              '<div>Scheduled time: ' + serviceOrder.scheduledTime + '</div>' +
              '<div>Window start: ' + serviceOrder.timeWindow.start + '</div>' +
              '<div>Window end: ' + serviceOrder.timeWindow.end + '</div>' +
              '<div>Dev scratch:</div>' +
              '<pre>'  + serviceOrder.devScratch + '</pre>' +
            '</div>';

            let infoWindow = new google.maps.InfoWindow({
              content: infoContent,
              disableAutoPan: true
            });
            
            marker.addListener('click', function() {
              $scope.serviceOrderClicked(serviceOrder.id);
            });

            $scope.serviceOrderInfoMap[serviceOrder.id] = infoWindow;
            $scope.serviceOrderMarkerMap[serviceOrder.id] = marker;

            markers.push(marker);
            serviceOrderIndex ++;
          });

          let directionsRenderer = new google.maps.DirectionsRenderer({
            preserveViewport: true,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: color,
              strokeOpacity: 0.8
            }
          });
    
          directionsRenderers.push(directionsRenderer);
          callDirectionsService(directionRequest).then(function(response){
            directionsRenderer.setDirections(response);
            directionsRenderer.setMap($scope.googleMap);
            resolve();
          }).catch(function(err){
            reject(err);
          });         
        }));
      });

      Promise.all(routePromises).then(function(){
        console.log('Done loading');
        $scope.$apply(function(){
          $scope.loadingRoutes = false;
        }); 
      });
    }
  }]);
