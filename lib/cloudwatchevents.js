var Aws = require('aws-sdk')
var cloudwatchevents = new Aws.CloudWatchEvents({region: SETTINGS.REGION})

exports.putRule => (Rule){
  var params = {
    Name: Rule.Name,
    Description: Rule.Description,
    EventPattern: Rule.EventPattern,
    RoleArn: Rule.RoleArn,
    ScheduleExpression: Rule.ScheduleExpression,
    State: 'ENABLED'
  }

  return new Promise((resolve, reject) =>
      cloudwatchevents.putRule(params, function(err, data) {
        (err, data) => {
          if (err)
            reject(err)
          else
            resolve(data)
        })
      })
}