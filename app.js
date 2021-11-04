const pup = require('puppeteer');
const fs = require('fs');
const Extractor = require("./extractData.js");
const makeQuestions = require('./makeQuestions');
class Bob {

    constructor(parts) {
        this.searchButtonOpenSearchBar = "body > div.page-wrapper > header > div > div.header.content > div.header-right-block > div.search-container > span"
        this.searchBar = "#search"
        this.searchButtonSubmit = "#search_mini_form > div.actions > button"
        this.parts = parts
    }

    start = async () => {
        Bob.handleOutputs({
            message: "The process has started.",
            type: "success"
        })
        Bob.handleOutputs({
            message: "Be sure if your internet connection is estable.",
            type: "warning"
        })
        const browser = await pup.launch({
            headless: true
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(0);
        await page.setViewport({
            width: 0,
            height: 0
        });
        this.loopSearchPartNumber(page, this.parts, browser)
    }

    loopSearchPartNumber = async (page, parts, browser) => {
        const partsUpdated = []
        for (const part of parts) {
            const searchStatus = await this.searchPartNumber(page, part)
            partsUpdated.push(searchStatus)
        }
        this.showPartsWithError(partsUpdated)
        await browser.close();
    }

    searchPartNumber = async (page, part) => {
        try {
            await page.goto("https://www.bobcatparts.com/")
            Bob.handleOutputs({
                message: `Searching for ${part.partNumber}...`,
                type: "search"
            })
            await page.waitForSelector(this.searchButtonOpenSearchBar)
            await page.click(this.searchButtonOpenSearchBar)
            await page.type(this.searchBar, part.partNumber)
            await page.click(this.searchButtonSubmit)
            await page.waitForNavigation()
        } catch (e) {
            console.log(e, "searchPartNumber")
        }
        await new Promise(res => {
            setTimeout(() => {
                res()
            }, 1500)
        })
        const checksResult = await this.handleChecks(page, part)
        return checksResult
    }

    handleChecks = async (page, part) => {
        const errorExists = await this.checkForVisualErrors(page)
        if (errorExists) {
            const partWithVisualError = await this.handleVisualError(errorExists, part)
            return partWithVisualError
        }
        const didGetURL = await this.getImageURL(page)
        if (!didGetURL) {
            const partWithURLError = await this.handleURLError(page, part)
            return partWithURLError
        }
        const wasImageParsed = await this.parseImageContentToImage(page, part.partNumber, didGetURL)
        if (wasImageParsed) {
            return part
        }
    }

    getImageURL = async (page) => {
        return await page.evaluate(() => {
            let elementsWithURL = Array.from(document.querySelectorAll(".fotorama__img"))
            if (elementsWithURL.length > 1) {
                const listOfURL = elementsWithURL.slice(0, Math.trunc(elementsWithURL.length / 2)).map(img => {
                    return img.currentSrc.replaceAll("'", '')
                })
                return listOfURL
            } else if (elementsWithURL.length === 1) {
                const oneSingleURL = elementsWithURL[0].src.replaceAll("'", '')
                return oneSingleURL
            } else {
                return false
            }
        })
    }

    getImageContent = async (page, url, assert) => {
        try {
            const {
                content,
                base64Encoded
            } = await page._client.send(
                'Page.getResourceContent', {
                    frameId: String(page.mainFrame()._id),
                    url
                },
            );
            assert.equal(base64Encoded, true);
            return content;
        } catch (e) {
            console.log(e)
            console.log("getImageContent")
        }
    }

    parseImageContentToImage = async (page, partNumber, url) => {
        return new Promise(async res => {
            const assert = require('assert')
            if (Array.isArray(url)) {
                url.forEach(async (url, index) => {
                    const content = await this.getImageContent(page, url, assert);
                    const contentBuffer = Buffer.from(content, 'base64');
                    this.saveImage(partNumber, index + 1, contentBuffer)
                    res(true)
                })
            } else {
                const content = await this.getImageContent(page, url, assert);
                const contentBuffer = Buffer.from(content, 'base64');
                this.saveImage(partNumber, null, contentBuffer)
                res(true)
            }
        })
    }

    saveImage = (partNumber, imageNumber, contentBuffer) => {
        const imageName = `${partNumber}${imageNumber !== null ? '-'+imageNumber : ''}.jpg`
        try {
            fs.writeFileSync(imageName, contentBuffer, 'base64')
            const moveTo = `./images/${imageName}`
            fs.rename(imageName, moveTo, err => {
                if (err) console.log(err)
            });
        } catch (e) {
            console.log(e)
        }
        let cardeal;
        if (imageNumber == 1) {
            cardeal = "st"
        } else if (imageNumber == 2) {
            cardeal = "nd"
        } else {
            cardeal = "th"
        }
        Bob.handleOutputs({
            message: `The ${
            imageNumber == null ? "unique" : imageNumber+cardeal
        } image of ${partNumber} ${imageNumber == null || imageNumber == 1 ? "was" : "were"} saved successfuly as ${imageName}!`,
            type: "success"
        })
    }

    static handleOutputs = (output) => {
        switch (output.type) {
            case "search":
                console.log("                         ")
                console.log("\x1b[37m", output.message)
                break
            case "warning":
                console.log("                         ")
                console.log("\x1b[33m", output.message)
                break
            case "emphasis":
                console.log("\x1b[35m", output.message)
                break
            case "error":
                console.log("                         ")
                console.log("\x1b[31m", output.message)
                break
            case "success":
                console.log("                         ")
                console.log("\x1b[32m", output.message)
                break
        }
    }

    showPartsWithError = (partsUpdated) => {
        const partsWithError = partsUpdated.filter(part => {
            return part.error === true
        })
        const error = partsWithError.length
        Bob.handleOutputs({
            message: `Some partNumber${error > 1 ? 's' : ''} didn't match any:`,
            type: "warning"
        })
        partsWithError.forEach(partWithError => {
            Bob.handleOutputs({
                message: partWithError.partNumber,
                type: "error"
            })
        })
        Bob.handleOutputs({
            message: `Check if ${error > 1 ? 'those' : 'that'} partNumber${error > 1? 's' : ''} ${error > 1 ? 'are' : 'is'} right.`,
            type: "warning"
        })
    }

    handleURLError = async (page, part) => {
        if (part.searchAgain > 5) {
            return part
        }
        part.searchAgain++
        await this.searchPartNumber(page, part)
    }

    checkForVisualErrors = async (page) => {
        return await page.evaluate(() => {
            const messagePopUp = document.querySelector("#maincontent > div.columns > div.column.main > div.message.notice > div")
            let message = messagePopUp ? messagePopUp.innerText : undefined
            return message
        })
    }

    handleVisualError = async (error, part) => {
        const putPartNumberInErrorMessage = error.replace("Your search", part.partNumber)
        Bob.handleOutputs({
            message: putPartNumberInErrorMessage,
            type: "error"
        })
        part.error = true
        return part
    }

}

(async () => {
    const answers = await makeQuestions()
    const fileAnswer = answers[0].xlsxFile
    if (answers[0].xlsxFile !== "OK") {
        const titleAnswer = answers[1].title
        const extractor = new Extractor(`/${fileAnswer}`, titleAnswer)
        const dataObject = extractor.objectDataDone()
        const bob = new Bob(dataObject)
        bob.start()
    }
})()