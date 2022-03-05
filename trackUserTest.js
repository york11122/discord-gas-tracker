const axios = require('axios');
require('dotenv').config();
const _ = require("lodash");
const randomip = require('random-ip');

track = async (trackRecord, db, input_continuation) => {
    try {
        //let req = `https://api.nftport.xyz/v0/transactions/accounts/${trackRecord.userAddress}?chain=ethereum&type=buy&page_size=50`;
        let req = `https://api.nftport.xyz/v0/transactions/accounts/${trackRecord.userAddress}?chain=ethereum&type=sell&page_size=50`;
        if (input_continuation) {
            req = req + `&continuation=${input_continuation}`
        }
        const res = await axios.get(req, {
            headers: {
                "Authorization": process.env.NFTPORT_KEY
            }
        })
        const trackData = res.data.transactions;
        const continuation = res.data.continuation;
        if (trackData.length === 0) {
            return [];
        }
        const lastTranHash = trackData[0].transaction_hash

        let listToNodify = [];
        if (trackRecord.lastTranHash) {

            // console.log(trackData)
            for (let item of trackData) {
                console.log(item.block_number)
                if (item.transaction_hash === trackRecord.lastTranHash) {
                    break;
                }
                if (item.type === 'cancel_list') {
                    continue;
                }
                if (item.type === 'mint') {
                    // const contractDetail = await getContractDetail(item.nft);
                    const img_url = '';
                    // listToNodify.push({
                    //     userAddress: trackRecord.userAddress,
                    //     type: 'mint',
                    //     transaction_date: item.transaction_date,
                    //     price_details: 'NA',
                    //     img_url,
                    //     nft: `https://opensea.io/assets/${item.contract_address}/${item.token_id}`
                    // })

                    await db.collection("tracking-user-nft-owned").updateOne({
                        userAddress: trackRecord.userAddress,
                        contract_address: item.contract_address,
                        token_id: item.token_id,
                    }, {
                        $set: {
                            type: item.type,
                            userAddress: trackRecord.userAddress,
                            transaction_date: item.transaction_date,
                            contract_address: item.contract_address,
                            token_id: item.token_id,
                            img_url,
                            block_number: item.block_number,
                            isSold: false,
                            nft: `https://opensea.io/assets/${item.contract_address}/${item.token_id}`
                        }
                    }, { upsert: true })
                    continue;
                }

                // if (item.type === 'transfer') {
                //     // const contractDetail = await getContractDetail(item.nft);
                //     console.log(999)
                //     const img_url = '';
                //     // listToNodify.push({
                //     //     userAddress: trackRecord.userAddress,
                //     //     type: 'mint',
                //     //     transaction_date: item.transaction_date,
                //     //     price_details: 'NA',
                //     //     img_url,
                //     //     nft: `https://opensea.io/assets/${item.contract_address}/${item.token_id}`
                //     // })
                //     await db.collection("tracking-user-nft-owned").updateOne({
                //         userAddress: trackRecord.userAddress,
                //         contract_address: item.contract_address,
                //         token_id: item.token_id
                //     }, {
                //         $set: {
                //             type: item.type,
                //             userAddress: trackRecord.userAddress,
                //             transaction_date: item.transaction_date,
                //             contract_address: item.contract_address,
                //             token_id: item.token_id,
                //             img_url,
                //             isSold: false,
                //             nft: `https://opensea.io/assets/${item.contract_address}/${item.token_id}`
                //         }
                //     }
                //         , { upsert: true })
                //     continue;
                // }

                if (item.type === 'sale') {

                    if (item.seller_address.toLowerCase() === trackRecord.userAddress.toLowerCase()) {
                        const nft = await db.collection("tracking-user-nft-owned").findOne({
                            userAddress: trackRecord.userAddress,
                            contract_address: item.nft.contract_address,
                            token_id: item.nft.token_id,
                            isSold: false
                        })

                        if (nft) {
                            if (nft.type === 'sale') {
                                const profit = ((item.price_details.price * 0.875) - nft.price_details.price).toFixed(4);
                                const roi = profit / nft.price_details.price
                                listToNodify.push({
                                    userAddress: trackRecord.userAddress,
                                    type: 'sell',
                                    price_details: item.price_details,
                                    transaction_date: item.transaction_date,
                                    buy_price_details: nft.price_details,
                                    profit,
                                    roi,
                                    nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                                })

                                await db.collection("tracking-user-nft-owned").updateOne({
                                    userAddress: trackRecord.userAddress,
                                    contract_address: item.nft.contract_address,
                                    token_id: item.nft.token_id
                                }, { $set: { isSold: true, isWin: profit > 0 ? true : false, roi } }
                                )
                            }

                            if (nft.type === 'mint') {
                                await db.collection("tracking-user-nft-owned").updateOne({
                                    userAddress: trackRecord.userAddress,
                                    contract_address: item.nft.contract_address,
                                    token_id: item.nft.token_id
                                }, { $set: { isSold: true } })
                            }

                            // if (nft.type === 'transfer') {

                            //     const buyingPrice = await getBuyPriceByTransfer(trackRecord.userAddress, item.nft.contract_address, item.nft.token_id);

                            //     let profit;
                            //     let roi;

                            //     if (buyingPrice) {
                            //         console.log("check", buyingPrice.price)
                            //         profit = (item.price_details.price * 0.875 - buyingPrice.price).toFixed(4);
                            //         roi = profit / buyingPrice.price

                            //         console.log({
                            //             userAddress: trackRecord.userAddress,
                            //             contract_address: item.nft.contract_address,
                            //             token_id: item.nft.token_id,
                            //         })

                            //         await db.collection("tracking-user-nft-owned").updateOne({
                            //             userAddress: trackRecord.userAddress,
                            //             contract_address: item.nft.contract_address,
                            //             token_id: item.nft.token_id,
                            //         }, { $set: { isSold: true, isWin: profit > 0 ? true : false, roi } }
                            //         )
                            //     }
                            // }

                        }
                        else {
                            const buyingPrice = await getBuyPriceByTransfer(trackRecord.userAddress, item.nft.contract_address, item.nft.token_id);

                            let profit;
                            let roi;

                            if (buyingPrice) {
                                profit = (item.price_details.price * 0.875 - buyingPrice.price).toFixed(4);
                                roi = profit / buyingPrice.price

                                console.log({
                                    userAddress: trackRecord.userAddress,
                                    contract_address: item.nft.contract_address,
                                    token_id: item.nft.token_id,
                                })

                                await db.collection("tracking-user-nft-owned").updateOne({
                                    userAddress: trackRecord.userAddress,
                                    contract_address: item.nft.contract_address,
                                    token_id: item.nft.token_id,
                                }, { $set: { isSold: true, isWin: profit > 0 ? true : false, roi, isTransfer: true, nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}` } }
                                    , { upsert: true })
                            }
                            listToNodify.push({
                                userAddress: trackRecord.userAddress,
                                type: 'sell',
                                price_details: item.price_details,
                                transaction_date: item.transaction_date,
                                buy_price_details: buyingPrice,
                                profit,
                                roi,
                                nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                            })

                        }
                    }
                    else {
                        // const contractDetail = await getContractDetail(item.nft);
                        const img_url = '';
                        listToNodify.push({
                            userAddress: trackRecord.userAddress,
                            type: 'buy',
                            transaction_date: item.transaction_date,
                            price_details: item.price_details,
                            img_url,
                            nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                        })

                        await db.collection("tracking-user-nft-owned").updateOne({
                            userAddress: trackRecord.userAddress,
                            contract_address: item.nft.contract_address,
                            token_id: item.nft.token_id,

                        }, {
                            $set: {
                                type: item.type,
                                userAddress: trackRecord.userAddress,
                                buyFrom: item.seller_address,
                                price_details: item.price_details,
                                transaction_date: item.transaction_date,
                                marketplace: item.marketplace,
                                contract_address: item.nft.contract_address,
                                token_id: item.nft.token_id,
                                contract_type: item.nft.contract_type,
                                img_url,
                                block_number: item.block_number,
                                isSold: false,
                                nft: `https://opensea.io/assets/${item.nft.contract_address}/${item.nft.token_id}`
                            }
                        }, { upsert: true })
                    }
                }
                else {
                    listToNodify.push({
                        userAddress: trackRecord.userAddress,
                        type: item.type,
                        price_details: item.price_details,
                        transaction_date: item.transaction_date,
                        nft: `https://opensea.io/assets/${item.type === 'mint' ? item.contract_address : item.nft.contract_address}/${item.type === 'mint' ? item.token_id : item.nft.token_id}`
                    })
                }
            }

        }

        await db.collection("nft-tracking-list").updateOne(
            { userAddress: trackRecord.userAddress },
            { $set: { lastTranHash: lastTranHash } }
        )
        return continuation


    } catch (err) {
        console.log(err)
    }

}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

getContractDetail = async (nft) => {
    try {

        const res = await axios.get(`https://api.nftport.xyz/v0/nfts/${nft.contract_address}/${nft.token_id}?chain=ethereum`, {
            headers: {
                "Authorization": process.env.NFTPORT_KEY,
            }
        })
        await sleep(300)
        return res.data
    }
    catch (err) {
        console.log(err.message, 123)
    }
}


getBuyPriceByTransfer = async (userAddress, contract_address, token_id) => {
    try {
        const res = await axios.get(`https://api.nftport.xyz/v0/transactions/nfts/${contract_address}/${token_id}?chain=ethereum&type=sale&page_size=5&type=transfer`, {
            headers: {
                "Authorization": process.env.NFTPORT_KEY,
            }
        })

        const grouped = _.chain(res.data.transactions)
            .groupBy("transaction_hash")
            .map((value, key) => ({ transfer_to: _.last(value).transfer_to, data: _.first(value).price_details, length: value.length }))
            .value()
        await sleep(300)
        const result = _.find(grouped, { transfer_to: userAddress })
        if (result.data) {
            console.log(grouped, '****')
        }
        return result.data
    }
    catch (err) {
        return undefined
        console.log(err.message, 123)
    }
}

module.exports = { track, getContractDetail }