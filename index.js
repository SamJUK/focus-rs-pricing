const puppeteer = require('puppeteer');
const fs = require ('fs');

const create_puppeteer = async config => {
    return (await puppeteer.launch(config));
};

const scrape_page = async page => {
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
    var years = global.params.years;
    // var years = ['2016','2017','2018'];
    for (let index = 0; index < years.length; index++) {
        var year = years[index];
        dd[year] = (await scrape_term(year));
    }

    return dd;
};

const scrape_term = async year => {
    let data = [];
    // var baseUrl = 'https://www.autotrader.co.uk/car-search?sort=sponsored&radius=1500&postcode=cf54js&onesearchad=Used&onesearchad=Nearly%20New&onesearchad=New&make=FORD&model=FOCUS&aggregatedTrim=RS&exclude-writeoff-categories=on';
    let baseUrl = 'https://www.autotrader.co.uk/car-search';
    let url_params_string = '';
    let url_params = {...global.params};
    delete(url_params.years);
    for (let prm in url_params) {
        let fp = url_params[prm];
        if (fp instanceof Array) {
            let mid = fp.join(`&${prm}=`);
            url_params_string += `${prm}=${mid}&`;
        } else {
            if (fp === '') { continue; }
            url_params_string += `${prm}=${fp}&`;
        }
    }
    if(url_params_string[url_params_string.length-1]==='&') {
        url_params_string = url_params_string.substr(0, url_params_string.length-1);
    }
    let url = `${baseUrl}?${url_params_string}&year-from=${year}&year-to=${year}`;

    let morePages = true;

    await global.page.goto(url, {'waitUntil': 'networkidle0'});
    while (morePages) {
        let page_Data = await scrape_page();
        data.push(...page_Data);

        try {
            await global.page.click('.pagination--right__active');
            await global.page.waitForFunction (
                () => (document.querySelector('.search-results__overlay') !== null && document.querySelector('.search-results__overlay').style.display !== 'block'),
                {polling: 'mutation',timeout: 120000}
                );
        } catch (e) {
            morePages = false;
        }   
    }

    return data;
};

const save_data = async data => {
    let jsonFile = 'output.json';
    if(process.env.hasOwnProperty('output')) {
        jsonFile = process.env.hasOwnProperty('output');
    } else {
        let vehicle = [global.params.make,global.params.model,global.params.aggregatedTrim].join('_');
        let fuel_type = process.env.hasOwnProperty('fuel_type') ? `${process.env['fuel_type']}_` : '';
        let misc = [global.params.postcode,global.params.years.join('_')].join('_');
        jsonFile = `${vehicle}_${fuel_type}${misc}.json`;
    }

    let json = {};
    if (fs.existsSync(jsonFile)) {
        json = JSON.parse(fs.readFileSync(jsonFile));
    }

    var d = new Date();
    var ds = `${String(d.getDate()).padStart(2,'0')}-${String((d.getMonth()+1)).padStart(2, '0')}-${d.getFullYear()}`;
    json[ds] = data;

    fs.writeFileSync(jsonFile, JSON.stringify(json));
    return {json:json,data:data,ds:ds};
};

const print_overview = async obj => {
    let fuel_type = process.env.hasOwnProperty('fuel_type') ? process.env['fuel_type'] : '';
    console.log(`------------------`);
    console.log(`Date: ${obj.ds} | Postcode: ${process.env.postcode}`);
    console.log(`Vehicle: ${process.env.make} ${process.env.model} ${process.env.aggregatedTrim} ${fuel_type}`);

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

// SETUP VARIABLES
let params = {
    'sort': 'sponsored',
    'radius': 1500,
    'onesearchad': ['Used','Nearly%20New','New'],
    'postcode': null,
    'make': null,
    'model': null,
    'aggregatedTrim': '',
    'minimum-mileage': '',
    'maximum-mileage': '',
    'years':[],
    'exclude-writeoff-categories': 'on',
    'fuel-type': ['Diesel','Petrol']
};

for (let variable in process.env) {
    let paramvariable = variable.replace(/_/gim, '-');
    if (params.hasOwnProperty(paramvariable)) {
        const fvar = process.env[variable].indexOf(',') !== -1
            ? process.env[variable].split(',')
            : process.env[variable];

        params[paramvariable] = fvar;
    }
}

// Make sure everything is set
for (let param in params) {
    const p = params[param];
    if (p === null) {
        console.log('Bad Params');
        process.exit(1);
    }
}

global.params = params;


create_puppeteer({headless: true})
    .then(create_enviroment)
    .then(scrape_pages)
    .then(save_data)
    .then(print_overview)
    .then(end)
    .catch(err => {
        console.log(`Error: ${err}`);
        global.browser.close();
        process.exit();
    });

    