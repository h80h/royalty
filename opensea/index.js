const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");

const fetchOpensea = async (tokenid) => {
    const url = `https://api.opensea.io/api/v2/chain/base/contract/0xEe7D1B184be8185Adc7052635329152a4d0cdEfA/nfts/${tokenid}`;

    const options = {
        method: 'GET',
        headers: {accept: 'application/json', 'x-api-key': process.env.OPENSEA_API_KEY}
    };

    try {
        const openseaStream = await fetch(url, options);
        const openseaJson = await openseaStream.json();
        return openseaJson;
    } catch (err) {
        return {Error: err.stack};
    }
}

router.get("/", (req, res) => {
    res.json({success: "Hello Opensea!"});
});

router.get("/:tokenid", async (req, res) => {
    const tokenid = req.params.tokenid;
    const data = await fetchOpensea(tokenid);
    res.json(data);
});

router.post("/", async(req, res) => {
    const tokenid = req.body.tokenid;
    const data = await fetchOpensea(tokenid);
    res.json(data);
})

module.exports = router;