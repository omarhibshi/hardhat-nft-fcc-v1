const pinataSDK = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")
require("dotenv").config()

const pinataAPIKey = process.env.PINATA_API_KEY
const pinataAPISecret = process.env.PINATA_API_SECRET
const pinata = new pinataSDK(pinataAPIKey, pinataAPISecret)

const storeImages = async (imagesFilePath) => {
    const fullImagesPath = path.resolve(imagesFilePath)
    const files = fs.readdirSync(fullImagesPath)
    console.log(files)
    let responses = []
    console.log("Uploading images to Pinata...")
    for (const file of files) {
        console.log(`Uploading ${file} to Pinata...`)
        const filePath = path.join(fullImagesPath, file)
        const readableStreamForFile = fs.createReadStream(filePath)
        const options = {
            pinataMetadata: {
                name: file,
            },
        }
        try {
            //response is an array of hashes for the files that were just pinned
            const response = await pinata.pinFileToIPFS(
                readableStreamForFile,
                options
            )
            responses.push(response)
        } catch (err) {
            console.log(err)
        }
    }
    return { responses, files }
}

async function storeTokenMetadata(metadata) {
    try {
        const response = await pinata.pinJSONToIPFS(metadata)
        return response
    } catch (err) {
        console.log(err)
    }
}

module.exports = { storeImages, storeTokenMetadata }
