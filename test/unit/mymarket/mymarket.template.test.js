'use strict'

const { join } = require('path')
const { readFileSync } = require('fs')
const { CloudFormation } = require('aws-sdk')

describe('mymarket:template', () => {

  it('should validate a template', done => {
    const cf = new CloudFormation({
      region: 'eu-west-1'
    })
    const TemplateBody = readFileSync(
      join(__dirname, '../../../src/mymarket/mymarket.template')
    ).toString('utf-8')

    cf.validateTemplate({
      TemplateBody
    }, err => {
      if (err) {
        return done(err)
      }

      done()
    })
  })

})
