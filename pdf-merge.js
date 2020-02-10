const merge = require('easy-pdf-merge');
const fs = require('fs');

let input_files = new Array(300);
fs.readdirSync('./output').forEach(file => {
    if (file.endsWith('.pdf')) {
        let split_loc = file.indexOf('__');
        let page = parseInt(file.substring(0, split_loc));
        input_files[page - 1] = './output/' + file;
    }
});

console.log(input_files);

merge(input_files, 'output.pdf', function(err){
    if(err) {
        return console.log(err)
    }
    console.log('Successfully merged!')
});