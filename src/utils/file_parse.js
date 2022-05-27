import fs from 'fs'
let my_utils = {
    get_array_from_file: function (filename){
        let data = fs.readFileSync(filename);
        let array = data.toString().split("\n");
        array = array.filter(function (el) {
            return el != null && el != '';
        });
        for (let index = 0; index < array.length; index++) {
            const element = array[index].trim();
            array[index] = element;
        }
        return array;
    },
    format_proxy: function (line){
        let array = [];
        let splited=line.split("@");
        let splited2=splited[0].split(":");
        array=array.concat(splited2);
        array.push(splited[1]);
        return array
    },
    format_email: function (line){
        let a = line.split(":");
        a[3]=parseInt(a[3]);
        return a
    },
};

export default my_utils;


