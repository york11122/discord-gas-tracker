
require('dotenv').config();
const linebot = require('linebot');
const lineMessage = require('./lineMessage')
var bot = linebot({
    channelId: process.env.channelId,
    channelSecret: process.env.channelSecret,
    channelAccessToken: process.env.channelAccessToken
})


// bot.broadcast(res).then(console.log('Job:官網消息推播完成'))

const line_message = new lineMessage([
{
    price:"123", 
    selling_price:"123" ,
    profit:"123" ,
    buying_price:"123"
}]);
const message = line_message.getMessage("SELL / e9843")


bot.broadcast({
    type: "flex",
    altText: "this is a flex message",
    contents: message,
  }).then(console.log('Job:官網消息推播完成'))
