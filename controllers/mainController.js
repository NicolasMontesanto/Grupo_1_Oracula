const path = require('path');
const homePath = path.join(__dirname, '../src/views/home.html');

const mainController = {
    //home.html
    home: (req, res) => {
        res.render('home');
    }
};
module.exports = mainController;
