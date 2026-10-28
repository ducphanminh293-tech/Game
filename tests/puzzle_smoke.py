"""Exercise swap match-3 through pointer and keyboard input in the real browser.

Optional: python3 tests/puzzle_smoke.py --standalone dist/Fruit-Bloom-PC.html
"""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke import application_url, check


def play(page):
    page.locator('.nav-button[data-open="play"]').click()
    page.locator('[data-open="puzzle"]').click()
    page.wait_for_function('FB.puzzle.getState().movesLeft === 18')


def settle(page):
    page.wait_for_function('!FB.puzzle.getState().busy')


def drag(page, first, second):
    boxes = [page.locator(f'[data-cell="{i}"]').bounding_box() for i in [first, second]]
    centres = [(b['x']+b['width']/2, b['y']+b['height']/2) for b in boxes]
    page.mouse.move(*centres[0])
    page.mouse.down()
    page.mouse.move(*centres[1], steps=5)
    page.mouse.up()


def run(url, standalone=False):
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1440,'height':900})
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        if standalone:
            def guard(route):
                if route.request.url == url:
                    route.continue_()
                else:
                    requests.append(route.request.url)
                    route.abort()
            page.route('**/*', guard)
        page.goto(url, wait_until='load')
        resources = page.evaluate('JSON.stringify(FB.data.resources)')
        play(page)
        check(page.locator('.fruit-tile').count()==36, 'Expected 36 selectable fruit tiles')
        original = page.evaluate('FB.puzzle.getState().board')
        page.locator('[data-cell="0"]').click()
        page.locator('[data-cell="1"]').click()
        settle(page)
        check(page.evaluate('FB.puzzle.getState().movesUsed')==0, 'Invalid swap charged a move')
        check(page.evaluate('FB.puzzle.getState().board')==original, 'Invalid swap changed board')
        page.locator('[data-puzzle-hint]').click()
        check(page.locator('.fruit-tile.hinted').count()==2, 'Hint must outline a legal pair')
        print('PASS Invalid pointer swap restores board without charge; hint marks a pair')

        drag(page, 0, 6)
        accepted = page.evaluate('FB.puzzle.getState()')
        check(accepted['movesUsed']==1 and accepted['busy'], 'Drag did not start a valid swap')
        # The rapid extra gesture targets the board while its first cascade resolves.
        drag(page, 13, 19)
        check(page.evaluate('FB.puzzle.getState().movesUsed')==1, 'Input accepted during a cascade')
        page.locator('.modal-actions [data-language="vi"]').click()
        check(page.evaluate('FB.puzzle.getState().movesUsed')==1, 'Language switch reset accepted move')
        check(page.evaluate('FB.puzzle.getState().collected')==accepted['collected'], 'Language switch changed harvest')
        settle(page)
        page.locator('.modal-actions [data-language="en"]').click()
        while page.evaluate('FB.puzzle.getState().status')=='playing':
            first, second = page.evaluate('FB.puzzle.legalMoves(FB.puzzle.getState().board)[0]')
            page.locator(f'[data-cell="{first}"]').click()
            page.locator(f'[data-cell="{second}"]').click()
            settle(page)
        check(page.evaluate('FB.puzzle.getState().status')=='won', 'Pointer playthrough failed to complete both goals')
        check(page.locator('[data-puzzle-result]').is_visible(), 'Win overlay missing')
        check('A lovely harvest!' in page.locator('[data-puzzle-result]').inner_text(), 'Wrong win message')
        check(page.evaluate('JSON.stringify(FB.data.resources)')==resources, 'Demo awarded real village resources')
        print('PASS Drag, click-pair playthrough, cascade input lock, EN/VI preservation, win and isolated economy')

        page.locator('[data-puzzle-result] [data-puzzle-restart]').click()
        check(page.evaluate('FB.puzzle.getState().movesUsed')==0, 'Retry did not reset moves')
        check(not page.locator('[data-puzzle-result]').is_visible(), 'Retry left result overlay visible')
        page.locator('[data-cell="0"]').focus()
        page.keyboard.press('Space')
        page.keyboard.press('ArrowDown')
        page.keyboard.press('Space')
        check(page.evaluate('FB.puzzle.getState().movesUsed')==1, 'Keyboard swap failed')
        page.keyboard.press('Escape')
        check(page.locator('[role="dialog"]').count()==0, 'Escape did not close during cascade')
        play(page)
        check(page.evaluate('FB.puzzle.getState().movesUsed')==0, 'Reopening must start a fresh sample stage')
        print('PASS Retry, arrow/Space keyboard swap, closing during animation and fresh reopening')

        for width,height in [(844,390),(667,375)]:
            page.set_viewport_size({'width':width,'height':height})
            for language in ['en','vi']:
                page.locator(f'.modal-actions [data-language="{language}"]').click()
                for selector in ['.match-board','.puzzle-goalbar','.puzzle-actions','.modal-header','.puzzle-status']:
                    box=page.locator(selector).bounding_box()
                    check(box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,
                          f'Gameplay clipped: {selector} at {width}×{height} {language}: {box}')
                check(page.locator('.modal-body').evaluate('(el)=>el.scrollHeight<=el.clientHeight+1'), f'Gameplay needs vertical scrolling: {width}×{height} {language}')
                check(page.locator('.modal-body').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'), 'Gameplay has horizontal overflow')
        print('PASS Board, goals and controls fit 844×390 and 667×375 in EN/VI without scrolling')
        check(not errors, f'Browser exceptions: {errors}')
        check(not requests, f'Standalone requested subresources: {requests}')
        print('PASS No browser exceptions' + ('; standalone needs no subresources' if standalone else ''))
        browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--standalone', type=Path)
    args=parser.parse_args()
    with application_url(args.standalone) as url:
        run(url, bool(args.standalone))
