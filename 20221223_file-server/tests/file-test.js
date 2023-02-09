const chai = require("chai");

const {
  prepareDb,
  healthCheck,
  signup,
  info,
  expectOk,
  okJson,
  signin,
  logout,
  refresh,
  fileUpload,
  fileList,
  fileDelete,
  fileUpdate,
} = require("./helpers");

const { expect } = chai;

const user1 = {
  id: "+70000000000",
  password: "12321",
};

describe("File Tests", function () {
  this.timeout(30000);

  it("Upload, get, list, delete", async () => {
    // Preparations (cleanup DB, healthcheck, register user).
    await prepareDb();
    await healthCheck();

    const signupResponse = await okJson(
      signup(user1.id, user1.password),
      "Signup response"
    );

    const { bearerToken } = signupResponse;
    expect(bearerToken).to.have.length(36, "Bearer token (GUID)");

    const fileUploadResponse1 = await okJson(fileUpload(bearerToken, "tests/files/github.png"), "File upload response (github.png)");
    expect(fileUploadResponse1.fileName).to.be.equal("github.png");
    expect(fileUploadResponse1.mimeType).to.be.equal("image/png");
    
    await fileUpload(null, "tests/files/github.png").then(async r => {
      expect(r.status).to.be.equal(401, "File upload response (unauthorized)");
    });

    const fileUploadResponse2 = await okJson(fileUpload(bearerToken, "tests/files/nodejs.svg"), "File upload response (nodejs.svg)");
    expect(fileUploadResponse2.fileName).to.be.equal("nodejs.svg");
    expect(fileUploadResponse2.mimeType).to.be.equal("image/svg+xml");

    const fileListResponse1 = await okJson(fileList(bearerToken));
    expect(fileListResponse1.length).to.be.equal(2);

    await okJson(fileDelete(bearerToken, fileUploadResponse1.fileId));

    const fileListResponse2 = await okJson(fileList(bearerToken));
    expect(fileListResponse2.length).to.be.equal(1);

    const fileUpdateResponse = await okJson(fileUpdate(bearerToken, fileUploadResponse2.fileId, "tests/files/sequelize.svg"), "File update response (nodejs.svg -> sequelize.svg)");
    expect(fileUpdateResponse.fileName).to.be.equal("sequelize.svg");
    expect(fileUpdateResponse.mimeType).to.be.equal("image/svg+xml");
  });
});