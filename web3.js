require('dotenv').config();

const linebot = require('linebot');
const lineMessage = require('./lineMessage')
var bot = linebot({
    channelId: process.env.channelId,
    channelSecret: process.env.channelSecret,
    channelAccessToken: process.env.channelAccessToken
})

bot.push("C4dfe89cebc032ae6ca06d78a224dddfe", "test").then()
bot.on("message", async function (event) {
    console.log(event)
})
bot.listen("/hook", process.env.PORT || 3000);