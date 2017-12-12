const openwhisk = require('openwhisk')
const service = require('./service')

const flatten = (a = [], b) => a.concat(b)

// convert activation records with logs to metric values.
// log messages for metrics using format: METRIC label value timestamp
const metrics_from_activations = activations => {
  const log_to_metric = log => {
    const [match, name, value, timestamp] = log.match(/METRIC (.+) (.+) (.+)/)
    return { name, value: Number(value), timestamp: Number(timestamp) }
  }

  const is_metric_log = log => log.match('stdout: METRIC')

  const metrics = activations
    .map(actv => actv.logs.filter(is_metric_log).map(log_to_metric))
    .reduce(flatten)

  return metrics
}

// return start time for most recent activation plus one millsecond
const next_since_offset = activations =>
  activations.reduce((timestamp, actv) => actv.start > timestamp ? actv.start : timestamp, 0) + 1

const log_agent = async params => {
  if (!Array.isArray(params.actions) || params.actions.length === 0) {
    throw new Error('Missing or invalid value for mandatory default parameter: actions')
  }

  const client = service(params.service)

  console.log(`actions being monitored:`, params.actions)

  let since = params.since || (new Date()).getTime()
  console.log(`retrieving logs since: ${since}`)

  const ow = openwhisk()

  const results = await Promise.all(params.actions.map(action => {
    return ow.activations.list({
      name: action,
      since,
      docs: true
    })
  }))

  const activations = results.reduce(flatten)
  const metrics = metrics_from_activations(activations)

  console.log(`found ${metrics.length} metric values from ${activations.length} activations`)

  console.log(`saving to metrics service -> ${params.service.host}`)
  console.time('saving metrics to service took')
  try {
    await client.save(metrics)
    console.timeEnd('saving metrics to service took')
  } catch (err) {
    console.log('Failed to save metrics to service.', err)
  }

  // next search offset should be one millisecond past last activation start time.
  since = next_since_offset(activations)
  console.log(`updating since parameter: ${since}`)
  //
  // UPDATE SINCE....
}

module.exports = log_agent
