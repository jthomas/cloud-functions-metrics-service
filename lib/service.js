const Monitoring = require('ibm-cloud-monitoring')

const host = process.env['__OW_API_HOST']

if (!host) throw new Error('Unable to find IBM Cloud region from __OW_API_HOST.')

let region = host.match(/openwhisk\.(.+)\.bluemix/)[1]

if (!region) throw new Error('Unable to find IBM Cloud region from __OW_API_HOST.')

if (region === 'ng') region = 'us-south'

const service = config => {
  const client = new Monitoring(config)
  const save = metrics => {
    const renamed_metrics = metrics.map(metric => {
      metric.name = `ibm.public.cloud-functions.${region}.${metric.name}`
      return metric
    })
    return client.save(renamed_metrics)
  }

  return { save }
}

module.exports = service
