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
} = require("./helpers");

const { expect } = chai;

const user1 = {
  id: "+70000000000",
  password: "12321",
};

describe("Auth Tests", function () {
  this.timeout(30000);

  it("Sign up, sign in and refresh token", async () => {
    await prepareDb();
    await healthCheck();

    // Regiser new user.
    const signupResponse = await okJson(
      signup(user1.id, user1.password),
      "Signup response"
    );

    const { refreshToken, bearerToken: bearerToken1 } = signupResponse;
    expect(refreshToken).to.have.length(36, "Refresh token (GUID)");
    expect(bearerToken1).to.have.length(36, "Bearer token (GUID)");

    // Check user info.
    const infoResponse1 = await okJson(
      info(bearerToken1),
      "Info response (authorized)"
    );
    expect(infoResponse1.userId).to.be.equal(user1.id);

    // Check that no user info is provided without a bearer token.
    await info(null).then((r) => {
      expect(r.status).to.be.equal(401, "Info response (unauthorized)");
    });

    // Log in again as the same user.
    const signinResponse = await okJson(
      signin(user1.id, user1.password),
      "Signin response"
    );

    const { bearerToken: bearerToken2 } = signinResponse;
    expect(bearerToken2).to.have.length(36, "Bearer token (GUID)");

    // Check user info.
    const infoResponse2 = await okJson(
      info(bearerToken1),
      "Info response (authorized)"
    );
    expect(infoResponse2.userId).to.be.equal(user1.id);

    // Check that logging in fails with invalid password.
    await signin(user1.id, user1.password + "1").then((r) => {
      expect(r.status).to.be.equal(401, "Signin response (invalid password)");
    });

    // Check that session expires after logout.
    await okJson(logout(bearerToken2), "Logout");
    await info(bearerToken2).then((r) => {
      expect(r.status).to.be.equal(401, "Info response (session expired)");
    });

    // Refresh session.
    const refreshResponse = await okJson(refresh(refreshToken));
    expect(refreshResponse.bearerToken).to.have.length(36, "Bearer token (GUID)");
  });
});
