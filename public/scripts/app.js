// app.js

angular.module('myApp',
  [ 'ngRoute', 'myApp.services', 'myApp.directives']
)
.config(function(AWSServiceProvider) {
  AWSServiceProvider
    .setArn(
      'arn:aws:iam::915133436062:role/google-web-role');
})
.config(function($routeProvider) {
  $routeProvider
  .when('/', {
    controller: 'MainCtrl',
    templateUrl: 'templates/main.html',
  })
  .otherwise({
    redirectTo: '/'
  });
});

window.onLoadCallback = function() {
  // When the document is ready
  angular.element(document).ready(function() {
    // Bootstrap the oauth2 library
    gapi.client.load('oauth2', 'v2', function() {
      // Finally, bootstrap our angular app
      angular.bootstrap(document, ['myApp']);
    });
  });
}
