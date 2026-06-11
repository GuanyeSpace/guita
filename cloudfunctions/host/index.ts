import cloud from 'wx-server-sdk'

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV as unknown as string,
})

interface CloudFunctionEvent {
  action: string
  payload?: Record<string, unknown>
}

exports.main = async (event: CloudFunctionEvent) => {
  const { action, payload } = event
  console.log(`host: action=${action}`, payload)

  return {
    code: 0,
    message: 'ok',
    data: {
      placeholder: true,
    },
  }
}
