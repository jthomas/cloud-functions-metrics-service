# cloud-functions-metrics-service

This project uses IBM Cloud Monitoring to save metrics from IBM Cloud Functions.

Metrics collected by the `openwhisk-metrics` library are forwarded into the IBM Cloud Monitoring service.

## usage

Metrics can be forwarded into IBM Cloud Monitoring in real-time or sent in batches using a background process.

Real-time ingestion has the advantage that metrics appear immediately in the monitoring dashboard. Metrics forwarded using the background process won't be available until the next background task execution.

Real-time ingestion saves invocation metrics each time the action handler is called. This adds a (small) delay to each invocation, where the library calls the external metrics service. Using the background process to forward metrics does not add any delay to action invocations.

### real-time ingestion

- Install OpenWhisk metrics and IBM Cloud Monitoring service libraries

  ```
  $ npm install openwhisk-metrics cloud-functions-metrics-service
  ```

- Wrap action handlers using external libraries

  ```javascript
  const metrics = require('openwhisk-metrics')
  const service = require('cloud-functions-metrics-service')

  metrics.service = service.client({  
    host: 'metrics.ng.bluemix.net',
    scope: '...',
    api_key: '...'
  })

  const main = params => {
  	return { message: "Hello World" }
  }

  exports.main = metrics(main)
  ```

*Configuration options for the `openwhisk-metrics` library are available in the [project repository](https://github.com/jthomas/openwhisk-metrics).*

*Configuration options for the [IBM Cloud Monitoring service](https://console.bluemix.net/docs/services/cloud-monitoring/monitoring_ov.html#monitoring_ov) are available in the project repository.*

Metrics forwarded using external real-time ingestion will not be logged to the console. If you want to enable this for debugging or testing, use this code snippet.

```javascript
const client = service.client({  
  host: 'metrics.ng.bluemix.net',
  scope: '...',
  api_key: '...'
})

const log = metrics.service

metrics.service = values => {
  log.save(values)
  return client.save(values)
}
```

### background collection

#### set up metric collectors

- Set up action handlers with `openwhisk-metrics`

  ```javascript
  const metrics = require('openwhisk-metrics')

  const main = params => {
    return { message: "Hello World" }
  }

  module.exports.main = metrics(main) 
  ```

All actions you want to collect metrics for should use the library as above. Use the action names in the configuration below for the background task.

#### create metric forwarder action

- Download project repository

  ```
  git clone jthomas/.....
  cd blah
  ```


- Create action deployment package.

  ```
  $ npm install
  $ zip -r action.zip index.js package.json lib node_modules
  ```

- Fill in authentication parameters in action configuration file (`config.json`).

  ```json
  {
    "actions": ["action_names_to_monitor", ...]
    "service": {
      "host": "metrics.ng.bluemix.net",
  	"scope": "...",
      "api_key": "..."          
    }
  }
  ```

  *Configuration options for the [IBM Cloud Monitoring service](https://console.bluemix.net/docs/services/cloud-monitoring/monitoring_ov.html#monitoring_ov) are available in the project repository.*

- Create new OpenWhisk action from deployment package and configuration file.

  ```
  $ wsk action create metric-forwarder --kind nodejs:8 action.zip --param-file config.json
  ```

- Create trigger feed for alarm package to run `metric-forwarder` on periodic schedule. 

  ```
  $ wsk trigger create interval \
    --feed /whisk.system/alarms/interval \
    --param minutes 10 \
  ```

- Bind trigger to action using rule.

  ```
  $ wsk rule create forward-metrics-on-interval interval metric-forwarder
  ```

  ​



