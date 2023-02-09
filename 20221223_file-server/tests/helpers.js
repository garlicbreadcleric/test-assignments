const url = require("url");
const fs = require("fs");

const fetch = require("node-fetch");
const chai = require("chai");
const FormData = require("form-data");

const { sequelize } = require("../dist/db");

// Constants.

const APP_ROOT = "http://app:3000";

const CONTENT_LENGTH_HEADER = "content-length";
const CONTENT_TYPE_HEADER = "content-type";
const BEARER_TOKEN_HEADER = "bearer-token";
const REFRESH_TOKEN_HEADER = "refresh-token";

// Non-HTTP helpers.

exports.prepareDb = async function prepareDb() {
  await sequelize.query(
    "DELETE FROM fileserver.file;",
    { raw: true }
  );
  await sequelize.query(
    "DELETE FROM fileserver.session;",
    { raw: true }
  );
  await sequelize.query(
    "DELETE FROM fileserver.user;",
    { raw: true }
  );
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
  const qs =
    reqParams == null ? "" : "?" + new URLSearchParams(reqParams).toString();
  return await fetch(`${reqUrl}${qs}`, { method: "GET", headers: reqHeaders });
}
exports.get = get;

async function getAuthorized(bearerToken, reqUrl, reqParams, reqHeaders) {
  return await get(
    reqUrl,
    reqParams,
    Object.assign({ [BEARER_TOKEN_HEADER]: bearerToken }, reqHeaders)
  );
}
exports.getAuthorized = getAuthorized;

async function postAuthorized(bearerToken, reqUrl, reqBody, reqHeaders) {
  return await post(
    reqUrl,
    reqBody,
    Object.assign({ [BEARER_TOKEN_HEADER]: bearerToken }, reqHeaders)
  );
}
exports.postAuthorized = postAuthorized;

async function deleteAuthorized(bearerToken, reqUrl, reqBody, reqHeaders) {
  return await fetch(reqUrl, {
    method: "DELETE",
    headers: Object.assign({[BEARER_TOKEN_HEADER]: bearerToken}, reqHeaders),
    body: reqBody
  });
}
exports.deleteAuthorized = deleteAuthorized;

async function download(res, filePath) {
  const fileStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
}
exports.download = download;

// Specific request helpers.

/**
 * @returns {Promise<fetch.Response>}
 */
exports.healthCheck = async function healthCheck() {
  const helloResponse = await fetch(`${APP_ROOT}/hello`, { method: "GET" });
  chai.expect(helloResponse.status).to.be.equal(200, "Hello response status");
  return helloResponse;
};

/**
 * @returns {Promise<fetch.Response>}
 */
exports.signup = async function signup(userId, password) {
  return await post(`${APP_ROOT}/signup`, {
    userId,
    password,
  });
};

/**
 * @returns {Promise<fetch.Response>}
 */
exports.signin = async function signin(userId, password) {
  return await post(`${APP_ROOT}/signin`, {
    userId,
    password,
  });
};

/**
 * @returns {Promise<fetch.Response>}
 */
exports.logout = async function logout(bearerToken) {
  return await getAuthorized(bearerToken, `${APP_ROOT}/logout`);
}

/**
 * @returns {Promise<fetch.Response>}
 */
exports.refresh = async function refresh(refreshToken) {
  return await post(`${APP_ROOT}/signin/new_token`, {}, { [REFRESH_TOKEN_HEADER]: refreshToken });
}

/**
 * @returns {Promise<fetch.Response>}
 */
exports.info = async function info(bearerToken) {
  return await getAuthorized(bearerToken, `${APP_ROOT}/info`);
};

/**
 * @returns {Promise<fetch.Response>}
 */
exports.fileUpload = async function fileUpload(bearerToken, filePath) {
  const fileStream = fs.createReadStream(filePath);
  const form = new FormData();
  form.append("content-type", "application/octet-stream");
  form.append("file", fileStream);

  return await fetch(`${APP_ROOT}/file/upload`, {
    method: "POST",
    headers: {
      [BEARER_TOKEN_HEADER]: bearerToken
    },
    body: form
  });
}

/**
 * @returns {Promise<fetch.Response>}
 */
exports.fileGet = async function fileGet(bearerToken, fileId) {
  return await getAuthorized(bearerToken, `${APP_ROOT}/file/${fileId}`);
}

/**
 * @returns {Promise<fetch.Response>}
 */
exports.fileDownload = async function fileDownload(bearerToken, fileId) {
  return await getAuthorized(bearerToken, `${APP_ROOT}/file/${fileId}/download`);
};

/**
 * @returns {Promise<fetch.Response>}
 */
exports.fileList = async function fileList(bearerToken) {
  return await getAuthorized(bearerToken, `${APP_ROOT}/file/list`);
}

/**
 * @returns {Promise<fetch.Response>}
 */
exports.fileUpdate = async function fileUpdate(bearerToken, fileId, filePath) {
  const fileStream = fs.createReadStream(filePath);
  const form = new FormData();
  form.append("content-type", "application/octet-stream");
  form.append("file", fileStream);

  return await fetch(`${APP_ROOT}/file/update/${fileId}`, {
    method: "PUT",
    headers: {
      [BEARER_TOKEN_HEADER]: bearerToken
    },
    body: form
  });
}

/**
 * @returns {Promise<fetch.Response>}
 */
exports.fileDelete = async function fileDelete(bearerToken, fileId) {
  return await deleteAuthorized(bearerToken, `${APP_ROOT}/file/delete/${fileId}`);
}

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
