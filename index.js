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
    obErori: null,
    obGalerie: null,
    folderScss: path.join(__dirname, 'resurse', 'scss'),
    folderCss:  path.join(__dirname, 'resurse', 'css')
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

        console.log('initErori: erorile au fost inițializate cu succes.');
    } catch (err) {
        console.error('initErori: eroare la citirea numErori.json -', err.message);
    }
}

function initGalerie() {
    const caleJson = path.join(__dirname, 'resurse', 'imagini', 'galerie', 'galerie.json');
    try {
        const continut = fs.readFileSync(caleJson, 'utf8');
        obGlobal.obGalerie = JSON.parse(continut);
        console.log('initGalerie: galeria a fost inițializată cu succes (' + obGlobal.obGalerie.imagini.length + ' imagini).');
    } catch (err) {
        console.error('initGalerie: eroare la citirea galerie.json -', err.message);
    }
}

function getSfertOra() {
    const minute = new Date().getMinutes();
    if (minute < 15) return 1;
    if (minute < 30) return 2;
    if (minute < 45) return 3;
    return 4;
}

function getImaginiGalerie(sfertOverride) {
    if (!obGlobal.obGalerie) {
        return { imagini: [], caleGalerie: '' };
    }

    const sfertParsed = parseInt(sfertOverride);
    const sfert = (sfertParsed >= 1 && sfertParsed <= 4) ? sfertParsed : getSfertOra();
    const caleGalerie = obGlobal.obGalerie.cale_galerie;
    const caleFolderFizic = path.join(__dirname, 'resurse', 'imagini', 'galerie');

    let imaginiFiltrate = obGlobal.obGalerie.imagini.filter(
        img => parseInt(img.sfert_ora) === sfert
    );

    imaginiFiltrate = imaginiFiltrate.slice(0, 10);

    const numeImagineLipsa = [];

    imaginiFiltrate = imaginiFiltrate.filter(img => {
        const caleFizica = path.join(caleFolderFizic, img.cale_imagine);
        if (!fs.existsSync(caleFizica)) {
            numeImagineLipsa.push(img.cale_imagine);
            return false;
        }
        const numeOriginal = img.cale_imagine;
        const numeMic = numeOriginal.replace(/(\.[^.]+)$/, '-mic$1');
        const caleMic = path.join(caleFolderFizic, numeMic);
        if (!fs.existsSync(caleMic)) {
            try {
                const sharp = require('sharp');
                sharp(caleFizica)
                    .resize({ width: 400, withoutEnlargement: true })
                    .toFile(caleMic)
                    .then(() => console.log('Generata versiune mica: ' + numeMic))
                    .catch(e => console.warn('sharp error:', e.message));
            } catch (e) {
                try { fs.copyFileSync(caleFizica, caleMic); } catch (_) {}
            }
        }
        return true;
    });

    if (numeImagineLipsa.length > 0) {
        console.warn('getImaginiGalerie: imagini lipsa -', numeImagineLipsa.join(', '));
        if (!obGlobal.obGalerie.numeImagineLipsa) obGlobal.obGalerie.numeImagineLipsa = [];
        numeImagineLipsa.forEach(n => {
            if (!obGlobal.obGalerie.numeImagineLipsa.includes(n))
                obGlobal.obGalerie.numeImagineLipsa.push(n);
        });
    }

    return { imagini: imaginiFiltrate, caleGalerie };
}

initErori();
initGalerie();

function compileazaScss(caleScss, caleCss) {
    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }
    if (!caleCss) {
        const numeBase = path.basename(caleScss, path.extname(caleScss));
        caleCss = path.join(obGlobal.folderCss, numeBase + '.css');
    } else if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }

    if (fs.existsSync(caleCss)) {
        const numeFisierCss = path.basename(caleCss);
        const caleFolderBackup = path.join(__dirname, 'backup', 'resurse', 'css');
        try {
            if (!fs.existsSync(caleFolderBackup)) {
                fs.mkdirSync(caleFolderBackup, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const numeBackup = numeFisierCss.replace('.css', `_${timestamp}.css`);
            fs.copyFileSync(caleCss, path.join(caleFolderBackup, numeBackup));
            console.log(`💾 Backup creat: backup/resurse/css/${numeBackup}`);
        } catch (errBackup) {
            console.error('compileazaScss: eroare la salvarea backup-ului -', errBackup.message);
        }
    }

    try {
        const sass = require('sass');
        const rezultat = sass.compile(caleScss, {
            style: 'expanded',
            silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function']
        });
        fs.writeFileSync(caleCss, rezultat.css, 'utf8');
        console.log(`✅ SCSS compilat: ${path.basename(caleScss)} → ${path.basename(caleCss)}`);
    } catch (errCompilare) {
        console.error(`❌ compileazaScss: eroare la compilarea ${path.basename(caleScss)} -`, errCompilare.message);
    }
}

function compileazaToateScss() {
    if (!fs.existsSync(obGlobal.folderScss)) {
        fs.mkdirSync(obGlobal.folderScss, { recursive: true });
        console.log('📁 Folder scss creat:', obGlobal.folderScss);
        return;
    }
    const fisiere = fs.readdirSync(obGlobal.folderScss);
    fisiere.forEach(fisier => {
        if (path.extname(fisier).toLowerCase() === '.scss') {
            compileazaScss(fisier);
        }
    });
}

function watchScss() {
    if (!fs.existsSync(obGlobal.folderScss)) return;
    fs.watch(obGlobal.folderScss, (eventType, filename) => {
        if (filename && path.extname(filename).toLowerCase() === '.scss') {
            console.log(`\n👁️ Modificat: ${filename} (${eventType}) → compilare automata...`);
            setTimeout(() => compileazaScss(filename), 100);
        }
    });
    console.log(`👁️  Urmarire folder scss activa: ${obGlobal.folderScss}`);
}

compileazaToateScss();
watchScss();

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
    const { imagini, caleGalerie } = getImaginiGalerie(req.query.sfert);
    res.render('pagini/index', { imaginiGalerie: imagini, caleGalerie });
});

app.get('/galerie-statica', (req, res) => {
    const { imagini, caleGalerie } = getImaginiGalerie(req.query.sfert);
    res.render('pagini/galerie-statica', { imaginiGalerie: imagini, caleGalerie });
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
