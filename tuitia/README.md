# Tuitia

Financial operations demo: matches every university fee payment to the right student.
Plain HTML / CSS / JavaScript, no build step.

## Run it
- Open `client/public/index.html` in a browser (works straight from the file system), or
- `cd client/public && npx serve .`

(`client/index.html` is the same page, kept at the path your spec asked for; use it with a Vite-style root where `public/` is served at `/`.)

## Test the engine
    cd client && node public/tests/engine-tests.cjs     # 26 tests

## Structure
    client/index.html                      page shell
    client/public/index.html               same page, for opening directly
    client/public/css/   style.css (tokens + layout) · components.css · responsive.css
    client/public/js/    data → storage → students → payments → reconciliation
                         → ui → simulate → student-view → dashboard → navigation → app
    client/public/tests/engine-tests.cjs
    client/public/assets/                  logo.png (PLACEHOLDER), icon.png, og.png
    client/public/robots.txt

Script order matters (see index.html); all JS shares one global object, `Tuitia`.
