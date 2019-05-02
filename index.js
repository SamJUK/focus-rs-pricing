const puppeteer = require('puppeteer');
const fs = require ('fs');

const create_puppeteer = async config => {
    return (await puppeteer.launch(config));
};

const scrape_page = async page => {
    await global.page.goto(page, {'waitUntil': 'networkidle0'});        
    return await global.page.evaluate(() => Array.from (document.querySelectorAll('.search-listing'))
        .map(e => Object({
            'title': e.querySelector('.listing-title').textContent.trim(),
            'price': e.querySelector('.vehicle-price').textContent.trim(),
            'specs': Array.from(e.querySelectorAll('.listing-key-specs li')).map(e => e.textContent),
            'link': e.querySelector('.listing-title a').href,
        }))
    );
};

const scrape_pages = async data => {
    let dd = {};
    var years = ['2016','2017','2018'];
    var baseUrl = 'https://www.autotrader.co.uk/car-search?sort=sponsored&radius=1500&postcode=cf54js&onesearchad=Used&onesearchad=Nearly%20New&onesearchad=New&make=FORD&model=FOCUS&aggregatedTrim=RS&exclude-writeoff-categories=on';
    for (let index = 0; index < years.length; index++) {
        var year = years[index];
        var url = `${baseUrl}&year-from=${year}&year-to=${year}`;
        dd[year] = await scrape_page(url);
    }

    return dd;
};


const save_data = async data => {
    let jsonFile = 'output.json';
    let json = {};
    if (fs.existsSync(jsonFile)) {
        json = JSON.parse(fs.readFileSync(jsonFile));
    }

    var d = new Date();
    var ds = `${String(d.getDate()).padStart(2,'0')}-${String((d.getMonth()+1)).padStart(2, '0')}-${d.getFullYear()}`;
    json[ds] = data;

    fs.writeFileSync(jsonFile, JSON.stringify(json));
    return {json:json,data:data,ds:ds};
}

const print_overview = async obj => {
    console.log(`------------------`);
    console.log(`Date: ${obj.ds}`);
    
    let data = obj.data;
    let years = Object.keys(data);
    for (let i = 0; i < years.length; i++) {
        let prices = Object.values(data[years[i]]).map(e=>Number(e.price.substr(1).replace(',','')));
        let total = prices.length;
        let avg = ((prices.reduce((previous, current) => current += previous)) / prices.length).toFixed(2);
        let low = Math.min(...prices).toFixed(2);
        let high = Math.max(...prices).toFixed(2);
        console.log(`${years[i]} - Total: ${total} - Average: ${avg} - Lowest: ${low} - Highest: ${high}`);
    }
};

const end  = async () => {
    global.browser.close();
    process.exit();
}

const create_enviroment = async browser => {
    global.browser = browser;
    global.page = await global.browser.newPage();
};

create_puppeteer({headless: true})
    .then(create_enviroment)
    .then(scrape_pages)
    .then(save_data)
    .then(print_overview)
    .then(end)
    .catch(err => {
        console.log(`Error: ${err}`);
    });

    