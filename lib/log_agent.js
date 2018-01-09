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
    .reduce(flatten, [])

  return metrics
}

const save_metrics = async (metrics, options) => {
  if (!metrics.length) {
    console.log('no metrics discovered, search will resume at same offset next time...')
    return
  }

  const client = service(options)
  console.log(`saving to metrics service -> ${options.host}`)
  console.time('saving metrics to service took')
  try {
    await client.save(metrics)
    console.timeEnd('saving metrics to service took')
  } catch (err) {
    console.log('Failed to save metrics to service.', err)
  }
}

const update_since = async (ow, since) => {
  const name = process.env['__OW_ACTION_NAME']
  console.log(`updating since parameter for ${name}: ${since}`)
  const action = await ow.actions.get(name)
  action.parameters.push({key: 'since', value: since})
  await ow.actions.update({name, action})
}

// return start time for most recent activation plus one millsecond
const next_since_offset = (activations, since) =>
  activations.reduce((timestamp, actv) => actv.start > timestamp ? actv.start : timestamp, since - 1) + 1

// manually page through activation results to handle this bug
// https://github.com/apache/incubator-openwhisk/issues/1414
const all_activations = async (ow, name, since) => {
  let current = [], results = [], skip = 0
  const limit = 200

  do {
    current = await ow.activations.list({name, since, skip, limit, docs: true})
    results = results.concat(current)
    skip += current.length
  } while (current.length)

  return results
}

const log_agent = async params => {
  if (!Array.isArray(params.actions) || params.actions.length === 0) {
    throw new Error('Missing or invalid value for mandatory default parameter: actions')
  }

  console.log(`actions being monitored:`, params.actions)

  let since = params.since || (new Date()).getTime()
  console.log(`retrieving logs since: ${since}`)

  const ow = openwhisk()

  const results = await Promise.all(params.actions.map(name => all_activations(ow, name, since)))
  const activations = results.reduce(flatten)
  const metrics = metrics_from_activations(activations)

  console.log(`found ${metrics.length} metric values from ${activations.length} activations`)

  await save_metrics(metrics, params.service)

  // next search offset should be one millisecond past last activation start time.
  since = next_since_offset(activations, since)
  await update_since(ow, since)
}

module.exports = log_agent
