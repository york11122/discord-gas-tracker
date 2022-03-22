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

doTrack = async () => {
    try {
        const trackingList = await db.collection("nft-tracking-list").find({ isProcess: true }).toArray()

        if (trackingList) {
            for (let trackRecord of trackingList) {
                const [cursor, trackData] = await track.trackUser(trackRecord, "both", 100, db, null, apiKey);
                for (let track of trackData) {

                    const exampleEmbed = new MessageEmbed()
                        .setColor('#0099ff')
                        .setTitle(`${track.type.toUpperCase()}`)
                        .setURL(track.nft)
                        .setAuthor({ name: track.userAddress.slice(-5) })
                        .addFields(
                            { name: 'Price', value: `${track.price}` },
                        )
                        .setTimestamp(Date.parse(track.transaction_date))


                    if (track.type === "sell") {

                        exampleEmbed.addField('Profit', `${track.profit.toFixed(2)}`, true)
                        exampleEmbed.addField('Buying Price', `${track.price.toFixed(2)}`, true)
                        exampleEmbed.addField('Selling Price', `${track.sellPrice.toFixed(2)}`, true)
                    }

                    const channel = client.channels.cache.get(trackRecord.channel);
                    channel.send({ embeds: [exampleEmbed] });
                }
            }
        }
    } catch (err) {
        console.log(err.message, track)
    }
}
const main = async () => {
    mongo = await Mongoclient.connect();
    db = mongo.db("discord-bot");
     db.collection("tracking-user-nft-owned").deleteMany({userAddress:'0xed36b5f1b25a05f81034679ac1f1adc3c3cf7240'})
   // db.collection("nft-tracking-list").updateMany({}, { $set: { isProcess:false,lastTranHash: '123' } })
    //  const trackingList = [{ "_id": { "$oid": "62051f2213caed00c47fe975" }, "channel": "939723013266481223", "userAddress": "0xed36b5f1b25a05f81034679ac1f1adc3c3cf7240", "lastTranHash": "123" }]
    
    
    // //let trackingList = await db.collection("nft-tracking-list").find({isProcess:true}).toArray()
    // for (let trackRecord of trackingList) {
    //     const [cursor, trackData] = await track.trackUser(trackRecord, "both", 500, db, null, apiKey);
    //     console.log(trackData)
    //     await db.collection("nft-tracking-list").updateOne({ userAddress: trackRecord.userAddress }, { $set: { isProcess: true } })
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



    // if (trackingList) {
    //     for (let trackRecord of trackingList) {
    //     const [cursor, trackData] = await track.trackUser(trackRecord, "both", 1, db, null, apiKey);
    //     await db.collection("nft-tracking-list").updateOne({ userAddress: trackRecord.userAddress }, { $set: { isProcess: true } })
    //     }
    // }
    //mongo.close();


}


main();

