/**

 * ����ʱ���ã�window.conf / runtime-config.json / process.env

 */

function confValue (key) {

  const conf = window.conf

  if (conf && typeof conf === 'object' && conf[key] != null && conf[key] !== '') {

    return String(conf[key]).trim()

  }

  const env = process.env[key]

  if (env != null && env !== '') {

    return String(env).trim()

  }

  return ''

}



export function getOpenApiAdminKey () {

  return confValue('VUE_APP_OPEN_API_ADMIN_KEY')

}



export function hasOpenApiAdminKey () {

  return !!getOpenApiAdminKey()

}



export function getOpenApiBaseURLFromConf () {

  return confValue('VUE_APP_OPEN_API_BASE_URL') || '/open-api-service'

}



/**

 * ������� Partner API �� baseURL��������ʽ��������ֱ�� partner-gateway ʱʹ�ã���

 * E2E ���������գ���ͬԴ /oauth/token��/api/open/v1 + devServer/nginx ������������� 403��

 */

export function getOpenPartnerGatewayURLFromConf () {

  return confValue('VUE_APP_OPEN_PARTNER_GATEWAY_URL')

}


