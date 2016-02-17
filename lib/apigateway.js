var AWS = require('aws-sdk')
var SETTINGS = require('./settings.js').constants
var dataProcess = require('./dataProcess.js')

var apigateway = new AWS.APIGateway({region: SETTINGS.REGION})

// --------------------------------------
//            AWS Aux Functions
// --------------------------------------
// Delete all resources that have the the rootResource as
// Its parent resource
exports.purgeApi = () => {
  console.log('Purging API');
  return exports.getAllResources()
    .then((resources) => {
      var toDeleted = []
      resources.forEach((resource) => {
        if (resource.path.split('/').length == 2 && resource.path != '/')
          toDeleted.push(exports.deleteResource(resource))
      })
      console.log('Purging', toDeleted.length, 'root child resources.');
      return Promise.all(toDeleted)
    })
}

exports.getAllResources = () => {
  return new Promise((resolve, reject) => {
    params = {
      restApiId: SETTINGS.APIGATEWAY_REST_API,
      limit: 500
    }
    apigateway.getResources(params, (err, data) => {
      if (err)
        reject(err)
      else
        resolve(data.items.map((resource) => {
          resource.restApiId = SETTINGS.APIGATEWAY_REST_API
          return resource
        }))
    })
  })
}

// Get all resources and select the one with a specific path
exports.getResourceByPath = (path) => {
  return exports.getAllResources()
    .then((data) => {
      console.log('Getting Resource with path:', path);
      var result
      data.forEach((resource) => {
        if(resource.path == path)
          result = resource;
      })
      return result
    })
}

// --------------------------------------
//  Promesified AWS ApiGateway Functions
// --------------------------------------
exports.getAllResources = () => {
  return new Promise((resolve, reject) => {
    params = {
      restApiId: SETTINGS.APIGATEWAY_REST_API,
      limit: 500
    }
    apigateway.getResources(params, (err, data) => {
      if (err)
        reject(err)
      else
        resolve(data.items.map((resource) => {
          resource.restApiId = SETTINGS.APIGATEWAY_REST_API
          return resource
        }))
    })
  })
}

exports.deleteResource = (resource) => {
  var params = {
    resourceId: resource.id,
    restApiId: resource.restApiId,
  };
  return new Promise((resolve, reject) => {
    apigateway.deleteResource(params,
      (err, data) => {
        if (err)
          reject(err)
        else
          resolve(data)
    });
  })
}

exports.createResource = (resource) => {
  var params = {
    restApiId: resource.restApiId,
    parentId: resource.parent.id,
    pathPart: resource.Endpoint,
  };

  return new Promise((resolve, reject) => {
    apigateway.createResource(params,
      (err, data) => {
        if (err)
          reject(err)
        else
        {
          if (!resource.Resources)
            resource.Resources = []
          resource.id = data.id
          resolve(resource)
        }
    });
  });
}

exports.putMethod = (method) => {
  var params = {
    authorizationType: method.authorizationType,
    httpMethod: method.httpMethod,
    resourceId: method.resourceId,
    restApiId: method.restApiId,
    requestParameters: method.requestParameters,
  };

  return new Promise((resolve, reject) => {
    apigateway.putMethod(params,
      (err, data) => {
        if (err)
          reject(err)
        else
          resolve(method)
      });
  })
}

exports.putIntegration = (method) => {
  var params = {
    type: method.type,
    restApiId: method.restApiId,
    resourceId: method.resourceId,
    httpMethod: method.httpMethod,
    requestTemplates: method.requestTemplates,
  };

  // Creates a Mock Integrations if the method is an OPTION
  if(params.type != 'MOCK'){
    params.uri = method.uri
    params.integrationHttpMethod = 'POST'
    params.credentials = method.credentials
  }

  return new Promise((resolve, reject) => {
    apigateway.putIntegration(params,
      (err, data) => {
        if (err){
          reject(err);
        } else {
          resolve(method);
        }
      }
    );
  })
}

exports.putMethodResponse = (methodResponse) => {
  var params = {
    httpMethod: methodResponse.httpMethod,
    resourceId: methodResponse.resourceId,
    statusCode: methodResponse.statusCode,
    restApiId: methodResponse.restApiId,
    responseParameters: methodResponse.methodResponseParameters,
  };

  return new Promise((resolve, reject) => {
    apigateway.putMethodResponse(params,
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  });
}

exports.putIntegrationResponse = (integrationResponse) => {
  var params = {
    httpMethod: integrationResponse.httpMethod,
    resourceId: integrationResponse.resourceId,
    statusCode: integrationResponse.statusCode,
    restApiId: integrationResponse.restApiId,
    responseTemplates: integrationResponse.responseTemplates,
    responseParameters: integrationResponse.integrationResponseParameters,
    selectionPattern: integrationResponse.selectionPattern,
  };

  return new Promise((resolve, reject) => {
    apigateway.putIntegrationResponse(params,
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data)
        }
      }
    );
  })
}