"""Check that Vietnamese text uses the bundled fonts, including offline export.

Run: python3 tests/typography.py
     python3 tests/typography.py --standalone dist/Fruit-Bloom-PC.html
Requires the same Python Playwright/Chromium tools as smoke.py.
"""
import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright
from smoke import application_url, check


VIETNAMESE = (
    'Dự kiến cho công trình — Vườn cây Lá Nắng — Chế biến, Xây dựng, Chiêu mộ. '
    'ẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼẾỀỂỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪỬỮỰỲỴỶỸĐ '
    'ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđ'
)


def platform_fonts(session, selector):
    document = session.send('DOM.getDocument')
    node = session.send('DOM.querySelector', {
        'nodeId': document['root']['nodeId'], 'selector': selector,
    })
    return session.send('CSS.getPlatformFontsForNode', {'nodeId': node['nodeId']})['fonts']


def verify(url, standalone):
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        errors, subresources = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        if standalone:
            def route(request):
                if request.request.url == url:
                    request.continue_()
                else:
                    subresources.append(request.request.url)
                    request.abort()
            page.route('**/*', route)
        page.goto(url, wait_until='load')
        page.locator('#hud [data-language="vi"]').click()
        page.locator('.building[data-building="orchard"]').click()
        page.locator('[data-cost="orchard"]').click()
        page.evaluate('document.fonts.ready')
        check(page.locator('#modal-title').inner_text() == 'Dự kiến cho công trình', 'Unexpected heading text')
        check(page.locator('.plot-preview h3').inner_text() == 'Vườn cây Lá Nắng', 'Unexpected orchard text')

        session = page.context.new_cdp_session(page)
        session.send('DOM.enable')
        session.send('CSS.enable')
        for selector in ['#modal-title', '.plot-preview h3', '.plot-preview p']:
            fonts = platform_fonts(session, selector)
            check(bool(fonts), f'No shaped text found for {selector}')
            check(all(font['isCustomFont'] for font in fonts), f'System font fallback in {selector}: {fonts}')
        print('PASS Reported Vietnamese headings and body text use only bundled fonts')

        page.evaluate('''(text) => {
            const sample = document.createElement('p');
            sample.id = 'vietnamese-coverage';
            sample.textContent = text;
            sample.style.cssText = 'position:fixed;top:0;left:0;font-size:24px;z-index:200;opacity:0';
            document.body.append(sample);
        }''', VIETNAMESE)
        for family, style in [('Fruit Bloom Sans', 'normal'), ('Fruit Bloom Serif', 'normal'), ('Fruit Bloom Serif', 'italic')]:
            page.locator('#vietnamese-coverage').evaluate('(el, spec) => { el.style.fontFamily = spec[0]; el.style.fontStyle = spec[1]; }', [family, style])
            page.evaluate('document.fonts.ready')
            fonts = platform_fonts(session, '#vietnamese-coverage')
            check(bool(fonts) and all(font['isCustomFont'] for font in fonts), f'Vietnamese fallback for {family} {style}: {fonts}')
        page.locator('#vietnamese-coverage').evaluate('(el) => el.remove()')
        print('PASS Vietnamese accent coverage in Sans, Serif, and italic Serif without fallback')
        page.screenshot(path='/tmp/fruit-bloom-vietnamese-font.png')
        check(not errors, f'Browser errors: {errors}')
        if standalone:
            check(not subresources, f'Offline document requested subresources: {subresources}')
            print('PASS Standalone font rendering with every subresource request blocked')
        browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--standalone', type=Path)
    args = parser.parse_args()
    with application_url(args.standalone) as url:
        verify(url, bool(args.standalone))
