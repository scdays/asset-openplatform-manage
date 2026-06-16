'use strict'
/** UTF-8 Chinese UI strings as hex (no raw Chinese in source file). */
const dec = h => Buffer.from(h, 'hex').toString('utf8')

const Z = {
  openPlatform: 'e5bc80e694bee5b9b3e58fb0',
  featureOverview: 'e58a9fe883bde680bbe8a788',
  invocationGovernance: 'e8b083e794a8e6b2bbe79086',
  invocationList: 'e8b083e794a8e8aeb0e5bd95',
  invocationDetail: 'e8b083e794a8e8afa6e68385',
  openPreviewDrawer: 'e68993e5bc80e9a284e8a78820447261776572',
  viewRequestBody: 'e69fa5e79c8be8afb7e6b182e68aa5e69687',
  downloadRequestTxt: 'e4b88be8bdbde8afb7e6b18220545854',
  viewResponseBody: 'e69fa5e79c8be5938de5ba94e68aa5e69687',
  downloadResponseTxt: 'e4b88be8bdbde5938de5ba9420545854',
  backToList: 'e8bf94e59b9ee58897e8a1a8',
  summary: 'e6a682e8a681',
  businessDomain: 'e4b89ae58aa1e59f9f',
  responseCode: 'e5938de5ba94e7a081',
  latency: 'e88097e697b6',
  relatedResources: 'e585b3e88194e8b584e6ba90',
  timelineTitle: 'e8b083e794a8e8bf87e7a88b2054696d656c696e65',
  headersCard: 'e8afb7e6b182e5a4b4202f20e5938de5ba94e5a4b4',
  requestHeader: 'e8afb7e6b182e5a4b4',
  responseHeader: 'e5938de5ba94e5a4b4',
  copy: 'e5a48de588b6',
  bodiesCard: 'e8afb7e6b182e4bd93202f20e5938de5ba94e4bd93',
  requestBodyLarge: 'e8afb7e6b182e68aa5e69687e8be83e5a4a7efbc8ce9bb98e8aea4e4b88de58aa0e8bdbde38082',
  responseBodyLarge: 'e5938de5ba94e68aa5e69687e8be83e5a4a7efbc8ce9bb98e8aea4e4b88de58aa0e8bdbde38082',
  persistedAbout: 'e5b7b2e68c81e4b985e58c96e7baa6',
  modalView: 'e5bcb9e7aa97e69fa5e79c8b',
  downloadTxt: 'e4b88be8bdbd20545854',
  noRequestBody: 'e69a82e697a0e8afb7e6b182e68aa5e69687',
  noResponseBody: 'e69a82e697a0e5938de5ba94e68aa5e69687',
  errorDetail: 'e99499e8afafe8afa6e68385',
  notFoundOrLoadFail: 'e69caae689bee588b0e8b083e794a8e8aeb0e5bd95e68896e58aa0e8bdbde5a4b1e8b4a5',
  loadDetailFail: 'e58aa0e8bdbde8b083e794a8e8afa6e68385e5a4b1e8b4a5',
  noDownloadContent: 'e69a82e697a0e58fafe4b88be8bdbde58685e5aeb9',
  downloadStarted: 'e5b7b2e5bc80e5a78be4b88be8bdbd',
  downloadRequestFail: 'e4b88be8bdbde8afb7e6b182e68aa5e69687e5a4b1e8b4a5',
  downloadResponseFail: 'e4b88be8bdbde5938de5ba94e68aa5e69687e5a4b1e8b4a5',
  noCopyContent: 'e69a82e697a0e58fafe5a48de588b6e58685e5aeb9',
  copied: 'e5b7b2e5a48de588b6',
  copyFailManual: 'e5a48de588b6e5a4b1e8b4a5efbc8ce8afb7e6898be58aa8e98089e68ba9e5a48de588b6',
  drawerHint: 'e5bfabe9809fe9a284e8a788e8b083e794a8e69198e8a681efbc8ce5ae8ce695b4e68aa5e69687e8afb7e68993e5bc80e8afa6e68385e9a1b5',
  payloadTab: 'e68aa5e696872fe5938de5ba94',
  payloadHelper: '5265717565737420426f647920e4b88e20526573706f6e736520426f647920e59d87e68c89e99c80e4ba8ce6aca1e58aa0e8bdbde38082',
  clickLoadFull: 'e782b9e587bbe5908ee58aa0e8bdbde5ae8ce695b4e68aa5e69687e38082',
  noDetail: 'e69a82e697a0e8b083e794a8e8afa6e68385',
  openFullDetail: 'e68993e5bc80e5ae8ce695b4e8afa6e68385',
  close: 'e585b3e997ad',
  previewTitle: 'e8b083e794a8e9a284e8a788',
  loading: 'e58aa0e8bdbde4b8ad2e2e2e',
  eventType: 'e4ba8be4bbb6e7b1bbe59e8b',
  status: 'e78ab6e68081',
    startTime: 'e5bc80e5a78be697b6e997b4',
    fullStop: 'e38082',
  relatedWebhook: 'e585b3e8819420576562686f6f6b',
  sizeLabel: 'e5a4a7e5b08fefbc9a',
  fullRequest: 'e5ae8ce695b4e8afb7e6b182',
  summaryRebuild: 'e69198e8a681e9878de5bbba',
  copyJson: 'e5a48de588b6204a534f4e',
  loadRequestFail: 'e58aa0e8bdbde8afb7e6b182e68aa5e69687e5a4b1e8b4a5',
  requestJsonCopied: 'e8afb7e6b182204a534f4e20e5b7b2e5a48de588b6',
  copyFailed: 'e5a48de588b6e5a4b1e8b4a5',
  middleDotSep: '207c20'
}

function t (key) {
  const hex = Z[key]
  if (!hex) throw new Error('missing zh key: ' + key)
  return dec(hex)
}

module.exports = { dec, Z, t }
