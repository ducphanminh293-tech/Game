"""Test gameplay through real pointer input; run with Python Playwright."""
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke import application_url, check

ROOT = Path(__file__).resolve().parents[1]


def aim_click(page, x, y):
    canvas = page.locator('.puzzle-canvas')
    box = canvas.bounding_box()
    page.mouse.click(box['x'] + x / 640 * box['width'], box['y'] + y / 430 * box['height'])


def play(page):
    page.locator('.nav-button[data-open="play"]').click()
    page.locator('[data-open="puzzle"]').click()
    page.wait_for_function('FB.puzzle.getState().shotsLeft === 18')


with application_url() as url, sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url, wait_until='load')
    initial_resources = page.evaluate('JSON.stringify(FB.data.resources)')
    play(page)
    aim_click(page, 160, 98)
    aim_click(page, 160, 98)
    check(page.evaluate('FB.puzzle.getState().shotsUsed') == 1, 'Rapid input fired twice during one shot')
    page.locator('.modal-actions [data-language="vi"]').click()
    check(page.evaluate('FB.puzzle.getState().shotsUsed') == 1, 'Language switch reset gameplay')
    page.wait_for_function("document.querySelector('[data-puzzle-status]').textContent.includes('7')")
    check(page.evaluate('FB.puzzle.getState().collected.apple') == 7, 'First apple cluster did not pop')
    page.locator('.modal-actions [data-language="en"]').click()
    for used, target in enumerate([(256, 98), (384, 98), (480, 98)], start=2):
        aim_click(page, *target)
        page.wait_for_function(f'FB.puzzle.getState().shotsUsed === {used}')
        page.wait_for_timeout(720)
    check(page.locator('[data-puzzle-result]').is_visible(), 'Win result did not show')
    check('A lovely harvest!' in page.locator('[data-puzzle-result]').inner_text(), 'Wrong win result')
    check(page.evaluate('FB.puzzle.getState().status') == 'won', 'Real pointer playthrough did not win')
    check(page.evaluate('JSON.stringify(FB.data.resources)') == initial_resources, 'Demo changed village economy')
    print('PASS Pointer playthrough, input locking, live language switch, win, unchanged economy')
    page.locator('[data-puzzle-result] [data-puzzle-restart]').click()
    check(page.evaluate('FB.puzzle.getState().shotsUsed') == 0, 'Retry did not reset stage')
    check(not page.locator('[data-puzzle-result]').is_visible(), 'Retry did not hide result')
    page.locator('.puzzle-canvas').focus()
    page.keyboard.press('ArrowLeft')
    page.keyboard.press('Space')
    check(page.evaluate('FB.puzzle.getState().shotsUsed') == 1, 'Keyboard shot failed')
    page.keyboard.press('Escape')
    check(page.locator('[role="dialog"]').count() == 0, 'Could not close during flight')
    play(page)
    check(page.evaluate('FB.puzzle.getState().shotsUsed') == 0, 'Reopening started with old game')
    print('PASS Retry, keyboard input, closing during a shot and fresh reopening')
    for width, height in [(844, 390), (667, 375)]:
        page.set_viewport_size({'width': width, 'height': height})
        for language in ['en', 'vi']:
            page.locator(f'.modal-actions [data-language="{language}"]').click()
            for selector in ['.puzzle-canvas', '.puzzle-goalbar', '.puzzle-sidebar [data-puzzle-restart]', '.modal-header']:
                box = page.locator(selector).bounding_box()
                check(box['x'] >= 0 and box['y'] >= 0 and box['x'] + box['width'] <= width + 1 and box['y'] + box['height'] <= height + 1, f'Gameplay clipped: {selector} at {width}x{height}: {box}')
            check(page.locator('.modal-body').evaluate('(e) => e.scrollHeight <= e.clientHeight + 1'), f'Gameplay requires scrolling at {width}x{height} {language}')
            check(page.locator('.modal-body').evaluate('(e) => e.scrollWidth <= e.clientWidth + 1'), 'Gameplay horizontal overflow')
    print('PASS Full landscape board and controls visible in EN/VI at 844x390 and 667x375')
    check(not errors, f'Browser errors: {errors}')
    browser.close()
    print('PASS No browser exceptions')
