"""Play the connected farm and match-3 loop using real browser input.

Run: python3 tests/playthrough.py
     python3 tests/playthrough.py --standalone dist/Fruit-Bloom-PC.html
"""
import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright
from smoke import application_url, check


def state(page):
    return page.evaluate('FB.game.getState()')


def click_centre(page, locator):
    locator.wait_for(state='visible')
    box = locator.bounding_box()
    page.mouse.click(box['x'] + box['width']/2, box['y'] + box['height']/2)


def action(page, name):
    page.locator(f'[data-action="{name}"]').first.click()


def tile(page, x, y):
    point = page.evaluate('''([x,y]) => {
        const p = FB.world.tileToPoint(x + .5, y + .5);
        const matrix = document.querySelector('.world-camera').getScreenCTM();
        const screen = new DOMPoint(p.x,p.y).matrixTransform(matrix);
        return {x:screen.x,y:screen.y};
    }''', [x,y])
    page.mouse.move(point['x'],point['y'])
    page.mouse.click(point['x'],point['y'])


def drag_fruit(page, first, second):
    boxes=[page.locator(f'[data-cell="{i}"]').bounding_box() for i in [first,second]]
    centres=[(b['x']+b['width']/2,b['y']+b['height']/2) for b in boxes]
    page.mouse.move(*centres[0])
    page.mouse.down()
    page.mouse.move(*centres[1],steps=5)
    page.mouse.up()


def settle(page):
    page.wait_for_function('!FB.puzzle.getState().busy')


def expect_inside(page, selectors):
    width,height=page.viewport_size.values()
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Horizontal page overflow')
    for selector in selectors:
        for element in page.locator(selector).all():
            if not element.is_visible():
                continue
            box=element.bounding_box()
            check(box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,
                  f'Clipped {selector} at {width}×{height}: {box}')


