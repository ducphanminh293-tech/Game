#!/usr/bin/env python3
"""Exercise the real browser prototype. Requires Python playwright and Chromium.

Run: python tests/smoke.py
Optional: python tests/smoke.py --standalone dist/Fruit-Bloom-PC.html
"""
import argparse
from contextlib import contextmanager
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


@contextmanager
def application_url(standalone=None):
    # This cloud browser blocks file:// navigation by managed policy. Serve the
    # exact exported document once over HTTP, then forbid every subresource.
    exported = None
    if standalone:
        exported = Path(standalone).resolve()
        check(exported.is_file(), f'Standalone export does not exist: {exported}')
        check(exported.is_relative_to(ROOT), 'Standalone file must be inside this project')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    server = subprocess.Popen(
        [sys.executable, str(ROOT / 'scripts/serve.py'), str(port)],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    url = f'http://127.0.0.1:{port}'
    try:
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError('Development server exited before readiness')
            try:
                with urlopen(url, timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(.05)
        else:
            raise RuntimeError('Development server did not become ready')
        yield url + ('/' + exported.relative_to(ROOT).as_posix() if exported else '')
    finally:
        server.terminate()
        server.wait(timeout=5)


def check(condition, message):
    if not condition:
        raise AssertionError(message)


def visible_keys(page):
    return re.findall(
        r'\b(?:app|nav|common|resource|building|character|assignment|play|build|characters|recruit|storage|settings|plot|guide|camera|rotate|status|village|scene)\.[A-Za-z0-9_.]+',
        page.locator('body').inner_text(),
    )


def assert_layout(page, selectors):
    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal page overflow')
    check(page.evaluate('document.documentElement.scrollHeight <= innerHeight'), 'Vertical page overflow')
    for selector in selectors:
        for element in page.locator(selector).all():
            if not element.is_visible():
                continue
            box = element.bounding_box()
            width, height = page.viewport_size.values()
            check(box['x'] >= -1 and box['y'] >= -1 and
                  box['x'] + box['width'] <= width + 1 and
                  box['y'] + box['height'] <= height + 1,
                  f'Clipped visible control at {width}x{height}: {selector}: {box}')


def run(url, standalone=False):
    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        errors = []
        unexpected_requests = []
        if standalone:
            def offline_guard(route):
                if route.request.is_navigation_request() and route.request.url == url:
                    route.continue_()
                else:
                    unexpected_requests.append(route.request.url)
                    route.abort()
            context.route('**/*', offline_guard)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='load')
        check(page.evaluate('FB.state.language') == 'en', 'First visit must default to English')
        check(page.locator('html').get_attribute('lang') == 'en', 'Document language missing')
        check(page.locator('.nav-button').count() == 5, 'Expected five main navigation buttons')
        resources = page.evaluate('JSON.stringify(FB.data.resources)')
        assert_layout(page, ['.hud button', '.nav-button', '.camera-controls button'])
        results.append('Default English, desktop controls, and resource display')

        for name in ['build', 'characters', 'play', 'recruit', 'storage', 'guide', 'settings']:
            page.locator(f'[data-open="{name}"]').first.click()
            check(page.locator('[role="dialog"]').is_visible(), f'{name} did not open')
            check(page.evaluate('FB.state.modal.type') == name, f'Wrong {name} modal')
            check(not visible_keys(page), f'Untranslated keys in {name}: {visible_keys(page)}')
            page.keyboard.press('Escape')
            check(page.locator('[role="dialog"]').count() == 0, f'{name} did not close with Escape')
        results.append('All navigation panels open and close; no untranslated keys')

        for name in ['hall', 'orchard', 'kitchen', 'workshop']:
            page.locator(f'.building[data-building="{name}"]').click()
            check(page.evaluate('FB.state.modal.id') == name, f'{name} details did not open')
            page.locator('[data-cost]').click()
            check(page.evaluate('FB.state.modal.type') == 'cost', 'Cost preview did not open')
            check(page.evaluate('JSON.stringify(FB.data.resources)') == resources, 'Preview spent resources')
            page.locator('[data-close]').first.click()
        page.locator('[data-plot="available"]').click()
        check(page.evaluate('FB.state.modal.id') == 'available', 'Available plot did not open')
        page.keyboard.press('Escape')
        page.locator('[data-plot="locked"]').click()
        check('3' in page.locator('.modal-body').inner_text(), 'Locked plot must show level 3 unlock')
        page.mouse.click(5, 5)
        check(page.locator('[role="dialog"]').count() == 0, 'Backdrop did not close modal')
        results.append('Four buildings, cost previews, available/locked plots, backdrop close')

        page.locator('.nav-button[data-open="characters"]').click()
        page.locator('[data-assign-menu="rowan"]').click()
        page.locator('.modal-actions [data-language="vi"]').click()
        check(page.evaluate('FB.state.modal.type') == 'characters', 'Language switch closed Characters panel')
        check(page.evaluate('FB.state.selectedCharacter') == 'rowan', 'Language switch reset selected resident')
        page.locator('.modal-actions [data-language="en"]').click()
        check('+10%' in page.locator('[data-assign="rowan:workshop"]').inner_text(), 'Missing Rowan specialty benefit')
        page.locator('[data-assign="rowan:workshop"]').click()
        check(page.evaluate('FB.state.assignments.workshop') == 'rowan', 'Workshop assignment did not update')
        page.locator('.modal-actions [data-language="vi"]').click()
        check('Xưởng xây dựng' in page.locator('#toast').inner_text(), 'Active assignment notification did not translate building name')
        page.locator('.modal-actions [data-language="en"]').click()
        page.locator('[data-assign-menu="mira"]').click()
        page.locator('[data-assign="mira:kitchen"]').click()
        check(page.evaluate('FB.state.assignments.kitchen') == 'mira', 'Reassignment did not update kitchen')
        check(page.evaluate('FB.state.assignments.orchard') is None, 'Old assignment was not cleared')
        check(page.evaluate('Object.values(FB.state.assignments).filter(Boolean).length === new Set(Object.values(FB.state.assignments).filter(Boolean)).size'), 'Duplicate assignment')
        check(page.evaluate('!Object.values(FB.state.assignments).includes("jasper")'), 'Replaced resident remains assigned')
        check(page.evaluate('JSON.stringify(FB.data.resources)') == resources, 'Assignment spent resources')
        page.keyboard.press('Escape')
        page.reload(wait_until='load')
        check(page.evaluate('FB.state.assignments.kitchen') == 'mira', 'Assignment did not persist after reload')
        check(page.evaluate('FB.state.assignments.workshop') == 'rowan', 'Workshop assignment did not persist')
        results.append('Demo assignment benefits, replacement, uniqueness, resource preservation, persistence')

        page.locator('[data-open="settings"]').click()
        check('no audio' in page.locator('.modal-body').inner_text().lower(), 'Audio must be described as unavailable')
        page.locator('[data-motion]').click()
        check(page.evaluate('FB.state.reducedMotion'), 'Reduce motion toggle did not update state')
        check(page.locator('body').evaluate('(el) => el.classList.contains("reduce-motion")'), 'Reduced motion class absent')
        page.locator('.modal [data-language="vi"]').first.click()
        check(page.evaluate('FB.state.modal.type') == 'settings', 'Language change closed current panel')
        check(page.locator('html').get_attribute('lang') == 'vi', 'Vietnamese language was not applied')
        check(page.evaluate('FB.state.assignments.kitchen') == 'mira', 'Language change reset assignments')
        check(not visible_keys(page), f'Untranslated Vietnamese keys: {visible_keys(page)}')
        page.keyboard.press('Escape')
        page.reload(wait_until='load')
        check(page.evaluate('FB.state.language') == 'vi', 'Language did not persist')
        check(page.evaluate('FB.state.reducedMotion'), 'Reduced-motion preference did not persist')
        page.locator('#hud [data-language="en"]').click()
        results.append('Live EN/VI switch preserves panel and assignments; settings persist')

        page.locator('.nav-button[data-open="build"]').click()
        focusables = page.locator('.modal button:not(:disabled)')
        focusables.last.focus()
        page.keyboard.press('Tab')
        check(focusables.first.evaluate('(el) => el === document.activeElement'), 'Forward focus trap failed')
        page.keyboard.press('Shift+Tab')
        check(focusables.last.evaluate('(el) => el === document.activeElement'), 'Backward focus trap failed')
        page.keyboard.press('Escape')
        check(page.locator('.nav-button[data-open="build"]').evaluate('(el) => el === document.activeElement'), 'Focus was not returned after close')
        results.append('Dialog focus trap and return focus')

        old_zoom = page.evaluate('FB.state.camera.zoom')
        page.locator('[data-camera="in"]').click()
        check(page.evaluate('FB.state.camera.zoom') > old_zoom, 'Zoom-in button failed')
        page.locator('[data-camera="out"]').click()
        page.mouse.move(770, 600)
        page.mouse.wheel(0, -150)
        check(page.evaluate('FB.state.camera.zoom') > old_zoom, 'Scroll zoom failed')
        page.mouse.move(60, 450)
        page.mouse.down()
        page.mouse.move(140, 480, steps=8)
        page.mouse.up()
        check(abs(page.evaluate('FB.state.camera.x')) > 20, 'Drag panning failed')
        page.locator('[data-camera="reset"]').click()
        check(page.evaluate('FB.state.camera.zoom === 1 && FB.state.camera.x === 0 && FB.state.camera.y === 0'), 'Camera reset failed')
        results.append('Camera drag, scroll/button zoom, and reset')

        for size in [{'width':844,'height':390}, {'width':667,'height':375}]:
            page.set_viewport_size(size)
            assert_layout(page, ['.hud button', '.nav-button', '.camera-controls button'])
            for language in ['en', 'vi']:
                page.locator(f'#hud [data-language="{language}"]').click()
                for name in ['build','characters','play','recruit','storage','settings']:
                    page.locator(f'[data-open="{name}"]').first.click()
                    assert_layout(page, ['.modal', '.modal-header button'])
                    check(page.locator('.modal-body').evaluate('(el) => el.scrollWidth <= el.clientWidth'), f'Horizontal modal overflow: {name} {language} {size}')
                    check(not visible_keys(page), f'Missing {language} translations: {visible_keys(page)}')
                    page.keyboard.press('Escape')
        page.set_viewport_size({'width':390,'height':844})
        check(page.locator('#portrait-prompt').is_visible(), 'Portrait rotation guidance absent')
        assert_layout(page, ['#portrait-prompt'])
        results.append('844×390 and 667×375 landscape panels in EN/VI; portrait rotation guidance')

        check(not errors, f'Browser runtime errors: {errors}')
        results.append('No browser JavaScript exceptions')
        if standalone:
            check(not unexpected_requests, f'Standalone export requested subresources: {unexpected_requests}')
            check(page.locator('img').evaluate_all('(images) => images.every(img => img.complete && img.naturalWidth > 0 && img.src.startsWith("data:"))'), 'Standalone artwork missing or not embedded')
            results.append('Standalone HTML works with every subresource request blocked; all artwork embedded')
        context.close()
        browser.close()
    for result in results:
        print(f'PASS {result}')
    print(f'PASS {len(results)} functional groups')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--standalone', type=Path)
    args = parser.parse_args()
    with application_url(args.standalone) as url:
        run(url, standalone=bool(args.standalone))
