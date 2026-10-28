"""Exercise the modular decorating studio through real browser input.

Optional: python3 tests/village_smoke.py --standalone dist/Fruit-Bloom-PC.html
"""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke import application_url, check


def open_studio(page):
    page.locator('.nav-button[data-open="build"]').click()
    page.locator('[data-open="studio"]').click()
    page.wait_for_selector('.studio-svg')


def state(page):
    return page.evaluate('FB.village.getState()')


def tile(page, x, y):
    """Click the centre of a real isometric tile in screen coordinates."""
    box = page.locator('.studio-svg').bounding_box()
    page.mouse.click(box['x'] + (390 + (x-y)*30)*box['width']/780,
                     box['y'] + (78 + (x+y)*15 + 15)*box['height']/490)


def select_tool(page, kind):
    page.locator(f'[data-studio-tool="{kind}"]').click()


def action(page, name):
    page.locator(f'[data-studio-action="{name}"]').click()


def run(url, standalone=False):
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        errors, requests = [], []

        def new_page():
            page = browser.new_page(viewport={'width':1440,'height':900})
            page.on('pageerror', lambda e: errors.append(str(e)))
            if standalone:
                def guard(route):
                    if route.request.url == url:
                        route.continue_()
                    else:
                        requests.append(route.request.url)
                        route.abort()
                page.route('**/*', guard)
            return page

        page = new_page()
        page.goto(url, wait_until='load')
        open_studio(page)
        page.evaluate('document.fonts.ready')
        before_resources = page.evaluate('JSON.stringify(FB.data.resources)')
        check(len(state(page)['items']) == 21, 'Expected the default modular garden')
        select_tool(page, 'lamp')
        tile(page, 9, 9)
        check(len(state(page)['items']) == 22, 'Pointer placement did not add a lamp')
        placed = state(page)['items'][-1]
        tile(page, 9, 9)
        check(len(state(page)['items']) == 22, 'Overlapping placement must be rejected')
        select_tool(page, 'rice')
        tile(page, 10, 10)
        check(len(state(page)['items']) == 22, 'A 2×2 plot must not extend outside the meadow')
        print('PASS Pointer placement, occupied-tile collision and footprint boundaries')

        select_tool(page, 'select')
        tile(page, 9, 9)
        check(state(page)['selected'] == placed['id'], 'Placed item cannot be selected')
        action(page, 'move')
        tile(page, 2, 1)
        check(state(page)['items'][-1] == placed, 'Invalid move changed the placed object')
        tile(page, 10, 9)
        check(state(page)['items'][-1]['x'] == 10, 'Valid move failed')
        action(page, 'remove')
        check(len(state(page)['items']) == 21, 'Remove failed')
        action(page, 'undo')
        check(len(state(page)['items']) == 22 and state(page)['items'][-1]['x'] == 10,
              'Undo did not restore the removed item at its moved position')
        page.locator('[data-studio-id="2"]').click()
        check(state(page)['selected'] == 2, 'Rice object art could not be selected')
        action(page, 'growth')
        check(next(o for o in state(page)['items'] if o['id'] == 2)['growth'] == 1,
              'Growth preview did not switch rice to its ripe stage')
        print('PASS Move, blocked move, remove, undo and rice growth preview')

        select_tool(page, 'select')
        tile(page, 4, 6)
        action(page, 'remove')
        check(page.locator('.studio-farmer-idle').count() == 1,
              'Farmer should idle when decoration edits break its preview walking route')
        action(page, 'undo')
        check(page.locator('.studio-farmer-idle').count() == 0, 'Restoring road did not restore walking preview')
        expected = state(page)['items']
        page.locator('.modal-actions [data-language="vi"]').click()
        check(state(page)['items'] == expected, 'Language change lost the layout')
        check(page.locator('#modal-title').inner_text() == 'Xưởng thiết kế làng', 'Studio title did not localize')
        page.reload(wait_until='load')
        open_studio(page)
        check(state(page)['items'] == expected, 'Layout failed to persist after reloading the page')
        check(page.evaluate('JSON.stringify(FB.data.resources)') == before_resources,
              'Decorating prototype spent real village resources')
        print('PASS Motion preview reacts to road edits; EN/VI and reload preserve layout; no resource changes')

        select_tool(page, 'flowers')
        page.locator('.studio-svg').focus()
        page.keyboard.press('ArrowRight')
        page.keyboard.press('Enter')
        check(len(state(page)['items']) == 23 and state(page)['items'][-1]['x'] == 5,
              'Keyboard grid placement failed')
        page.keyboard.press('Escape')
        check(page.locator('.studio-svg').count() == 1 and state(page)['tool'] is None,
              'Escape on the grid should cancel placement without closing the studio')
        page.emulate_media(reduced_motion='reduce')
        check(page.locator('.studio-farmer-walk').evaluate('(el)=>getComputedStyle(el).animationName') == 'none',
              'System reduced-motion preference did not stop preview animation')
        print('PASS Keyboard placement/cancel and reduced-motion preference')

        for width, height in [(844,390), (667,375)]:
            page.set_viewport_size({'width':width,'height':height})
            for language in ['en','vi']:
                page.locator(f'.modal-actions [data-language="{language}"]').click()
                for selector in ['.studio-meadow', '.studio-tools', '.studio-status', '.modal-header']:
                    box = page.locator(selector).bounding_box()
                    check(box['x'] >= -1 and box['y'] >= -1 and
                          box['x'] + box['width'] <= width+1 and box['y'] + box['height'] <= height+1,
                          f'Studio clipped: {selector} at {width}×{height} {language}: {box}')
                check(page.locator('.modal-body').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),
                      'Studio has horizontal overflow')
                check(page.locator('.modal-body').evaluate('(el)=>el.scrollHeight<=el.clientHeight+1'),
                      f'Studio needs vertical scrolling at {width}×{height} {language}')
        print('PASS Meadow and edit controls fit 844×390 and 667×375 in EN/VI')

        restricted = new_page()
        restricted.add_init_script("Storage.prototype.setItem = function(){ throw new Error('Storage disabled for test'); }")
        restricted.goto(url, wait_until='load')
        open_studio(restricted)
        check('Storage unavailable' in restricted.locator('.studio-save').inner_text(),
              'Unavailable storage is not communicated')
        select_tool(restricted, 'flowers')
        tile(restricted, 9, 9)
        check(len(state(restricted)['items']) == 22, 'Storage failure blocked editing during the current visit')
        unsaved = state(restricted)['items']
        restricted.locator('.modal-actions [data-language="vi"]').click()
        check(state(restricted)['items'] == unsaved, 'Language change lost edits while storage was unavailable')
        restricted.locator('.modal-actions [data-close]').click()
        open_studio(restricted)
        check(state(restricted)['items'] == unsaved, 'Reopening the studio lost edits while storage was unavailable')
        check(not errors, f'Browser exceptions: {errors}')
        check(not requests, f'Standalone requested subresources: {requests}')
        print('PASS Editing and remounts survive unavailable storage; no browser exceptions' +
              ('; standalone needs no subresources' if standalone else ''))
        browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--standalone', type=Path)
    args = parser.parse_args()
    with application_url(args.standalone) as url:
        run(url, bool(args.standalone))
