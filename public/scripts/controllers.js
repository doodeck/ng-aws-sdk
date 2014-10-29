// controllers.js

angular.module('myApp')
.controller('MainCtrl',
  function($scope, UserService) {
    $scope.signedIn = function(oauth) {
      UserService.setCurrentUser(oauth)
      .then(function(user) {
        $scope.user = user;
      });
    }

$scope.onFile = function(files) {
  UserService.uploadItemForSale(files)
  .then(function(data) {
    // Refresh the current items for sale
  });
}

var getItemsForSale = function() {
  UserService.itemsForSale()
  .then(function(images) {
    $scope.images = images;
  });
}

getItemsForSale(); // Load the user's list initially

});
