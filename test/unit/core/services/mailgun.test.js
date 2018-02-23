'use strict'

const { expect } = require('chai')
const {
  getStub,
  getStubP,
  assertCall,
  assertArgs
} = require('test/utils/stub')

const HttService = require('app/core/services/mailgun')

describe('core:services:mailgun', () => {

  it('should send email', () => {
    const apiKey = 'test api key'
    const domain = 'test.domain.com'
    const from = 'sender@mail.com'
    const to = 'receiver@mail.com'
    const subject = 'test subject'
    const html = '<html><body>test html email</body></html>'
    const expected = 'test'
    const messages = {
      create: getStubP(expected)
    }
    const mailgun = {
      client: getStub({
        messages
      })
    }
    const service = HttService({
      apiKey,
      domain,
      mailgun
    })

    return service
      .send({
        from,
        to,
        subject,
        html
      })
      .then(result => {
        expect(result).eq(expected)

        assertCall(mailgun.client)
        assertArgs(mailgun.client, { apiKey, domain })

        assertCall(messages.create)
        assertArgs(
          messages.create,
          domain,
          {
            from: `${from} <mailgun@${domain}>`,
            to,
            subject,
            html,
            text: undefined
          }
        )
      })
  })

})