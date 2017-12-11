



# cloud-functions-metrics



```javascript
const metrics = require('openwhisk-metrics')
const metrics_service = require('cloud-functions-metrics')

metrics.service = metrics_service({  
  host: 'metrics.ng.bluemix.net',
  scope: '...',
  api_key: '...'
})

const main = params => {
	return { message: "Hello World" }
}

module.exports.main = metrics(main)
```



```javascript
const metrics = require('openwhisk-metrics')
const metrics_service = require('cloud-functions-metrics')

const service = metrics_service({  
  host: 'metrics.ng.bluemix.net',
  scope: '...',
  api_key: '...'
})

const log = metrics.service

metrics.service = values => {
  log.save(values)
  return service.save(values)
}

const main = params => {
	return { message: "Hello World" }
}

module.exports.main = metrics(main)
```

