const fetch = require("node-fetch");
const chai = require("chai");

const { sequelize } = require("../dist/db");

// Constants.

const APP_ROOT = "http://app:3000";

// Non-HTTP helpers.

exports.prepareDb = async function prepareDb() {
  await sequelize.query("DELETE FROM issuetracker.clientMessages;", {
    raw: true,
  });
};

// Generic request helpers.

async function post(reqUrl, reqBody, reqHeaders) {
  return await fetch(reqUrl, {
    method: "POST",
    body: JSON.stringify(reqBody),
    headers: Object.assign(
      {
        "Content-Type": "application/json",
      },
      reqHeaders
    ),
  });
}
exports.post = post;

async function get(reqUrl, reqParams, reqHeaders) {
  const qs = reqParams == null ? "" : "?" + new URLSearchParams(reqParams).toString();
  return await fetch(`${reqUrl}${qs}`, { method: "GET", headers: reqHeaders });
}
exports.get = get;

// Specific request helpers.

/**
 * @returns {Promise<fetch.Response>}
 */
exports.healthCheck = async function healthCheck() {
  const helloResponse = await fetch(`${APP_ROOT}/hello`, { method: "GET" });
  chai.expect(helloResponse.status).to.be.equal(200, "Hello response status");
  return helloResponse;
};

// /**
//  * @returns {Promise<fetch.Response>}
//  */
// exports.signup = async function signup(userId, password) {
//   return await post(`${APP_ROOT}/signup`, {
//     userId,
//     password,
//   });
// };

/**
 *
 * @param {string} phone
 * @param {string} message
 * @returns {Promise<fetch.Response>}
 */
exports.postMessage = async function postMessage(phone, message) {
  return await post(`${APP_ROOT}/message/post`, {
    phone,
    message,
  });
};

/**
 *
 * @param {number|null} afterId
 * @param {number|null} count
 * @returns {Promise<fetch.Response>}
 */
exports.getMessageList = async function getMessageList(afterId = null, count = null) {
  const query = {};
  if (afterId != null) query.afterId = afterId;
  if (count != null) query.count = count;
  return await get(`${APP_ROOT}/message/list`, query);
};

// Test helpers.

function expectOk(response, message) {
  chai.expect(response.status).to.be.equal(200, message);
}
exports.expectOk = expectOk;

async function okJson(response, message) {
  return response.then(async (r) => {
    try {
      expectOk(r, message);
      return await r.json();
    } catch (e) {
      const body = await r.json();
      console.error(body);
      throw e;
    }
  });
}
exports.okJson = okJson;
