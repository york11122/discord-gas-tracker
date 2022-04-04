class LineMessage {
    constructor(dataList) {
        this.dataList = dataList
        this.message = {
            type: "carousel",
            contents: {}
        }
    }
    getMessage (titleString) {
        let contents = []
        this.dataList.forEach(item => contents.push(
            {
                "type": "bubble",
                "size": "mega",
                "body": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": titleString,
                            "weight": "bold",
                            "color": "#111111",
                            "size": "sm",
                            "align": "start",
                            "style": "normal"
                        },
                        {
                            "type": "separator",
                            "margin": "sm"
                        },
                        // {
                        //     "type": "box",
                        //     "layout": "horizontal",
                        //     "margin": "md",
                        //     "contents": [
                        //         {
                        //             "type": "text",
                        //             "text": "Price",
                        //             "size": "sm",
                        //             "color": "#aaaaaa",
                        //             "flex": 0
                        //         },
                        //         {
                        //             "type": "text",
                        //             "text": item.price,
                        //             "color": "#111111",
                        //             "size": "sm",
                        //             "align": "end"
                        //         }
                        //     ]
                        // },
                        {
                            "type": "box",
                            "layout": "vertical",
                            "margin": "md",
                            "spacing": "sm",
                            "contents": [
                                {
                                    "type": "box",
                                    "layout": "horizontal",
                                    "contents": [
                                        {
                                            "type": "text",
                                            "text": "Profit",
                                            "size": "sm",
                                            "color": "#aaaaaa",
                                            "flex": 0
                                        },
                                        {
                                            "type": "text",
                                            "size": "sm",
                                            "color": "#111111",
                                            "align": "end",
                                            "text": item.profit || "NA",
                                        }
                                    ],
                                    "margin": "none",
                                    "spacing": "none",
                                    "offsetEnd": "none"
                                },
                                {
                                    "type": "box",
                                    "layout": "horizontal",
                                    "contents": [
                                        {
                                            "type": "text",
                                            "text": "Buying Price",
                                            "size": "sm",
                                            "color": "#aaaaaa",
                                            "flex": 0
                                        },
                                        {
                                            "type": "text",
                                            "text": item.buying_price || "NA",
                                            "size": "sm",
                                            "color": "#111111",
                                            "align": "end"
                                        }
                                    ]
                                },
                                {
                                    "type": "box",
                                    "layout": "horizontal",
                                    "contents": [
                                        {
                                            "type": "text",
                                            "text": "Selling Price",
                                            "size": "sm",
                                            "color": "#aaaaaa",
                                            "flex": 0
                                        },
                                        {
                                            "type": "text",
                                            "text": item.selling_price || "NA",
                                            "size": "sm",
                                            "color": "#111111",
                                            "align": "end"
                                        }
                                    ]
                                },

                                {
                                    "type": "box",
                                    "layout": "horizontal",
                                    "contents": [
                                        {
                                            "type": "text",
                                            "text": "Buying Date",
                                            "size": "sm",
                                            "color": "#aaaaaa",
                                            "flex": 0
                                        },
                                        {
                                            "type": "text",
                                            "text": item.buying_date || "NA",
                                            "size": "sm",
                                            "color": "#111111",
                                            "align": "end"
                                        }
                                    ]
                                },

                            ]
                        }
                    ]
                },
                "footer": {
                    "type": "box",
                    "layout": "horizontal",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "button",
                            "style": "primary",
                            "color": "#905c44",
                            "action": {
                                "type": "uri",
                                "label": "OpenSea link",
                                "uri": item.nft || "https://google.com"
                            },
                            "height": "sm"
                        },
                    ]
                }
            }
        ))
        this.message.contents = contents
        return this.message
    }
}
module.exports = LineMessage