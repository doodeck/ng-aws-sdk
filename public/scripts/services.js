// services.js

angular.module('myApp.services', [])
.factory('UserService', function($q, $http, AWSService) {
  var service = {
    _user: null,
    UsersTable: "Users",
    UserItemsTable: "UsersItems",
    Bucket: 'ng-aws-sdk',    
    setCurrentUser: function(u) {
      if (u && !u.error) {
        AWSService.setToken(u.id_token);
        return service.currentUser();
      } else {
        var d = $q.defer();
        d.reject(u.error);
        return d.promise;
      }
    },
    currentUser: function() {
		console.log('currentUser: ', $q);
      var d = $q.defer();

	  if (service._user) {
	    d.resolve(service._user);
	  } else {

        // After we've loaded the credentials
        AWSService.credentials().then(function() {
          gapi.client.oauth2.userinfo.get()
          .execute(function(e) {
            var email = e.email;
            // Get the dynamo instance for the
            // UsersTable
            AWSService.dynamo({
              params: {TableName: service.UsersTable}
            })
            .then(function(table) {
              // find the user by email
              table.getItem({
                Key: {'User email': {S: email}}
              }, function(err, data) {
              	  if (!!err) {
              	  	console.log('getItem failed: ', err);
              	  }
                  if (Object.keys(data).length == 0) {
                    // User didn't previously exist
                    // so create an entry
                    var itemParams = {
                      Item: {
                        'User email': {S: email}, 
                        data: { S: JSON.stringify(e) }
                      }
                    };
                    table.putItem(itemParams, 
                      function(err, data) {
                        service._user = e;
                        d.resolve(e);
                    });
                  } else {
                    // The user already exists
                    service._user = 
                      JSON.parse(data.Item.data.S);
                    d.resolve(service._user);
                  }
              });
            });
          });
        });
	  }

      return d.promise;
    },

    itemsForSale: function() {
  var d = $q.defer();
  service.currentUser().then(function(user) {
    AWSService.dynamo({
      params: {TableName: service.UserItemsTable}
    }).then(function(table) {
      table.query({
        TableName: service.UserItemsTable,
        KeyConditions: {
          "User email": {
            "ComparisonOperator": "EQ",
            "AttributeValueList": [
              {S: user.email}
            ]
          }
        }
      }, function(err, data) {
        var items = [];
        if (data) {
          angular.forEach(data.Items, function(item) {
            items.push(JSON.parse(item.data.S));
          });
          d.resolve(items);
        } else {
          d.reject(err);
        }
      })
    });
  });
  return d.promise;
},


	uploadItemForSale: function(items) {
	  var d = $q.defer();
	  service.currentUser().then(function(user) {
	    // Handle the upload
	    AWSService.s3({
	      params: {
	        Bucket: service.Bucket
	      }
	    }).then(function(s3) {

	  // We have a handle of our s3 bucket
	  // in the s3 object
	  var file = items[0]; // Get the first file
	  var params = {
	    Key: file.name,
	    Body: file,
	    ContentType: file.type
	  }

	  s3.putObject(params, function(err, data) {
	    // The file has been uploaded
	    // or an error has occurred during the upload


	    if (!err) {
      var params = {
        Bucket: service.Bucket, 
        Key: file.name, 
        Expires: 900*4 // 1 hour
      };
      s3.getSignedUrl('getObject', params, 
        function(err, url) {
          // Now we have a url
          
    // Now we have a url
    AWSService.dynamo({
      params: {TableName: service.UserItemsTable}
    }).then(function(table) {
      var itemParams = {
        Item: {
          'ItemId': {S: file.name},
          'User email': {S: user.email}, 
          data: {
            S: JSON.stringify({
              itemId: file.name,
              itemSize: file.size,
              itemUrl: url
            })
          }
        }
      };
      table.putItem(itemParams, function(err, data) {
        d.resolve(data);
      });
    });


      });
    }    
	  });

	    });
	  });
	  return d.promise;
	}

  };
  return service;
})
.provider('AWSService', function() {
  var self = this;
  
  // Set defaults
  AWS.config.region = 'eu-west-1';


  self.arn = null;

  self.setArn = function(arn) {
    if (arn) self.arn = arn;
  }

	self.$get = function($q, $cacheFactory) {
	var dynamoCache = $cacheFactory('dynamo'),
	    s3Cache = $cacheFactory('s3Cache'),
	    credentialsDefer = $q.defer(),
	    credentialsPromise = credentialsDefer.promise;

	return {
	  credentials: function() {
	    return credentialsPromise;
	  },
	  setToken: function(token, providerId) {
	    var config = {
	      RoleArn: self.arn,
	      WebIdentityToken: token,
	      RoleSessionName: 'web-id'
	    }
	    if (providerId) {
	      config['ProviderId'] = providerId;
	    }
	    self.config = config;
	    AWS.config.credentials = 
	      new AWS.WebIdentityCredentials(config);
	    credentialsDefer
	      .resolve(AWS.config.credentials);
	  },
	dynamo: function(params) {
	  var d = $q.defer();
	  credentialsPromise.then(function() {
	    var table = 
	      dynamoCache.get(JSON.stringify(params));
	    if (!table) {
	      var table = new AWS.DynamoDB(params);
	      dynamoCache.put(JSON.stringify(params), table);
	    };
	    d.resolve(table);
	  });
	  return d.promise;
	},

	  s3: function(params) {
	    var d = $q.defer();
	    credentialsPromise.then(function() {
	      var s3Obj = s3Cache.get(JSON.stringify(params));
	      if (!s3Obj) {
	        var s3Obj = new AWS.S3(params);
	        s3Cache.put(JSON.stringify(params), s3Obj);
	      }
	      d.resolve(s3Obj);
	    });
	    return d.promise;
	  },
	}
  }
});
