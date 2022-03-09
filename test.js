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
const apiKey = "ANZokVBAOWCnHAZLjrIutWmXOVlmu0SSZV51SoqLLM6ivpqE2QBZFMY6QnejYi8I";
const main = async () => {
    mongo = await Mongoclient.connect();
    db = mongo.db("discord-bot");
    // db.collection("tracking-user-nft-owned").deleteMany({})
    //db.collection("nft-tracking-list").updateMany({}, { $set: { lastTranHash: '123' } })
    // const trackingList = [{ "_id": { "$oid": "62051f2213caed00c47fe975" }, "channel": "939723013266481223", "userAddress": "0x13a9518a451edad79079753c89cc7197ff3f570a", "lastTranHash": "123" }]




    let trackingList = await db.collection("nft-tracking-list").find({ isProcess: false }).toArray()
    if (trackingList) {

        for (let trackRecord of trackingList) {
            await db.collection("tracking-user-nft-owned").deleteMany({ userAddress: trackRecord.userAddress })
            await db.collection("nft-tracking-list").updateMany({}, { $set: { lastTranHash: '123' } })
        }

        for (let trackRecord of trackingList) {

            let cursor = null;
            let notify = null;
            for (let i = 0; i < 2; i++) {
                [cursor, notify] = await track.trackUser(trackRecord, "to", 500, db, cursor, apiKey)
            }
        }
    }




    trackingList = await db.collection("nft-tracking-list").find({ isProcess: false }).toArray()
    if (trackingList) {

        await db.collection("nft-tracking-list").updateMany({}, { $set: { lastTranHash: '123' } })


        for (let trackRecord of trackingList) {
            let cursor = null;
            let notify = null;
            for (let i = 0; i < 5; i++) {
                [cursor, notify] = await track.trackUser(trackRecord, "from", 500, db, cursor, apiKey)
            }

            await db.collection("nft-tracking-list").updateOne({ userAddress: trackRecord.userAddress }, { $set: { isProcess: true } })

        }
    }
    mongo.close();


}


main();

