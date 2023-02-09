const chai = require("chai");

const { prepareDb, healthCheck, postMessage, getMessageList, okJson } = require("./helpers");

const { expect } = chai;

const phone1 = "+79991112233";
const phone2 = "+79876543210";

const messages = [
  "Hello, world!",
  "Foo bar baz",
  "Qwerty",
  "Lorem ipsum",
  "Abcdef",
  "This message won't be posted",
  "And this one as well",
  "Now it's ok again",
];

describe("Client Message Tests", function () {
  this.timeout(30000);

  it("Post messages, get message list", async () => {
    await prepareDb();
    await healthCheck();

    const message1 = await okJson(postMessage(phone1, messages[0]), "Post message response");
    expect(message1.phone).to.be.equal(phone1);
    expect(message1.message).to.be.equal(messages[0]);

    const message2 = await okJson(postMessage(phone1, messages[1]), "Post message response");
    expect(message2.phone).to.be.equal(phone1);
    expect(message2.message).to.be.equal(messages[1]);

    const message3 = await okJson(postMessage(phone1, messages[2]), "Post message response");
    expect(message3.phone).to.be.equal(phone1);
    expect(message3.message).to.be.equal(messages[2]);

    const message4 = await okJson(postMessage(phone1, messages[3]), "Post message response");
    expect(message4.phone).to.be.equal(phone1);
    expect(message4.message).to.be.equal(messages[3]);

    const message5 = await okJson(postMessage(phone1, messages[4]), "Post message response");
    expect(message5.phone).to.be.equal(phone1);
    expect(message5.message).to.be.equal(messages[4]);

    const failedMessage1 = await postMessage(phone1, messages[5]);
    expect(failedMessage1.status).to.be.equal(403);
    const failedMessage1Json = await failedMessage1.json();
    expect(failedMessage1Json.errorCode).to.be.equal("TOO_MANY_MESSAGES");

    const failedMessage2 = await postMessage(null, messages[6]);
    expect(failedMessage2.status).to.be.equal(400);
    const failedMessage2Json = await failedMessage2.json();
    expect(failedMessage2Json.errorCode).to.be.equal("INVALID_REQUEST");

    const message6 = await okJson(postMessage(phone2, messages[7]), "Post message response");
    expect(message6.phone).to.be.equal(phone2);
    expect(message6.message).to.be.equal(messages[7]);

    const messageList = await okJson(getMessageList(), "Message list response");
    expect(messageList.messages.length).to.be.equal(6);
    expect(messageList.total).to.be.equal(6);
  });
});
