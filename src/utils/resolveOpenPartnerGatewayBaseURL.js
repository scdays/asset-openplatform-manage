import { getOpenPartnerGatewayURLFromConf } from '@/utils/openPlatformRuntime'

/**
 * Partner �������أ�partner-gateway������ַ��
 * - δ���ã����� ''��������ͬԴ /oauth/token��/api/open/v1��devServer/nginx �� 35770��
 * - ��ʽ���þ��� URL�������ֱ�� partner-gateway�������ؿ��� CORS��
 */
export default function resolveOpenPartnerGatewayBaseURL () {
  const configured = getOpenPartnerGatewayURLFromConf().trim()
  if (!configured) {
    return ''
  }
  return configured.replace(/\/$/, '')
}
