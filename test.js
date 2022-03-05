const axios = require('axios');
const track = require('./a')
const MongoClient = require("mongodb").MongoClient;
const Mongoclient = new MongoClient(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

let db = null;
let mongo = null;
const _ = require("lodash");
const main = async () => {
    mongo = await Mongoclient.connect();
    db = mongo.db("discord-bot");
    // db.collection("tracking-user-nft-owned").deleteMany({})
    //db.collection("nft-tracking-list").updateMany({}, { $set: { lastTranHash: '123' } })
    // const trackingList = [{ "_id": { "$oid": "62051f2213caed00c47fe975" }, "channel": "939723013266481223", "userAddress": "0x13a9518a451edad79079753c89cc7197ff3f570a", "lastTranHash": "123" }]

    const type = "from"
    const time = type === "to" ? 2 : 5

    if (type === "to") {
        await db.collection("tracking-user-nft-owned").deleteMany({})
        await db.collection("nft-tracking-list").updateMany({}, { $set: { lastTranHash: '123' } })
    }

    if (type === "from") {
        await db.collection("nft-tracking-list").updateMany({}, { $set: { lastTranHash: '123' } })
    }


    const trackingList = await db.collection("nft-tracking-list").find({}).toArray()
    if (trackingList) {
        for (let trackRecord of trackingList) {
            let cursor = null;
            let notify = null;
            for (let i = 0; i < time; i++) {
                [cursor, notify] = await track.trackUser(trackRecord, type, 500, db, cursor)
            }
        }
    }
}


main();

