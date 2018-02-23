'use strict'

const sinon = require('sinon')

const getStub = result =>
  sinon
    .stub()
    .returns(result)

const getStubP = result =>
  sinon
    .stub()
    .resolves(result)

const getErrStub = err =>
  sinon
    .stub()
    .throws(err)

const getErrStubP = err =>
  sinon
    .stub()
    .rejects(err)

const assertCall = (spy, count = 1) =>
  sinon.assert.callCount(spy, count)

const assertArgs = (spy, ...args) =>
  sinon.assert.calledWith(spy, ...args)

module.exports = {
  getStub,
  getStubP,
  getErrStub,
  getErrStubP,

  assertCall,
  assertArgs
}
