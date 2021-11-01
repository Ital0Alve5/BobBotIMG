const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const Extractor = require("./extractData")

const getXLSXFilesInThisDir = () => {
    const filterOnlyTheFiles = fs.readdirSync(__dirname).filter(file => {
        if (fs.statSync(file).isFile()) return file
    })
    const isXLSX = filterOnlyTheFiles.filter(file => {
        if (path.extname(file) === '.xlsx') return file
    })
    return isXLSX
}

const getTitlesInTheFile = (file) => {
    const extractor = new Extractor('/' + file)
    const titleExists = extractor.extractTitlesOfSpreadsheet
    return titleExists
}

const xlsxChoises = () => {
    const xlsxFIles = getXLSXFilesInThisDir()
    if (xlsxFIles.length > 0) {
        const constructObjectChoices = xlsxFIles.map(xlsxFIle => {
            return {
                title: xlsxFIle,
                value: xlsxFIle
            }
        })
        return constructObjectChoices
    }
    return false
}

const titleChoises = (file) => {
    const titles = getTitlesInTheFile(file)
    const constructObjectChoices = titles.map(title => {
        return {
            title: title,
            value: title
        }
    })
    return constructObjectChoices
}

module.exports = async () => {
    const xlsxChosen = await prompts({
        type: 'select',
        name: 'xlsxFile',
        message: xlsxChoises() ? 'Escolha o arquivo xlsx.' : 'Não existe arquivo xlsx neste diretório. Exiba um xlsx e tente novamente.',
        choices: xlsxChoises() ? xlsxChoises() : [{
            title: "OK",
            value: "OK"
        }],
    })
    if (xlsxChosen.xlsxFile !== 'OK') {
        const titleChosen = await prompts({
            type: 'select',
            name: 'title',
            message: 'Escolha o título da coluna onde estão os códigos de produto.',
            choices: titleChoises(xlsxChosen.xlsxFile),
        })
        return [xlsxChosen, titleChosen]
    }
    return [xlsxChosen]
}