def run(url, standalone=False):
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        errors,requests=[],[]

        def new_page():
            page=browser.new_page(viewport={'width':1440,'height':900})
            page.on('pageerror',lambda error: errors.append(str(error)))
            if standalone:
                def guard(route):
                    if route.request.url==url:
                        route.continue_()
                    else:
                        requests.append(route.request.url)
                        route.abort()
                page.route('**/*',guard)
            return page

        page=new_page()
        page.goto(url,wait_until='load')
        page.wait_for_selector('.world-scene')
        check(page.locator('html').get_attribute('lang')=='en','First-run language is not English')
        check(state(page)['nextStage']==1,'Fresh game did not start at level 1')
        check(page.locator('[data-world-id="1"]').count()>0,'Main village cottage is missing')
        check(state(page)['inventory']=={'coins':250,'wood':100,'stone':60,'fruit':0},'Unexpected starting inventory')
        expect_inside(page,['#hud','#dock'])
        print('PASS Fresh English village, starting resources and main controls')

        # All three harvests are earned through the actual ready-basket controls.
        for item_id in [2,3,4]:
            click_centre(page,page.locator(f'[data-world-ready="{item_id}"]'))
        check(state(page)['harvests']==3,'Ready baskets did not harvest their crops')
        check(state(page)['inventory']=={'coins':266,'wood':102,'stone':60,'fruit':14},'Harvest yield was not credited correctly')
        check(page.locator('[data-world-ready="2"]').count()==0,'Harvested crop remained ready')
        action(page,'orders')
        page.locator('[data-order]').click()
        check(state(page)['ordersCompleted']==1,'Order was not delivered')
        check(state(page)['inventory']=={'coins':331,'wood':117,'stone':60,'fruit':2},'Order cost or reward was incorrect')
        print('PASS Harvest → production cooldown → order delivery with real resource accounting')

        before_puzzle=state(page)['inventory']
        rewards=page.evaluate('FB.game.stage(1).rewards')
        action(page,'play')
        page.wait_for_selector('.match-board')
        check(page.locator('[data-cell]').count()==36,'Puzzle board should contain 36 fruits')
        initial_board=page.evaluate('FB.puzzle.getState().board')
        page.locator('[data-cell="0"]').click()
        page.locator('[data-cell="1"]').click()
        settle(page)
        check(page.evaluate('FB.puzzle.getState().movesUsed')==0,'Invalid swap spent a move')
        check(page.evaluate('FB.puzzle.getState().board')==initial_board,'Invalid swap changed the board')
        drag_fruit(page,0,6)
        accepted=page.evaluate('FB.puzzle.getState()')
        check(accepted['movesUsed']==1,'Adjacent drag did not perform the first match')
        drag_fruit(page,13,19)
        check(page.evaluate('FB.puzzle.getState().movesUsed')==1,'Input was accepted during cascade animation')
        page.locator('[role="dialog"] [data-language="vi"]').click()
        check(page.evaluate('FB.puzzle.getState().collected')==accepted['collected'],'Language switch changed the active puzzle')
        settle(page)
        page.locator('[role="dialog"] [data-language="en"]').click()
        for _ in range(18):
            if page.evaluate('FB.puzzle.getState().status')!='playing':
                break
            first,second=page.evaluate('FB.puzzle.legalMoves(FB.puzzle.getState().board)[0]')
            page.locator(f'[data-cell="{first}"]').click()
            page.locator(f'[data-cell="{second}"]').click()
            settle(page)
        check(page.evaluate('FB.puzzle.getState().status')=='won','First puzzle was not won through pointer input')
        check(page.locator('[data-puzzle-result]').is_visible(),'Win result is missing')
        earned={key:before_puzzle[key]+rewards.get(key,0) for key in before_puzzle}
        check(state(page)['inventory']==earned,'Puzzle win did not credit the declared reward')
        check(state(page)['nextStage']==2 and state(page)['completedStages']==[1],'Puzzle progression did not advance exactly once')
        page.locator('[role="dialog"] [data-language="vi"]').click()
        page.locator('[role="dialog"] [data-language="en"]').click()
        check(state(page)['inventory']==earned,'Re-rendering the win result awarded the same level twice')
        page.locator('[data-puzzle-next]').click()
        check(page.evaluate('FB.puzzle.getState().stage')==2 and page.evaluate('FB.puzzle.getState().movesUsed')==0,
              'Next-level button did not open the second stage')
        first,second=page.evaluate('FB.puzzle.legalMoves(FB.puzzle.getState().board)[0]')
        page.locator('[data-cell="0"]').focus()
        for _ in range(first//6):
            page.keyboard.press('ArrowDown')
        for _ in range(first%6):
            page.keyboard.press('ArrowRight')
        page.keyboard.press('Space')
        page.keyboard.press('ArrowDown' if second-first==6 else 'ArrowRight')
        page.keyboard.press('Space')
        check(page.evaluate('FB.puzzle.getState().movesUsed')==1,'Keyboard selection did not swap neighbours')
        page.keyboard.press('Escape')
        check(page.locator('[role="dialog"]').count()==0,'Escape did not return to the farm')
        check(state(page)['inventory']==earned,'An unfinished second stage awarded resources')
        print('PASS Invalid swaps, drag/click matches, cascade lock, language switch, single win reward, next level and keyboard')

        action(page,'build')
        page.locator('[data-build="workshop"]').click()
        tile(page,7,8)
        built=state(page)
        workshop=next(item for item in built['items'] if item['type']=='workshop')
        check((workshop['x'],workshop['y'])==(7,8),'Workshop was not placed at the chosen tile')
        expected_build={**earned,'coins':earned['coins']-120,'wood':earned['wood']-45,'stone':earned['stone']-20}
        check(built['inventory']==expected_build,'Workshop construction did not spend its price')
        page.locator('[data-build="workshop"]').click()
        tile(page,7,8)
        check(state(page)['inventory']==expected_build and len(state(page)['items'])==len(built['items']),
              'Overlapping construction spent resources or created an item')
        page.keyboard.press('Escape')
        click_centre(page,page.locator(f'.world-object[data-world-id="{workshop["id"]}"]'))
        page.locator(f'[data-move="{workshop["id"]}"]').click()
        tile(page,2,1)
        blocked=next(item for item in state(page)['items'] if item['id']==workshop['id'])
        check((blocked['x'],blocked['y'])==(7,8),'An occupied target moved the workshop')
        check(page.evaluate('FB.world.getView().moving')==workshop['id'],'Blocked movement cancelled placement mode')
        tile(page,9,8)
        moved=next(item for item in state(page)['items'] if item['id']==workshop['id'])
        check((moved['x'],moved['y'])==(9,8),'Workshop move failed')
        check(state(page)['inventory']==expected_build,'Moving an item spent resources')
        click_centre(page,page.locator(f'.world-object[data-world-id="{workshop["id"]}"]'))
        page.locator(f'[data-upgrade="{workshop["id"]}"]').click()
        upgraded=next(item for item in state(page)['items'] if item['id']==workshop['id'])
        check(upgraded['level']==2,'Workshop upgrade failed')
        expected_upgrade={**expected_build,'coins':expected_build['coins']-90,'wood':expected_build['wood']-34,'stone':expected_build['stone']-15}
        check(state(page)['inventory']==expected_upgrade,'Upgrade did not spend the correct cost')
        print('PASS Earned materials fund construction; collision, free movement and upgrades work')

        saved=state(page)
        page.locator('#hud [data-language="vi"]').click()
        page.reload(wait_until='load')
        check(page.locator('html').get_attribute('lang')=='vi','Language did not persist')
        restored=state(page)
        for key in ['inventory','items','nextStage','completedStages','ordersCompleted','harvests','xp']:
            check(restored[key]==saved[key],f'Reload changed saved {key}')
        print('PASS Resources, layout, production deadlines, progression and language survive reload')

        action(page,'settings')
        page.locator('[role="dialog"] [data-action="motion"]').click()
        check(state(page)['reducedMotion'],'Reduced-motion setting did not save')
        check(page.locator('body').evaluate('(el)=>el.classList.contains("reduce-motion")'),'Reduced-motion class did not activate')
        page.keyboard.press('Escape')
        action(page,'help')
        page.locator('[role="dialog"]').focus()
        for _ in range(8):
            page.keyboard.press('Tab')
            check(page.evaluate('document.querySelector("[role=dialog]").contains(document.activeElement)'),
                  'Tab escaped the active dialog')
        page.keyboard.press('Escape')
        print('PASS Reduced-motion preference and dialog keyboard containment')

        for width,height in [(1440,900),(844,390),(667,375)]:
            page.set_viewport_size({'width':width,'height':height})
            for language in ['en','vi']:
                page.locator(f'#hud [data-language="{language}"]').click()
                expect_inside(page,['#hud','#dock','#camera-controls'])
                for panel in ['build','orders']:
                    action(page,panel)
                    expect_inside(page,['#side-panel'])
                    check(page.locator('#side-panel').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),'Side panel horizontal overflow')
                    page.keyboard.press('Escape')
                action(page,'play')
                check(page.evaluate('FB.puzzle.getState().movesUsed')==0,'Opening the next puzzle did not start fresh')
                expect_inside(page,['.match-board','.puzzle-goalbar','.puzzle-actions','.modal-header'])
                check(page.locator('.modal-body').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1'),'Puzzle horizontal overflow')
                check(page.locator('.modal-body').evaluate('(el)=>el.scrollHeight<=el.clientHeight+1'),f'Puzzle scrolls at {width}×{height} {language}')
                page.keyboard.press('Escape')
        print('PASS Main farm, construction, orders and puzzles fit desktop and small landscape screens in EN/VI')

        restricted=new_page()
        restricted.add_init_script("Storage.prototype.setItem=function(){throw new Error('Storage blocked for test');}")
        restricted.goto(url,wait_until='load')
        check(not state(restricted)['storageAvailable'],'Storage failure was not detected')
        click_centre(restricted,restricted.locator('[data-world-ready="2"]'))
        restricted.locator('#hud [data-language="vi"]').click()
        check(state(restricted)['harvests']==1 and state(restricted)['inventory']['fruit']==4,
              'Language change lost progress when storage was unavailable')
        check(not errors,f'Browser exceptions: {errors}')
        check(not requests,f'Standalone requested subresources: {requests}')
        print('PASS Storage fallback preserves the current visit; no browser errors'+('; fully offline export' if standalone else ''))
        browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--standalone',type=Path)
    args=parser.parse_args()
    with application_url(args.standalone) as url:
        run(url,bool(args.standalone))
