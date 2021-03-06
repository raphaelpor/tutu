var SETTINGS = require('./settings.js')
var apigateway = require('./apigateway.js')
var packagers = require('./packagers.js')
var lambda = require('./lambda.js')
var logger = require('./logger.js')
var aux = require('./aux.js')
var Path = require('path')
var Fs = require('fs')
// --------------------------------------
//            Data Processors
// --------------------------------------

// Create a Methods List with all data required to be deployed
exports.buildResource = (resource) => {
  // Creates a empty Method Array if it doesnt exist.
  if (!resource.Methods)
    resource.Methods = []

  // Add a OPTIONS method to enable CORS if at least one
  // method different than OPTIONS is on the array
  if (resource.Methods.length > 0)
    resource.Methods.push('OPTIONS')

  // Creates a empty Method Array if it doesnt exist.
  if (!resource.pathParameters)
    resource.pathParameters = []

  // Creates a empty Parameters Array if it doesnt exist.
  if (!resource.Parameters)
    resource.Parameters = []

  // Automatically add the Path name as a Parameters
  // array if it has brackets around it like: {parameter}
  var regExp = /{(.*?)}/g
  while (match = regExp.exec(resource.Endpoint))
    resource.pathParameters.push(match[1])

  // Loop all methods and inject settings to each method deploy
  // returns the input resource with all methods ready to deploy
  resource.Methods = resource.Methods.map((methodName) => {
    var method = {
      httpMethod: methodName,
      authorizationType: 'NONE',
      resourceId: resource.id,
      restApiId: resource.restApiId,
    }

    // Inject the standalone lambdaURI
    // if it is a standalone package
    if (resource.Standalone)
      method.uri = resource.lambdaURI
    else
      method.uri = resource.default.unifiedLambdaURI

    // If the method is OPTIONS then set type as
    // mock integration
    if (method.httpMethod == 'OPTIONS') {
      method.type = 'MOCK'
      method.requestTemplates = buildOptionsRequestTemplates(resource)
      method.responses = buildOptionsResponses(resource)
    } else {
      method.type = 'AWS'
      method.requestTemplates = buildRequestTemplates(resource)
      method.requestParameters = buildRequestParameters(resource)
      method.responses = buildMethodResponses(methodName, resource)
    }

    return method
  })

  // Build Sub Resources
  if (!resource.Resources){
    resource.Resources = []
  } else {
    logger.status('Building SubResources')
    resource.Resources = resource.Resources.map((subResource) => {
      subResource.parent = resource
      subResource.restApiId = resource.restApiId
      subResource.pathParameters = resource.pathParameters
      subResource.default = resource.default
      return subResource
    })
  }

  return resource
}

// Build request Parameters
var buildRequestTemplates = (resource) => {
  // Join Path Parameters {example} with any resource Parameters ?example="val"
  var requestTemplateArray = []
  requestTemplateArray = requestTemplateArray.concat(resource.pathParameters)
  requestTemplateArray = requestTemplateArray.concat(resource.Parameters)
  requestTemplateArray.push(resource.default.requestTemplates)

  var templateString = "{"
  requestTemplateArray.forEach((item) => {
    if (typeof item == 'string')
      templateString += "\"" + item + "\": " + "\"$input.params('" + item + "')\", "
    else {
      for ( property in item )
        templateString += "\"" + property + "\": " + "\"" + item[property] + "\", "
    }
  })

  templateString = templateString.substring(0, templateString.length - 2)
  templateString += "}"
  return { "application/json": templateString }
}

// Build OPTION request tempalte
buildOptionsRequestTemplates = (resource) => {
  return {"application/json": "{\"statusCode\": 200}"}
}

// Build methods responses
buildMethodResponses = (methodName, resource) => {
  var responses = resource.default.responses
  return responses.map((response) => {
    return {
      httpMethod: methodName,
      resourceId: resource.id,
      restApiId: resource.restApiId,
      selectionPattern: response.selectionPattern,
      statusCode: response.statusCode,
      responseTemplates: response.responseTemplates,
      methodResponseParameters: buildMethodResponseParameters(response.responseParameters),
      integrationResponseParameters: buildIntegrationResponseParameters(response.responseParameters),
    }
  })
}

// Build options reponses
buildOptionsResponses = (resource) => {
  return [{
    httpMethod: 'OPTIONS',
    resourceId: resource.id,
    restApiId: resource.restApiId,
    selectionPattern: null,
    statusCode: "200",
    responseTemplates: {"application/json": ""},
    methodResponseParameters: buildMethodResponseParameters(defaultOptionsResponseParameters),
    integrationResponseParameters: buildOptionsResponseParameters(resource),
  }]
}

// Build the request parameters of a method
buildRequestParameters = (resource) => {
  var requestParameters = {}

  // Add parameters querystrings
  resource.Parameters.forEach((param) => {
    var location = 'method.request.querystring.' + param
    requestParameters[location] = true;
  })

  // Add default requestparameters if exists
  for (key in resource.default.requestParameters){
    var location = resource.default.requestParameters[key]
    requestParameters[location] = true;
  }

  return requestParameters;
}

// Build the responses of a method
buildMethodResponseParameters = (responseParameters) => {
  var result = {};
  for (key in responseParameters)
    result[key] = true;
  return result;
}

// Build the responses of a method
buildIntegrationResponseParameters = (responseParameters) => {
  return responseParameters
}

buildOptionsResponseParameters = (resource) => {
  var methods = ''
  var opr = defaultOptionsResponseParameters
  resource.Methods.map(( name ) => {
    if (name != 'OPTIONS')
      methods += name + ','
  })
  opr["method.response.header.Access-Control-Allow-Methods"] = "'" + methods + "'"
  return opr
}

defaultOptionsResponseParameters = {
  "method.response.header.Access-Control-Allow-Origin": "'*'",
  "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,x-Authorization'",
  "method.response.header.Access-Control-Allow-Methods": "'GET,POST'"
}
