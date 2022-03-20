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
   // db.collection("nft-tracking-list").updateMany({}, { $set: { isProcess:false,lastTranHash: '123' } })
    // const trackingList = [{ "_id": { "$oid": "62051f2213caed00c47fe975" }, "channel": "939723013266481223", "userAddress": "0x1156a767b4de8af9f77adc8f30313bbe7946b14d", "lastTranHash": "123" }]
    
    
     let trackingList = await db.collection("nft-tracking-list").find({}).toArray()
    // for (let trackRecord of trackingList) {
    //     const [cursor, trackData] = await track.trackUser(trackRecord, "both", 500, db, null, apiKey);
    // }
   

    // let trackingList = await db.collection("nft-tracking-list").find({ isProcess: false }).toArray()
    // if (trackingList) {

    //     for (let trackRecord of trackingList) {
    //         await db.collection("tracking-user-nft-owned").deleteMany({ userAddress: trackRecord.userAddress })
    //         await db.collection("nft-tracking-list").updateOne({ userAddress: trackRecord.userAddress }, { $set: { lastTranHash: '123' } })
    //     }

    //     for (let trackRecord of trackingList) {

    //         let cursor = null;
    //         let notify = null;
    //         for (let i = 0; i < 2; i++) {
    //             [cursor, notify] = await track.trackUser(trackRecord, "to", 500, db, cursor, apiKey)
    //         }
    //     }
    // }



    if (trackingList) {
        for (let trackRecord of trackingList) {
        const [cursor, trackData] = await track.trackUser(trackRecord, "both", 1, db, null, apiKey);
        await db.collection("nft-tracking-list").updateOne({ userAddress: trackRecord.userAddress }, { $set: { isProcess: true } })
        }
    }
    mongo.close();


}


main();

