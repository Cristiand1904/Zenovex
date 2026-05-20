const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 8080;

// 3. Afișare căi
console.log("Director proiect:", __dirname);
console.log("Cale fișier:", __filename);
console.log("Director lucru:", process.cwd());
console.log("Sunt __dirname și process.cwd() același lucru? ", __dirname === process.cwd());

// 13. Variabilă globală pentru erori
let obGlobal = { obErori: null };

function initErori() {
    const caleJSON = path.join(__dirname, 'erori.json');
    if (fs.existsSync(caleJSON)) {
        const data = fs.readFileSync(caleJSON, 'utf8');
        obGlobal.obErori = JSON.parse(data);
        obGlobal.obErori.info_erori.forEach(eroare => {
            eroare.imagine = path.join('/', obGlobal.obErori.cale_baza, eroare.imagine);
        });
        obGlobal.obErori.eroare_default.imagine = path.join(
            '/', obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine
        );
    }
}
initErori();

// 20. Creare foldere automate
const vect_foldere = ["temp", "logs", "backup", "fisiere_uploatate"];
vect_foldere.forEach(f => {
    let cale = path.join(__dirname, f);
    if (!fs.existsSync(cale)) fs.mkdirSync(cale);
});

// 4. Setare motor EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 14. Funcție afișare eroare
function afisareEroare(res, identificator, titluParam, textParam, imagineParam) {
    let eroare = obGlobal.obErori
        ? obGlobal.obErori.info_erori.find(e => e.identificator == identificator)
        : null;

    if (!eroare) {
        eroare = obGlobal.obErori ? obGlobal.obErori.eroare_default : {
            titlu: "Eroare", text: "A apărut o problemă.", imagine: ""
        };
    }

    const status = Number.isInteger(identificator) ? identificator : 500;

    res.status(status).render('pagini/eroare', {
        ip: res.req ? res.req.ip : '',
        titlu: titluParam || eroare.titlu,
        text:  textParam  || eroare.text,
        imagine: imagineParam || eroare.imagine
    });
}

// 6. Folder static pentru resurse
app.use('/resurse', express.static(path.join(__dirname, 'resurse')));

// 17. La cerere către /resurse/* fără fișier găsit → 403 Forbidden
app.use('/resurse', (req, res) => {
    afisareEroare(res, 403);
});

// 18. Blocare acces direct la fișiere .ejs
app.get('*.ejs', (req, res) => {
    afisareEroare(res, 400);
});

// 19. Favicon
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'resurse', 'ico', 'favicon.ico'));
});

// 16. Middleware global pentru a transmite IP-ul pe toate paginile
app.use((req, res, next) => {
    res.locals.ip = req.ip;
    next();
});

// 8. Rute principale pentru pagina de acasă
app.get(['/', '/index', '/home'], (req, res) => {
    res.render('pagini/index');
});

// 9. Rută generală pentru orice altă pagină
app.get('/*', (req, res) => {
    res.render('pagini' + req.path, (err, html) => {
        if (err) {
            if (err.message && err.message.includes("Failed to lookup view")) {
                afisareEroare(res, 404);
            } else {
                afisareEroare(res, 500);
            }
        } else {
            res.send(html);
        }
    });
});

app.listen(PORT, () => console.log(`Server pornit la http://localhost:${PORT}`));