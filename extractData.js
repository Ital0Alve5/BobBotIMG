var xlsx = require('node-xlsx');

module.exports = class Extractor {

    constructor(file, title) {
        this.getContentFromSpreadsheet = xlsx.parse(__dirname + file)
        this.extractTitlesOfSpreadsheet = this.getContentFromSpreadsheet[0].data.shift()
        this.getDataContentFromSpreadsheet = this.getContentFromSpreadsheet[0].data
        this.title = title
    }

    getIndexOfPartNumberTitle = (searchForThisTitle) => {
        const titleIndexOfPartNumberData = this.extractTitlesOfSpreadsheet.findIndex(title => {
            return title === searchForThisTitle
        })
        return titleIndexOfPartNumberData
    }
    extractPartNumbers = () => {
        let partNumbers = []
        for (let i = 0; i < this.getDataContentFromSpreadsheet.length; i++) {
            partNumbers.push(this.getDataContentFromSpreadsheet[i][this.getIndexOfPartNumberTitle(this.title)])
        }
        const partNumbersNotRepeated = this.removeDuplicates(partNumbers)
        const noUndefined = this.removeUndefined(partNumbersNotRepeated)
        return noUndefined
    }

    removeDuplicates = (partNumbers) => {
        return [...new Set(partNumbers)]
    }

    removeUndefined = (partNumbers) => {
        const noUndefined = partNumbers.filter(element => {
            return element !== undefined;
        })
        return noUndefined
    }

    buildObject = (arrayOfPartNumbers) => {
        let arrayOfObjects = []
        for (const partNumber of arrayOfPartNumbers) {
            arrayOfObjects.push({
                partNumber: partNumber.toString(),
                error: false,
                searchAgain: 0
            })
        }
        return arrayOfObjects
    }

    objectDataDone = () => {
        return this.buildObject(this.extractPartNumbers())
    }
}