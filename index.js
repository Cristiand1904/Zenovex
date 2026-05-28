const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

console.log('__dirname    :', __dirname);
console.log('__filename   :', __filename);
console.log('process.cwd():', process.cwd());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const static_resurse = path.join(__dirname, 'resurse');
app.use('/resurse', express.static(static_resurse));

var obGlobal = {
    obErori: null
};

function initErori() {
    const caleJson = path.join(__dirname, 'numErori.json');
    try {
        const continut = fs.readFileSync(caleJson, 'utf8');
        const dateErori = JSON.parse(continut);
        obGlobal.obErori = dateErori;

        if (obGlobal.obErori.info_erori) {
            obGlobal.obErori.info_erori.forEach(eroare => {
                eroare.imagine = obGlobal.obErori.cale_baza + eroare.imagine;
            });
        }

        if (obGlobal.obErori.eroare_default) {
            obGlobal.obErori.eroare_default.imagine =
                obGlobal.obErori.cale_baza + obGlobal.obErori.eroare_default.imagine;
        }

        console.log('✅ initErori: erorile au fost inițializate cu succes.');
    } catch (err) {
        console.error('❌ initErori: eroare la citirea numErori.json -', err.message);
    }
}

initErori();

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroareGasita = null;
    if (obGlobal.obErori && obGlobal.obErori.info_erori) {
        eroareGasita = obGlobal.obErori.info_erori.find(
            e => e.identificator === identificator
        );
    }

    const codStatus = (eroareGasita && eroareGasita.status === true)
        ? identificator
        : 200;

    let dateFinal;
    if (!identificator || !eroareGasita) {
        const def = (obGlobal.obErori && obGlobal.obErori.eroare_default) || {
            titlu: 'Eroare Necunoscută',
            text: 'A apărut o eroare neașteptată.',
            imagine: ''
        };
        dateFinal = {
            titlu: titlu || def.titlu,
            text: text || def.text,
            imagine: imagine || def.imagine
        };
    } else {
        dateFinal = {
            titlu: titlu || eroareGasita.titlu,
            text: text || eroareGasita.text,
            imagine: imagine || eroareGasita.imagine
        };
    }

    res.status(codStatus).render('pagini/eroare', {
        titlu: dateFinal.titlu,
        text: dateFinal.text,
        imagine: dateFinal.imagine,
        ip: res.locals.ip || ''
    });
}

app.use((req, res, next) => {
    // Normalizeaza IPv4-mapped IPv6 (ex: ::ffff:192.168.1.1 → 192.168.1.1)
    const raw = req.ip || '';
    res.locals.ip = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
    next();
});

app.get(/.*\.ejs$/, (req, res) => {
    afisareEroare(res, 400);
});
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse', 'ico', 'favicon.ico'));
});

app.get('/resurse', (req, res) => {
    afisareEroare(res, 403);
});

app.use('/resurse', (req, res, next) => {
    const urlPath = req.path;
    if (urlPath.endsWith('/') || !path.extname(urlPath)) {
        return afisareEroare(res, 403);
    }
    next();
});

app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index');
});
app.get('/*', (req, res) => {
    const pagina = req.params[0];

    res.render('pagini/' + pagina, {}, function (eroare, rezultatRandare) {
        if (eroare) {
            if (eroare.message && eroare.message.startsWith('Failed to lookup view')) {
                afisareEroare(res, 404);
            } else {
                console.error('Eroare la randare:', eroare);
                afisareEroare(res, null);
            }
        } else {
            res.send(rezultatRandare);
        }
    });
});

const vect_foldere = ['temp', 'logs', 'backup', 'fisiere_uploadate'];

vect_foldere.forEach(numeFoldr => {
    const caleFoldr = path.join(__dirname, numeFoldr);
    if (!fs.existsSync(caleFoldr)) {
        fs.mkdirSync(caleFoldr);
        console.log(`📁 Folder creat: ${numeFoldr}`);
    } else {
        console.log(`✅ Folder există deja: ${numeFoldr}`);
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Serverul Zenovex rulează la:`);
    console.log(`   → http://localhost:${PORT}`);
    console.log(`   → http://localhost:${PORT}/index`);
    console.log(`   → http://localhost:${PORT}/home`);
    console.log(`   → http://localhost:${PORT}/despre`);
});
