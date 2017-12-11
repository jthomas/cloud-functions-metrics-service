# cloud-functions-metrics-service

```javascript
const metrics = require('openwhisk-metrics')
const service = require('cloud-functions-metrics-service')

metrics.service = service({  
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
const service = require('cloud-functions-metrics-service')

const client = service({  
  host: 'metrics.ng.bluemix.net',
  scope: '...',
  api_key: '...'
})

const log = metrics.service

metrics.service = values => {
  log.save(values)
  return client.save(values)
}

const main = params => {
  return { message: "Hello World" }
}

module.exports.main = metrics(main)
```

