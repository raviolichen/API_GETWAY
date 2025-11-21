const mammoth = require("mammoth");
const fs = require("fs");

mammoth.extractRawText({path: "API_Gateway功能需求文件.docx"})
    .then(function(result){
        var text = result.value; // The raw text
        var messages = result.messages;
        console.log(text);
    })
    .catch(function(error) {
        console.error(error);
    });
